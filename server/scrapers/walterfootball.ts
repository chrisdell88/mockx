import { storage } from "../storage";
import { fetchHtml, matchPlayer, type ScraperResult } from "./index";
import * as cheerio from "cheerio";
import { type Player } from "@shared/schema";

// Parse player picks from a WalterFootball mock draft page.
// Pages use an HTML table where each row is: | pick# | team_logo | "Team: Player, POS, College" | college_logo |
async function parseWalterfootballPage(url: string): Promise<Array<{ pickNumber: number; playerName: string }>> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const picks: Array<{ pickNumber: number; playerName: string }> = [];

  $("table tr").each((_i, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    const pickNumText = $(cells[0]).text().trim().replace(".", "");
    const pickNum = parseInt(pickNumText, 10);
    if (isNaN(pickNum) || pickNum < 1 || pickNum > 32) return;

    // Third cell has "Team Name: Player Name, POS, College"
    const thirdCell = $(cells[2]).text().trim();
    const colonIdx = thirdCell.indexOf(":");
    if (colonIdx < 0) return;

    const afterColon = thirdCell.slice(colonIdx + 1).trim();
    // afterColon is like "Fernando Mendoza, QB, Indiana"
    // or sometimes has line breaks / extra spaces
    const firstCommaIdx = afterColon.indexOf(",");
    const playerName = firstCommaIdx > -1
      ? afterColon.slice(0, firstCommaIdx).trim()
      : afterColon.trim();

    if (playerName && playerName.length > 2) {
      picks.push({ pickNumber: pickNum, playerName });
    }
  });

  // Fallback: also check for bold text pattern "**Team: Player, POS, College**"
  if (picks.length === 0) {
    $("b, strong").each((_i, el) => {
      const text = $(el).text().trim();
      const colonIdx = text.indexOf(":");
      if (colonIdx < 0) return;
      const afterColon = text.slice(colonIdx + 1).trim();
      const commaIdx = afterColon.indexOf(",");
      const playerName = commaIdx > -1 ? afterColon.slice(0, commaIdx).trim() : afterColon;
      // Can't easily get pick number here without context; skip fallback for now
    });
  }

  return picks;
}

async function runWalterfootball(
  sourceKey: string,
  displayName: string,
  analystSourceKey: string,
  page1Url: string,
  page2Url: string,
  players: Player[]
): Promise<ScraperResult> {
  const today = new Date().toISOString().slice(0, 10);

  // Check for duplicate today
  const existing = await storage.getMockDraftBySourceKeyAndDate(sourceKey, today);
  if (existing) {
    return { sourceKey, picksFound: 0, newMockCreated: false, mockDraftId: existing.id };
  }

  // Scrape both pages
  const [picks1, picks2] = await Promise.all([
    parseWalterfootballPage(page1Url),
    parseWalterfootballPage(page2Url),
  ]);
  const allPicks = [...picks1, ...picks2];

  // Find analyst
  const analyst = await storage.getAnalystBySourceKey(analystSourceKey);

  // Create mock draft entry
  const mockDraft = await storage.createMockDraft({
    sourceName: `${displayName} — ${new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}`,
    sourceKey,
    analystId: analyst?.id,
    url: page1Url,
  });

  // Match picks to players in our DB
  const dbPicks: Array<{ mockDraftId: number; playerId: number; pickNumber: number }> = [];
  for (const { pickNumber, playerName } of allPicks) {
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

export async function scrapeWalterfootballWalt(players: Player[]): Promise<ScraperResult> {
  return runWalterfootball(
    "walterfootball_walt",
    "WalterFootball (Walt)",
    "walterfootball_walt",
    "https://walterfootball.com/draft2026.php",
    "https://walterfootball.com/draft2026_1.php",
    players
  );
}

export async function scrapeWalterfootballCharlie(players: Player[]): Promise<ScraperResult> {
  return runWalterfootball(
    "walterfootball_charlie",
    "WalterFootball (Charlie Campbell)",
    "walterfootball_charlie",
    "https://walterfootball.com/draft2026charlie.php",
    "https://walterfootball.com/draft2026charlie_1.php",
    players
  );
}
