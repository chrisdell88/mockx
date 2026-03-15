import { storage } from "../storage";
import { fetchHtml, matchPlayer, type ScraperResult } from "./index";
import * as cheerio from "cheerio";
import { type Player } from "@shared/schema";

// NFL Mock Draft Database Consensus Mock Draft
// Each pick row has: pick number, team logo, player link, player name, position, college
export async function scrapeMddb(players: Player[]): Promise<ScraperResult> {
  const sourceKey = "mddb_consensus";
  const today = new Date().toISOString().slice(0, 10);

  const existing = await storage.getMockDraftBySourceKeyAndDate(sourceKey, today);
  if (existing) {
    return { sourceKey, picksFound: 0, newMockCreated: false, mockDraftId: existing.id };
  }

  const html = await fetchHtml("https://www.nflmockdraftdatabase.com/mock-drafts/2026/consensus-mock-draft-2026");
  const $ = cheerio.load(html);

  const picks: Array<{ pickNumber: number; playerName: string }> = [];

  // MDDB uses player links like /players/2026/player-name-slug
  // Each has a pick number visible nearby
  $("a[href*='/players/2026/']").each((_i, el) => {
    const linkText = $(el).text().trim();
    if (!linkText || linkText.length < 3) return;

    // Find pick number — look in the surrounding container
    const container = $(el).closest("li, div, article, section").first();
    const containerText = container.text();

    // Pick number is typically at the start of the section
    const pickMatch = containerText.match(/\b(\d+)\b/);
    const pickNum = pickMatch ? parseInt(pickMatch[1], 10) : 0;

    if (pickNum >= 1 && pickNum <= 32) {
      picks.push({ pickNumber: pickNum, playerName: linkText });
    }
  });

  // De-duplicate: keep first occurrence per pick number
  const seen = new Set<number>();
  const uniquePicks = picks.filter(p => {
    if (seen.has(p.pickNumber)) return false;
    seen.add(p.pickNumber);
    return true;
  }).sort((a, b) => a.pickNumber - b.pickNumber);

  const analyst = await storage.getAnalystBySourceKey(sourceKey);
  const mockDraft = await storage.createMockDraft({
    sourceName: `MDDB Consensus — ${new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}`,
    sourceKey,
    analystId: analyst?.id,
    url: "https://www.nflmockdraftdatabase.com/mock-drafts/2026/consensus-mock-draft-2026",
  });

  const dbPicks: Array<{ mockDraftId: number; playerId: number; pickNumber: number }> = [];
  for (const { pickNumber, playerName } of uniquePicks) {
    const matched = matchPlayer(playerName, players);
    if (matched) {
      dbPicks.push({ mockDraftId: mockDraft.id, playerId: matched.id, pickNumber });
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
