import { storage } from "../storage";
import { fetchHtml, matchPlayer, type ScraperResult } from "./index";
import { type Player } from "@shared/schema";
import { db } from "../db";
import { players as playersTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as cheerio from "cheerio";

const HEADSHOT_BASE = "https://static.www.nfl.com/image/private/t_official/f_auto/league/god-prospect-headshots";

// NFL.com mock draft articles use .nfl-is-ranked-player blocks.
// Each block's last <a> inside .nfl-o-ranked-item__title is the player name.
// Headshot URLs are embedded in data-srcset attributes.
function parseNflcomArticle(html: string): Array<{
  playerName: string;
  headshotUrl: string | null;
}> {
  const $ = cheerio.load(html);
  const results: Array<{ playerName: string; headshotUrl: string | null }> = [];
  const seen = new Set<string>();

  // Primary: ranked-player blocks (Cheerio-based, reliable for all NFL.com mock drafts)
  $(".nfl-is-ranked-player").each((_i, el) => {
    const name = $(el).find(".nfl-o-ranked-item__title a").last().text().trim();
    if (!name || name.length < 3 || seen.has(name)) return;
    seen.add(name);

    // Try to find headshot in data-srcset
    let headshotUrl: string | null = null;
    const dataSrcset = $(el).find("source[data-srcset]").first().attr("data-srcset") || "";
    const shotMatch = dataSrcset.match(/god-prospect-headshots\/([0-9]{4})\/([a-f0-9-]{30,40})/);
    if (shotMatch) {
      headshotUrl = `${HEADSHOT_BASE}/${shotMatch[1]}/${shotMatch[2]}`;
    } else {
      // Fallback: look for headshot in img src
      $(el).find("img").each((_j, img) => {
        const src = $(img).attr("src") || $(img).attr("data-src") || "";
        const m = src.match(/god-prospect-headshots\/([0-9]{4})\/([a-f0-9-]{30,40})/);
        if (m && !headshotUrl) headshotUrl = `${HEADSHOT_BASE}/${m[1]}/${m[2]}`;
      });
    }

    results.push({ playerName: name, headshotUrl });
  });

  if (results.length > 0) return results;

  // Fallback: legacy alt-text approach for older article formats
  const chunks = html.split(/god-prospect-headshots\//);
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const uuidMatch = chunk.match(/^([0-9]{4})\/([a-f0-9-]{30,40})/);
    if (!uuidMatch) continue;
    const headshotUrl = `${HEADSHOT_BASE}/${uuidMatch[1]}/${uuidMatch[2]}`;
    const prevChunk = chunks[i - 1];
    const altMatch = prevChunk.match(/alt="([^"]+)"[^>]*>?\s*$/);
    const name = altMatch?.[1] ?? chunk.match(/alt="([^"]+)"/)?.[1];
    if (name && name.length > 3 && !name.startsWith("NFL") && !name.includes("Logo") && !name.includes("Team") && !seen.has(name)) {
      seen.add(name);
      results.push({ playerName: name, headshotUrl });
    }
  }

  return results;
}

async function runNflcomScraper(
  sourceKey: string,
  displayName: string,
  url: string,
  allPlayers: Player[]
): Promise<ScraperResult> {
  const today = new Date().toISOString().slice(0, 10);

  const existing = await storage.getMockDraftBySourceKeyAndDate(sourceKey, today);
  if (existing) {
    const pickCount = await storage.getMockDraftPickCount(existing.id);
    return { sourceKey, picksFound: pickCount, newMockCreated: false, mockDraftId: existing.id };
  }

  const html = await fetchHtml(url);
  const entries = parseNflcomArticle(html);

  const analyst = await storage.getAnalystBySourceKey(sourceKey);
  const mockDraft = await storage.createMockDraft({
    sourceName: `${displayName} — ${new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}`,
    sourceKey,
    analystId: analyst?.id,
    url,
    boardType: "mock",
  });

  const dbPicks: Array<{ mockDraftId: number; playerId: number; pickNumber: number }> = [];
  let pickNum = 1;

  for (const { playerName, headshotUrl } of entries) {
    const matched = matchPlayer(playerName, allPlayers);
    if (matched) {
      dbPicks.push({ mockDraftId: mockDraft.id, playerId: matched.id, pickNumber: pickNum });

      // Update player headshot if they don't have one yet
      if (headshotUrl && !matched.imageUrl) {
        await db.update(playersTable)
          .set({ imageUrl: headshotUrl })
          .where(eq(playersTable.id, matched.id));
        // Update local copy so we don't re-write
        matched.imageUrl = headshotUrl;
      }

      pickNum++;
    }
  }

  if (dbPicks.length > 0) {
    await storage.createMockDraftPicks(dbPicks);
  }

  return { sourceKey, picksFound: dbPicks.length, newMockCreated: true, mockDraftId: mockDraft.id };
}

