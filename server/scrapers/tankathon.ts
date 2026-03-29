import { storage } from "../storage";
import { fetchHtml, matchPlayer, type ScraperResult } from "./index";
import * as cheerio from "cheerio";
import { type Player } from "@shared/schema";

// Tankathon's NFL Big Board ranks players by overall grade.
// Each player has a rank and a link like /nfl/players/arvell-reese
export async function scrapeTankathon(players: Player[], urlOverride?: string): Promise<ScraperResult> {
  const sourceKey = "tankathon";
  const defaultUrl = "https://tankathon.com/nfl/big_board";
  const today = new Date().toISOString().slice(0, 10);

  const existing = await storage.getMockDraftBySourceKeyAndDate(sourceKey, today);
  if (existing) {
    return { sourceKey, picksFound: 0, newMockCreated: false, mockDraftId: existing.id };
  }

  const html = await fetchHtml(urlOverride || defaultUrl);
  const $ = cheerio.load(html);

  const picks: Array<{ rank: number; playerName: string }> = [];

  // Tankathon big board: look for player links /nfl/players/player-name-slug
  // Each entry has a rank number and a player link
  // Each pick row: div.mock-row.nfl contains div.mock-row-pick-number and div.mock-row-player > a
  $("div.mock-row").each((_i, row) => {
    const rankText = $(row).find(".mock-row-pick-number").first().text().trim();
    const rank = parseInt(rankText, 10);
    if (isNaN(rank) || rank < 1 || rank > 64) return;

    const playerName = $(row).find(".mock-row-name").first().text().trim();
    if (!playerName || playerName.length < 3) return;

    picks.push({ rank, playerName });
  });

  // De-duplicate by rank (keep first occurrence)
  const seen = new Set<number>();
  const uniquePicks = picks.filter(p => {
    if (seen.has(p.rank)) return false;
    seen.add(p.rank);
    return true;
  }).sort((a, b) => a.rank - b.rank);

  const analyst = await storage.getAnalystBySourceKey(sourceKey);
  const mockDraft = await storage.createMockDraft({
    sourceName: `Tankathon Big Board — ${new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}`,
    sourceKey,
    analystId: analyst?.id,
    url: urlOverride || defaultUrl,
  });

  const dbPicks: Array<{ mockDraftId: number; playerId: number; pickNumber: number }> = [];
  for (const { rank, playerName } of uniquePicks) {
    const matched = matchPlayer(playerName, players);
    if (matched) {
      dbPicks.push({ mockDraftId: mockDraft.id, playerId: matched.id, pickNumber: rank });
    }
  }

  if (dbPicks.length > 0) {
    await storage.createMockDraftPicks(dbPicks);
  }

  return {
    sourceKey,
    picksFound: dbPicks.length,
    newMockCreated: true,
    mockDraftId: mockDraft.id,
  };
}
