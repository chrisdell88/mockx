/**
 * One-off script: run all SCRAPERS and then re-synthesize ADP against live Supabase.
 * Usage: npx tsx scripts/run-scrapers-now.ts
 */
import "dotenv/config";
import { runAllScrapers } from "../server/scrapers/index";
import { storage } from "../server/storage";

async function main() {
  const start = Date.now();
  console.log(`[RUN] Starting at ${new Date().toISOString()}`);
  console.log("[RUN] Running all scrapers…");

  const results = await runAllScrapers();
  const ok = results.filter(r => !r.error);
  const fail = results.filter(r => r.error);
  console.log(`\n[RUN] Scraper summary: ${ok.length} ok, ${fail.length} failed`);
  for (const r of ok) {
    console.log(`  ✓ ${r.sourceKey}: ${r.picksFound} picks, newMock=${r.newMockCreated}`);
  }
  for (const r of fail) {
    console.log(`  ✗ ${r.sourceKey}: ${r.error}`);
  }

  console.log("\n[RUN] Synthesizing consensus ADP…");
  const adp = await storage.synthesizeAdpFromPicks();
  console.log(`[RUN] ADP synthesis: ${adp.playersUpdated}/${adp.totalPlayers} players updated`);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n[RUN] Done in ${elapsed}s`);
  process.exit(0);
}

main().catch(err => {
  console.error("[RUN] FATAL:", err);
  process.exit(1);
});
