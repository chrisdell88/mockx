import axios from "axios";
import * as cheerio from "cheerio";
import { storage } from "../storage";
import { type Player } from "@shared/schema";

// ─── Player Name Matching ────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^a-z' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Match an incoming name (from scrape) to an existing player in our DB
export function matchPlayer(name: string, playerList: Player[]): Player | undefined {
  const norm = normalizeName(name);
  // Exact match
  let match = playerList.find(p => normalizeName(p.name) === norm);
  if (match) return match;
  // Last name only (for cases like "Arvell Reese" → "Reese")
  const words = norm.split(" ").filter(Boolean);
  if (words.length >= 2) {
    const lastName = words[words.length - 1];
    const firstName = words[0];
    match = playerList.find(p => {
      const pWords = normalizeName(p.name).split(" ");
      return pWords[pWords.length - 1] === lastName && pWords[0].startsWith(firstName[0]);
    });
    if (match) return match;
  }
  // Partial substring match
  match = playerList.find(p => normalizeName(p.name).includes(norm) || norm.includes(normalizeName(p.name)));
  return match;
}

// ─── HTTP Fetch ────────────────────────────────────────────────────────────

export async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    timeout: 20000,
  });
  return response.data;
}

// ─── Scraper Registry ─────────────────────────────────────────────────────

export interface ScraperResult {
  sourceKey: string;
  picksFound: number;
  newMockCreated: boolean;
  mockDraftId?: number;
  error?: string;
}

export interface ScraperModule {
  sourceKey: string;
  displayName: string;
  run(players: Player[]): Promise<ScraperResult>;
}

import { scrapeWalterfootballWalt } from "./walterfootball";
import { scrapeWalterfootballCharlie } from "./walterfootball";
import { scrapeTankathon } from "./tankathon";
import { scrapeMddb } from "./mddb";

export const SCRAPERS: ScraperModule[] = [
  {
    sourceKey: "walterfootball_walt",
    displayName: "WalterFootball (Walt)",
    run: scrapeWalterfootballWalt,
  },
  {
    sourceKey: "walterfootball_charlie",
    displayName: "WalterFootball (Charlie Campbell)",
    run: scrapeWalterfootballCharlie,
  },
  {
    sourceKey: "tankathon",
    displayName: "Tankathon Big Board",
    run: scrapeTankathon,
  },
  {
    sourceKey: "mddb_consensus",
    displayName: "MDDB Consensus Mock Draft",
    run: scrapeMddb,
  },
];

// ─── Run a single scraper ────────────────────────────────────────────────

export async function runScraper(sourceKey: string): Promise<ScraperResult> {
  const scraper = SCRAPERS.find(s => s.sourceKey === sourceKey);
  if (!scraper) {
    return { sourceKey, picksFound: 0, newMockCreated: false, error: `Unknown scraper: ${sourceKey}` };
  }
  
  await storage.upsertScrapeJob({ sourceKey, status: "running" });
  
  try {
    const allPlayers = await storage.getPlayers();
    const result = await scraper.run(allPlayers);
    
    await storage.upsertScrapeJob({
      sourceKey,
      status: "success",
      picksFound: result.picksFound,
      errorMessage: undefined as any,
      lastRunAt: new Date(),
    });
    
    return result;
  } catch (err: any) {
    const errorMessage = err?.message ?? String(err);
    await storage.upsertScrapeJob({
      sourceKey,
      status: "error",
      errorMessage,
      lastRunAt: new Date(),
    });
    return { sourceKey, picksFound: 0, newMockCreated: false, error: errorMessage };
  }
}

// ─── Run all scrapers ────────────────────────────────────────────────────

export async function runAllScrapers(): Promise<ScraperResult[]> {
  const results: ScraperResult[] = [];
  for (const scraper of SCRAPERS) {
    const result = await runScraper(scraper.sourceKey);
    results.push(result);
  }
  return results;
}

export { cheerio };