// ─── Daniel Jeremiah Top-50 Big Board ─────────────────────────────────────

const JEREMIAH_TOP50_URL =
  "https://www.nfl.com/news/daniel-jeremiah-s-top-50-2026-nfl-draft-prospect-rankings-3-0";

// Extracts ranked players + headshots from the Jeremiah Top-50 article.
// Player order from unique alt-text appearances = ranking order.
function parseJeremiahBigBoard(html: string): Array<{ playerName: string; headshotUrl: string | null }> {
  const results: Array<{ playerName: string; headshotUrl: string | null }> = [];
  const seen = new Set<string>();

  const imgPattern = /<img[^>]+alt="([A-Z][a-z]+(?:\s[A-Z][^"]{1,30})?)"[^>]*>/g;
  let m: RegExpExecArray | null;

  while ((m = imgPattern.exec(html)) !== null) {
    const name = m[1].trim();
    if (
      seen.has(name) ||
      name.length < 4 ||
      /NFL|Logo|Author|Team|Image|Icon/i.test(name)
    ) {
      continue;
    }
    seen.add(name);

    const start = Math.max(0, m.index - 50);
    const window = html.substring(start, m.index + m[0].length + 400);
    const shot = window.match(/god-prospect-headshots\/([0-9]{4})\/([a-f0-9-]{30,40})/);
    const headshotUrl = shot ? `${HEADSHOT_BASE}/${shot[1]}/${shot[2]}` : null;
    results.push({ playerName: name, headshotUrl });
  }

  return results;
}

export async function scrapeJeremiahBigBoard(players: Player[], urlOverride?: string): Promise<ScraperResult> {
  const sourceKey = "nfl_jeremiah_bigboard";
  const today = new Date().toISOString().slice(0, 10);

  const existing = await storage.getMockDraftBySourceKeyAndDate(sourceKey, today);
  if (existing) {
    const pickCount = await storage.getMockDraftPickCount(existing.id);
    return { sourceKey, picksFound: pickCount, newMockCreated: false, mockDraftId: existing.id };
  }

  const scrapeUrl = urlOverride || JEREMIAH_TOP50_URL;
  const html = await fetchHtml(scrapeUrl);
  const entries = parseJeremiahBigBoard(html);

  // Look up analyst by base key "nfl_jeremiah"
  const analyst = await storage.getAnalystBySourceKey("nfl_jeremiah");
  const mockDraft = await storage.createMockDraft({
    sourceName: `Daniel Jeremiah Top-50 — ${new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}`,
    sourceKey,
    analystId: analyst?.id,
    url: scrapeUrl,
    boardType: "bigboard",
  });

  const dbPicks: Array<{ mockDraftId: number; playerId: number; pickNumber: number }> = [];
  let rankNum = 1;

  for (const { playerName, headshotUrl } of entries) {
    const matched = matchPlayer(playerName, players);
    if (matched) {
      dbPicks.push({ mockDraftId: mockDraft.id, playerId: matched.id, pickNumber: rankNum });

      if (headshotUrl && !matched.imageUrl) {
        await db.update(playersTable)
          .set({ imageUrl: headshotUrl })
          .where(eq(playersTable.id, matched.id));
        matched.imageUrl = headshotUrl;
      }

      rankNum++;
    }
  }

  if (dbPicks.length > 0) {
    await storage.createMockDraftPicks(dbPicks);
  }

  return { sourceKey, picksFound: dbPicks.length, newMockCreated: true, mockDraftId: mockDraft.id };
}

export async function scrapeZierlein(players: Player[], urlOverride?: string): Promise<ScraperResult> {
  return runNflcomScraper(
    "nfl_zierlein",
    "Lance Zierlein (NFL.com)",
    urlOverride || "https://www.nfl.com/news/lance-zierlein-2026-nfl-mock-draft-2-0-two-cbs-in-top-five-combine-star-sonny-styles-cracks-top-10",
    players
  );
}

export async function scrapeBrooks(players: Player[], urlOverride?: string): Promise<ScraperResult> {
  return runNflcomScraper(
    "nfl_brooks",
    "Bucky Brooks (NFL.com)",
    urlOverride || "https://www.nfl.com/news/bucky-brooks-2026-nfl-mock-draft-2-0-jets-grab-edge-rusher-receiver-rams-double-dip-on-dbs",
    players
  );
}

export async function scrapeDavis(players: Player[], urlOverride?: string): Promise<ScraperResult> {
  return runNflcomScraper(
    "nfl_davis",
    "Charles Davis (NFL.com)",
    urlOverride || "https://www.nfl.com/news/charles-davis-2026-nfl-mock-draft-2-0-cardinals-seahawks-select-notre-dame-rbs-in-round-1",
    players
  );
}
