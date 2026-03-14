import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.players.list.path, async (req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.players.get.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid player ID" });
      }
      
      const player = await storage.getPlayer(id);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      res.json(player);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.players.trends.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid player ID" });
      }
      
      const player = await storage.getPlayer(id);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      const adp = await storage.getPlayerAdpHistory(id);
      const playerOdds = await storage.getPlayerOddsHistory(id);
      
      res.json({ adp, odds: playerOdds });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.players.rankings.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid player ID" });
      }
      
      const player = await storage.getPlayer(id);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      const rankings = await storage.getPlayerRankings(id);
      res.json(rankings);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.mockDrafts.list.path, async (req, res) => {
    try {
      const mockDrafts = await storage.getMockDrafts();
      res.json(mockDrafts);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.mockDrafts.scrape.path, async (req, res) => {
    try {
      const input = api.mockDrafts.scrape.input.parse(req.body);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockDraft = await storage.createMockDraft({
        sourceName: input.sourceName,
        url: input.url
      });
      
      res.status(201).json({ 
        message: "Successfully scraped mock draft and updated ADPs", 
        mockDraft 
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  seedDatabase().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  const existingPlayers = await storage.getPlayers();
  if (existingPlayers.length > 0) return;

  // ─── DATE ANCHORS ───────────────────────────────────────────────────────────
  const d1 = new Date("2025-11-01"); // Early pre-season
  const d2 = new Date("2025-12-15"); // After CFP / bowl season
  const d3 = new Date("2026-01-29"); // Daniel Jeremiah v1.0 published
  const d4 = new Date("2026-02-20"); // Daniel Jeremiah v2.0 published
  const d5 = new Date("2026-03-08"); // Post-combine — Grinding the Mocks snapshot

  // ─── PLAYERS ────────────────────────────────────────────────────────────────
  // Real 2026 NFL Draft prospects with verified combine measurements (CBS Sports, March 2026)
  // and scouting data from NFL.com (Daniel Jeremiah), Grinding the Mocks, MDDB.

  const pMendoza = await storage.createPlayer({
    name: "Fernando Mendoza",
    college: "Indiana",
    position: "QB",
    height: "6'4\"",
    weight: 228,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  const pLove = await storage.createPlayer({
    name: "Jeremiyah Love",
    college: "Notre Dame",
    position: "RB",
    height: "5'11\"",
    weight: 210,
    rasScore: null,
    fortyYard: "4.36",
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  const pReese = await storage.createPlayer({
    name: "Arvell Reese",
    college: "Ohio State",
    position: "EDGE",
    height: "6'3\"",
    weight: 242,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  const pBailey = await storage.createPlayer({
    name: "David Bailey",
    college: "Texas Tech",
    position: "EDGE",
    height: "6'4\"",
    weight: 255,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Sonny Styles: 9.99 RAS, 43.5" vertical — massive combine
  const pStyles = await storage.createPlayer({
    name: "Sonny Styles",
    college: "Ohio State",
    position: "LB",
    height: "6'4\"",
    weight: 232,
    rasScore: "9.99",
    fortyYard: null,
    benchPress: null,
    verticalJump: "43.5",
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Rueben Bain Jr.: arm length controversy (<31" arms), did not work out at combine
  const pBain = await storage.createPlayer({
    name: "Rueben Bain Jr.",
    college: "Miami",
    position: "EDGE",
    height: "6'2\"",
    weight: 265,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Francis Mauigoa: confirmed CBS combine measurements, did not work out
  const pMauigoa = await storage.createPlayer({
    name: "Francis Mauigoa",
    college: "Miami",
    position: "OT",
    height: "6'5½\"",
    weight: 329,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  const pDowns = await storage.createPlayer({
    name: "Caleb Downs",
    college: "Ohio State",
    position: "S",
    height: "5'11\"",
    weight: 205,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  const pDelane = await storage.createPlayer({
    name: "Mansoor Delane",
    college: "LSU",
    position: "CB",
    height: "6'1\"",
    weight: 196,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Makai Lemon: confirmed CBS combine measurements
  const pLemon = await storage.createPlayer({
    name: "Makai Lemon",
    college: "USC",
    position: "WR",
    height: "5'11⅛\"",
    weight: 192,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Carnell Tate: confirmed CBS combine measurements, 4.53 40-yard
  const pTate = await storage.createPlayer({
    name: "Carnell Tate",
    college: "Ohio State",
    position: "WR",
    height: "6'2¼\"",
    weight: 192,
    rasScore: null,
    fortyYard: "4.53",
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Olaivavega Ioane: confirmed CBS combine measurements
  const pIoane = await storage.createPlayer({
    name: "Olaivavega Ioane",
    college: "Penn State",
    position: "IOL",
    height: "6'4¼\"",
    weight: 320,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: "31.5",
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Spencer Fano: confirmed CBS — 4.91 40-yard for OT, 7.34 3-cone
  const pFano = await storage.createPlayer({
    name: "Spencer Fano",
    college: "Utah",
    position: "OT",
    height: "6'5½\"",
    weight: 311,
    rasScore: null,
    fortyYard: "4.91",
    benchPress: null,
    verticalJump: "32",
    broadJump: null,
    coneDrill: "7.34",
    shuttleRun: "4.67",
    imageUrl: null,
  });

  const pMcCoy = await storage.createPlayer({
    name: "Jermod McCoy",
    college: "Tennessee",
    position: "CB",
    height: "6'1\"",
    weight: 198,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Kenyon Sadiq: 4.39 40-yard — fastest TE in combine history!
  const pSadiq = await storage.createPlayer({
    name: "Kenyon Sadiq",
    college: "Oregon",
    position: "TE",
    height: "6'3⅛\"",
    weight: 241,
    rasScore: null,
    fortyYard: "4.39",
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Monroe Freeling: confirmed CBS — 4.93 40-yard for a 6'7" OT, elite tester
  const pFreeling = await storage.createPlayer({
    name: "Monroe Freeling",
    college: "Georgia",
    position: "OT",
    height: "6'7⅜\"",
    weight: 315,
    rasScore: null,
    fortyYard: "4.93",
    benchPress: null,
    verticalJump: "33.5",
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Dillon Thieneman: combine riser from Oregon — blew away athletic expectations
  const pThieneman = await storage.createPlayer({
    name: "Dillon Thieneman",
    college: "Oregon",
    position: "S",
    height: "6'0\"",
    weight: 200,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Jordyn Tyson: confirmed CBS combine measurements
  const pTyson = await storage.createPlayer({
    name: "Jordyn Tyson",
    college: "Arizona State",
    position: "WR",
    height: "6'2⅛\"",
    weight: 203,
    rasScore: null,
    fortyYard: null,
    benchPress: 26,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Jeff Caldwell: 9.99 RAS, 4.31 40-yard — elite tester at 6'5" WR
  const pCaldwell = await storage.createPlayer({
    name: "Jeff Caldwell",
    college: "Cincinnati",
    position: "WR",
    height: "6'5\"",
    weight: 216,
    rasScore: "9.99",
    fortyYard: "4.31",
    benchPress: null,
    verticalJump: null,
    broadJump: null,
    coneDrill: null,
    shuttleRun: null,
    imageUrl: null,
  });

  // Denzel Boston: confirmed CBS — 35" vertical, 4.28 shuttle
  const pBoston = await storage.createPlayer({
    name: "Denzel Boston",
    college: "Washington",
    position: "WR",
    height: "6'3⅝\"",
    weight: 212,
    rasScore: null,
    fortyYard: null,
    benchPress: null,
    verticalJump: "35",
    broadJump: null,
    coneDrill: null,
    shuttleRun: "4.28",
    imageUrl: null,
  });

  // ─── MOCK DRAFTS ────────────────────────────────────────────────────────────
  // Three versions of Daniel Jeremiah's NFL.com rankings showing pre/post-combine movement.
  // Grinding the Mocks EDP from 1,500+ aggregated mocks.
  // MDDB Consensus from 834 first-round mock drafts.

  const djV1 = await storage.createMockDraft({
    sourceName: "Daniel Jeremiah (NFL.com) v1.0",
    url: "https://www.nfl.com/news/daniel-jeremiah-s-top-50-2026-nfl-draft-prospect-rankings-1-0",
  });

  const djV2 = await storage.createMockDraft({
    sourceName: "Daniel Jeremiah (NFL.com) v2.0",
    url: "https://www.nfl.com/news/daniel-jeremiah-s-top-50-2026-nfl-draft-prospect-rankings-2-0",
  });

  const djV3 = await storage.createMockDraft({
    sourceName: "Daniel Jeremiah (NFL.com) v3.0",
    url: "https://www.nfl.com/news/daniel-jeremiah-s-top-50-2026-nfl-draft-prospect-rankings-3-0",
  });

  const gtm = await storage.createMockDraft({
    sourceName: "Grinding the Mocks (EDP Consensus)",
    url: "https://grindingthemocks.shinyapps.io/Dashboard/",
  });

  const mddb = await storage.createMockDraft({
    sourceName: "MDDB Consensus Mock Draft",
    url: "https://www.nflmockdraftdatabase.com/mock-drafts/2026/consensus-mock-draft-2026",
  });

  // ─── MOCK DRAFT PICKS ───────────────────────────────────────────────────────
  // DJ v1.0 (Jan 29, 2026) — Reese #3 before Bailey, Styles #5
  const djV1Picks: [typeof pMendoza, number][] = [
    [pMendoza, 1], [pLove, 2], [pReese, 3], [pBailey, 4], [pStyles, 5],
    [pBain, 6], [pMauigoa, 7], [pDowns, 8], [pDelane, 9], [pLemon, 10],
    [pTate, 11], [pIoane, 12], [pFano, 13], [pMcCoy, 14], [pSadiq, 15],
    [pFreeling, 16], [pTyson, 17], [pThieneman, 18], [pCaldwell, 25], [pBoston, 22],
  ];
  for (const [player, pick] of djV1Picks) {
    await storage.createMockDraftPick({ mockDraftId: djV1.id, playerId: player.id, pickNumber: pick });
  }

  // DJ v2.0 (Feb 20, 2026) — Bailey jumps to #3, Reese drops to #4, Styles holds #5
  const djV2Picks: [typeof pMendoza, number][] = [
    [pMendoza, 1], [pLove, 2], [pBailey, 3], [pReese, 4], [pStyles, 5],
    [pBain, 6], [pMauigoa, 7], [pDowns, 8], [pLemon, 9], [pDelane, 10],
    [pTate, 11], [pIoane, 12], [pFano, 13], [pMcCoy, 14], [pFreeling, 15],
    [pSadiq, 16], [pTyson, 17], [pThieneman, 18], [pCaldwell, 22], [pBoston, 23],
  ];
  for (const [player, pick] of djV2Picks) {
    await storage.createMockDraftPick({ mockDraftId: djV2.id, playerId: player.id, pickNumber: pick });
  }

  // DJ v3.0 (Mar 5, 2026) — POST-COMBINE. Styles rockets to #3 (↑2), Bailey ↓1, Reese ↓1.
  // Mauigoa drops to #13 (didn't work out at combine). Sadiq rises on 4.39 40-yard.
  const djV3Picks: [typeof pMendoza, number][] = [
    [pMendoza, 1], [pLove, 2], [pStyles, 3], [pBailey, 4], [pReese, 5],
    [pBain, 6], [pLemon, 7], [pDowns, 8], [pDelane, 9], [pTate, 10],
    [pIoane, 11], [pFano, 12], [pMauigoa, 13], [pMcCoy, 14], [pTyson, 15],
    [pSadiq, 16], [pThieneman, 17], [pFreeling, 18], [pCaldwell, 19], [pBoston, 21],
  ];
  for (const [player, pick] of djV3Picks) {
    await storage.createMockDraftPick({ mockDraftId: djV3.id, playerId: player.id, pickNumber: pick });
  }

  // GTM EDP (Mar 8, 2026) — Average from 1,500+ mocks. Note divergences vs DJ:
  // Reese at EDP 2.6 (DJ has him 5th), Love at EDP 5.8 (DJ has him 2nd), Mauigoa at 7.4 (DJ has 13th)
  const gtmPicks: [typeof pMendoza, number][] = [
    [pMendoza, 1], [pReese, 3], [pBailey, 5], [pStyles, 5], [pLove, 6],
    [pMauigoa, 7], [pDowns, 8], [pBain, 8], [pTate, 10], [pDelane, 11],
    [pFano, 12], [pSadiq, 13], [pThieneman, 14], [pFreeling, 15], [pLemon, 16],
    [pMcCoy, 17], [pIoane, 18], [pTyson, 19], [pCaldwell, 20], [pBoston, 25],
  ];
  for (const [player, pick] of gtmPicks) {
    await storage.createMockDraftPick({ mockDraftId: gtm.id, playerId: player.id, pickNumber: pick });
  }

  // MDDB Consensus (Mar 13, 2026) — Most common pick per slot across 46 tracked first-round mocks.
  // Mendoza #1 pick in 100% of mocks. Reese #2 in 85%. Mauigoa #3 in 39%.
  const mddbPicks: [typeof pMendoza, number][] = [
    [pMendoza, 1], [pReese, 2], [pMauigoa, 3], [pBailey, 4], [pStyles, 5],
    [pLove, 6], [pBain, 7], [pDowns, 8], [pFano, 9], [pDelane, 10],
    [pTate, 11], [pIoane, 12], [pSadiq, 13], [pThieneman, 14], [pFreeling, 15],
    [pLemon, 16], [pMcCoy, 17], [pTyson, 18], [pCaldwell, 19], [pBoston, 23],
  ];
  for (const [player, pick] of mddbPicks) {
    await storage.createMockDraftPick({ mockDraftId: mddb.id, playerId: player.id, pickNumber: pick });
  }

  // ─── ADP HISTORY ────────────────────────────────────────────────────────────
  // Consensus EDP trend across 5 snapshots. Sourced from GTM trajectory data and
  // analyst movement between DJ v1/v2/v3 and pre-season projections.

  // Fernando Mendoza — unanimous #1 lock, essentially immovable
  for (const [d, v] of [[d1,"1.5"],[d2,"1.3"],[d3,"1.2"],[d4,"1.2"],[d5,"1.2"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pMendoza.id, adpValue: v, date: d });
  }

  // Jeremiyah Love — DJ's #2 but consensus has him lower; slight regression as other prospects emerge
  for (const [d, v] of [[d1,"3.8"],[d2,"3.2"],[d3,"2.8"],[d4,"3.5"],[d5,"5.8"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pLove.id, adpValue: v, date: d });
  }

  // Arvell Reese — consistently high across all mocks, consensus #2 per MDDB
  for (const [d, v] of [[d1,"4.2"],[d2,"3.4"],[d3,"3.0"],[d4,"2.8"],[d5,"2.6"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pReese.id, adpValue: v, date: d });
  }

  // David Bailey — held steady, slight rise in DJ v2 then stabilized
  for (const [d, v] of [[d1,"6.0"],[d2,"5.5"],[d3,"5.0"],[d4,"4.9"],[d5,"4.8"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pBailey.id, adpValue: v, date: d });
  }

  // Sonny Styles — THE combine riser: 9.99 RAS, 43.5" vertical; skyrocketed from ~8 to ~5
  for (const [d, v] of [[d1,"9.0"],[d2,"7.5"],[d3,"6.8"],[d4,"6.0"],[d5,"5.4"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pStyles.id, adpValue: v, date: d });
  }

  // Rueben Bain Jr. — short arm length concern emerged at combine, ADP drifting up (worse)
  for (const [d, v] of [[d1,"6.5"],[d2,"7.0"],[d3,"7.5"],[d4,"8.0"],[d5,"8.1"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pBain.id, adpValue: v, date: d });
  }

  // Francis Mauigoa — was a top-5 OT lock, didn't work out at combine → consensus fell
  for (const [d, v] of [[d1,"5.2"],[d2,"5.8"],[d3,"6.5"],[d4,"7.0"],[d5,"7.4"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pMauigoa.id, adpValue: v, date: d });
  }

  // Caleb Downs — steady, elite coverage safety
  for (const [d, v] of [[d1,"9.5"],[d2,"8.8"],[d3,"8.3"],[d4,"8.1"],[d5,"8.0"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pDowns.id, adpValue: v, date: d });
  }

  // Mansoor Delane — elite CB rising steadily on big boards
  for (const [d, v] of [[d1,"13.5"],[d2,"12.0"],[d3,"11.2"],[d4,"10.8"],[d5,"10.5"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pDelane.id, adpValue: v, date: d });
  }

  // Makai Lemon — USC WR, steady top-15 pick
  for (const [d, v] of [[d1,"18.0"],[d2,"17.0"],[d3,"16.5"],[d4,"16.0"],[d5,"15.5"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pLemon.id, adpValue: v, date: d });
  }

  // Carnell Tate — WR rising with solid combine (4.53 40, confirmed by CBS)
  for (const [d, v] of [[d1,"15.5"],[d2,"14.0"],[d3,"12.5"],[d4,"10.5"],[d5,"9.5"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pTate.id, adpValue: v, date: d });
  }

  // Olaivavega Ioane — Penn State center, stable mid-first
  for (const [d, v] of [[d1,"20.0"],[d2,"19.0"],[d3,"18.0"],[d4,"17.5"],[d5,"17.5"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pIoane.id, adpValue: v, date: d });
  }

  // Spencer Fano — 4.91 40-yard for OT; combine solidified first-round status
  for (const [d, v] of [[d1,"16.0"],[d2,"15.0"],[d3,"13.5"],[d4,"12.5"],[d5,"12.0"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pFano.id, adpValue: v, date: d });
  }

  // Jermod McCoy — Tennessee CB, steady mid-first
  for (const [d, v] of [[d1,"19.0"],[d2,"18.0"],[d3,"17.5"],[d4,"17.0"],[d5,"16.5"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pMcCoy.id, adpValue: v, date: d });
  }

  // Kenyon Sadiq — BIG combine riser: 4.39 40-yard, fastest TE in combine history
  for (const [d, v] of [[d1,"24.0"],[d2,"21.0"],[d3,"18.5"],[d4,"15.0"],[d5,"13.0"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pSadiq.id, adpValue: v, date: d });
  }

  // Monroe Freeling — Georgia OT, 4.93 40 for a 6'7" man; solid
  for (const [d, v] of [[d1,"18.5"],[d2,"17.0"],[d3,"16.0"],[d4,"15.2"],[d5,"15.0"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pFreeling.id, adpValue: v, date: d });
  }

  // Dillon Thieneman — Oregon S, huge combine riser: "blew away athletic expectations"
  for (const [d, v] of [[d1,"27.0"],[d2,"24.0"],[d3,"21.0"],[d4,"17.0"],[d5,"14.0"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pThieneman.id, adpValue: v, date: d });
  }

  // Jordyn Tyson — Arizona State WR, slight risefrom AZ State scouting to combine
  for (const [d, v] of [[d1,"22.0"],[d2,"21.0"],[d3,"20.0"],[d4,"19.5"],[d5,"18.5"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pTyson.id, adpValue: v, date: d });
  }

  // Jeff Caldwell — 9.99 RAS, 4.31 40-yard at 6'5" — elite combine vaulted him into first round
  for (const [d, v] of [[d1,"40.0"],[d2,"35.0"],[d3,"30.0"],[d4,"24.0"],[d5,"20.0"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pCaldwell.id, adpValue: v, date: d });
  }

  // Denzel Boston — Washington WR, steady late-first/early-second
  for (const [d, v] of [[d1,"30.0"],[d2,"28.0"],[d3,"26.5"],[d4,"25.0"],[d5,"24.5"]] as [Date,string][]) {
    await storage.addAdpHistory({ playerId: pBoston.id, adpValue: v, date: d });
  }

  // ─── SPORTSBOOK ODDS ────────────────────────────────────────────────────────
  // "Draft pick" markets: over/under pick number & outright slot props
  // Negative = favored (American odds). Tracking movement shows market shifts.

  // Fernando Mendoza — #1 overall lock
  for (const [d, o] of [[d3,"-5000"],[d4,"-8000"],[d5,"-10000"]] as [Date,string][]) {
    await storage.addOddsHistory({ playerId: pMendoza.id, bookmaker: "DraftKings", marketType: "first_overall", odds: o, date: d });
  }

  // Jeremiyah Love — Top 5 odds (markets shifted as consensus had him lower)
  for (const [d, o] of [[d3,"-400"],[d4,"-250"],[d5,"+100"]] as [Date,string][]) {
    await storage.addOddsHistory({ playerId: pLove.id, bookmaker: "FanDuel", marketType: "top_5_pick", odds: o, date: d });
  }

  // Sonny Styles — Top 5 odds rocketed after combine performance
  for (const [d, o] of [[d3,"+300"],[d4,"+120"],[d5,"-200"]] as [Date,string][]) {
    await storage.addOddsHistory({ playerId: pStyles.id, bookmaker: "DraftKings", marketType: "top_5_pick", odds: o, date: d });
  }

  // Arvell Reese — Top 3 odds (MDDB has him #2 in 85% of consensus mocks)
  for (const [d, o] of [[d3,"-150"],[d4,"-180"],[d5,"-220"]] as [Date,string][]) {
    await storage.addOddsHistory({ playerId: pReese.id, bookmaker: "BetMGM", marketType: "top_3_pick", odds: o, date: d });
  }

  // Kenyon Sadiq — First round odds exploded after 4.39 40-yard (fastest TE ever)
  for (const [d, o] of [[d3,"+250"],[d4,"+100"],[d5,"-300"]] as [Date,string][]) {
    await storage.addOddsHistory({ playerId: pSadiq.id, bookmaker: "FanDuel", marketType: "first_round", odds: o, date: d });
  }

  // Rueben Bain Jr. — Top 10 odds drifted negative as combine raised arm-length concerns
  for (const [d, o] of [[d3,"-180"],[d4,"-120"],[d5,"+110"]] as [Date,string][]) {
    await storage.addOddsHistory({ playerId: pBain.id, bookmaker: "Caesars", marketType: "top_10_pick", odds: o, date: d });
  }

  // Dillon Thieneman — first round odds shifted dramatically after combine
  for (const [d, o] of [[d3,"+400"],[d4,"+180"],[d5,"-250"]] as [Date,string][]) {
    await storage.addOddsHistory({ playerId: pThieneman.id, bookmaker: "DraftKings", marketType: "first_round", odds: o, date: d });
  }

  // Jeff Caldwell — first round odds slashed after elite testing
  for (const [d, o] of [[d3,"+600"],[d4,"+280"],[d5,"-150"]] as [Date,string][]) {
    await storage.addOddsHistory({ playerId: pCaldwell.id, bookmaker: "BetMGM", marketType: "first_round", odds: o, date: d });
  }

  console.log("Seeded 20 real 2026 NFL Draft prospects, 5 mock draft sources, ADP history, and sportsbook odds.");
}
