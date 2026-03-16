# DraftX Terminal — 2026 NFL Draft Stock Tracker

## Overview
Full-stack financial-market-style app that automatically scrapes 30+ analyst mock drafts daily, tracks ADP (Average Draft Position) changes over time, and visualizes player stock movement with a stock market UI.

## Architecture
- **Frontend**: React + Vite, Wouter routing, TanStack Query, Recharts, Framer Motion, Shadcn/UI
- **Backend**: Express + TypeScript, Drizzle ORM, PostgreSQL
- **Scrapers**: Cheerio + Axios for HTML scraping; node-cron for daily automation (6am ET)
- **Odds**: The Odds API integration (theoddsapi.com) — ODDS_API_KEY secret required

## Database Schema (`shared/schema.ts`)
- `players` — 140 tracked prospects (auto-grows as scrapers find new players) with combine data + `imageUrl` for headshots
- `analysts` — 43 sources with accuracy weights and `sourceKey` identifiers
- `mockDrafts` — 15+ mock drafts (mocks + big boards)
- `mockDraftPicks` — 523+ individual player picks per mock (rounds 1-3 coverage)
- `adpHistory` — Historical ADP + auto-synthesized consensus ADP from all mock picks (all 140 players covered)
- `odds` — sportsbook odds history (DraftKings, FanDuel, BetMGM, Caesars + more via The Odds API)
- `scrapeJobs` — tracks auto-scraper status per source (14 active scrapers)

## Key Routes
- `GET /api/players` — players with currentAdp + trend (up/down/flat) + adpChange + imageUrl
- `GET /api/players/:id/trends` — ADP history + odds history for a player
- `GET /api/players/:id/rankings` — all analyst rankings for a player
- `GET /api/analysts` — all 43 analysts sorted by accuracy weight
- `GET /api/mock-drafts` — all mock drafts
- `GET /api/scrape/status` — scrape job status + scraper registry (14 scrapers)
- `POST /api/scrape` — run all auto-scrapers + ADP synthesis
- `POST /api/scrape/headshots` — scrape NFL.com articles for headshots only
- `POST /api/scrape/odds` — pull real-time sportsbook odds via The Odds API
- `POST /api/synthesize-adp` — recompute consensus ADP from latest mock picks
- `POST /api/scrape/clear-placeholder-odds` — remove seeded placeholder odds
- `POST /api/scrape/:sourceKey` — run specific scraper

## Consensus ADP System
`storage.synthesizeAdpFromPicks()` computes consensus ADP for every player:
- Simple average of pick positions across all `mock_draft_picks` rows for each player
- Runs automatically: on startup (10s delay), after every scrape run, and on daily cron
- Now covers **all 140 players** (was only 50 hand-coded ADP values before)

## Odds Integration
- **The Odds API** (`server/scrapers/odds.ts`): Fetches NFL Draft odds from DraftKings, FanDuel, BetMGM, Caesars, ESPN Bet, Bet365, etc.
- Requires `ODDS_API_KEY` secret (free tier: 500 req/month at theoddsapi.com)
- Draft markets appear seasonally (~3-4 weeks before draft in April)
- Supports market types: first_overall, top_3_pick, top_5_pick, top_10_pick, first_round, and pick-number-specific markets
- `POST /api/scrape/clear-placeholder-odds` removes seeded demo data when real data is available

## Discrepancy / "Odds Beat ADP" Calculation
`storage.getDiscrepancy()` computes ADP vs implied pick from odds:
- **Pick-number markets** (priority): Probability-weighted expected pick with tail default (pick 40) for unmodeled mass
- **Bucket markets** (fallback): Hierarchical probability model (first_overall → top_3 → top_5 → top_10 → first_round) with midpoint band weights
- Market type inference uses word-boundary regex to avoid substring collisions
- Odds upsert: per player/bookmaker/market/date (no duplicates within same day)
- Signal: bullish (ADP worse than odds imply), bearish (ADP better than odds imply), neutral

## Auto-Scrapers (server/scrapers/)
14 scrapers running daily at 6am ET. All scrapers use `ensurePlayer()` for auto-player creation:
1. **walterfootball_walt** — WalterFootball Walt's mock (R1-R3, 96 picks)
2. **walterfootball_charlie** — Charlie Campbell's mock (R1-R3, 96 picks)
3. **tankathon** — Tankathon Big Board (42 picks)
4. **mddb_consensus** — NFLMDB consensus (currently blocked by site)
5. **mddb_bigboard** — NFLMDB Big Board (currently blocked by site)
6. **mcshay_report** — Todd McShay via NFLMDB (paywalled — fails)
7. **fantasypros_freedman** — Matthew Freedman via NFLMDB (currently blocked)
8. **sharp_mccrystal** — Ryan McCrystal (SharpFootball, 32 picks, full R1)
9. **sharp_donahue** — Brendan Donahue (SharpFootball, 32 picks, full R1)
10. **nfl_zierlein** — Lance Zierlein NFL.com article (25 picks)
11. **nfl_brooks** — Bucky Brooks NFL.com article (4 picks)
12. **nfl_davis** — Charles Davis NFL.com article (26 picks)
13. **nfl_jeremiah_bigboard** — Daniel Jeremiah Top-50 Big Board (NFL.com, 38 picks, boardType=bigboard)
14. **mockdraftnfl** — MockDraftNFL consensus (32 picks, full R1)

## Daily Cron (6am ET)
1. Run all 14 scrapers sequentially
2. Synthesize consensus ADP from latest picks per source
3. Fetch sportsbook odds via The Odds API (when draft markets are available)

## Pages
- `/` — Dashboard (ADP movers, odds signals, activity feed, ticker)
- `/players` — Players list with search, filter by position, ADP sorting
- `/players/:id` — Player detail (ADP chart, odds, combine stats, analyst rankings)
- `/mock-drafts` — Mock draft matrix (Mock/BigBoard tab toggle)
- `/big-boards` — Analyst big board rankings
- `/sources` — Sources leaderboard with scrape status for all 43 analysts

## Environment Secrets
- `DATABASE_URL` — PostgreSQL connection string (auto-managed by Replit)
- `SESSION_SECRET` — Express session secret
- `ODDS_API_KEY` — The Odds API key for sportsbook odds (theoddsapi.com)
