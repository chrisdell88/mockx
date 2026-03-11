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
      
      // Simulate scraping delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockDraft = await storage.createMockDraft({
        sourceName: input.sourceName,
        url: input.url
      });
      
      // We would normally scrape the actual mock draft here, 
      // but for simulation we just return success
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

  // Seed data function to call when app starts
  seedDatabase().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  const existingPlayers = await storage.getPlayers();
  if (existingPlayers.length === 0) {
    // Add Players
    const p1 = await storage.createPlayer({
      name: "Caleb Williams",
      college: "USC",
      position: "QB",
      height: "6'1\"",
      weight: 215,
      rasScore: "8.5",
      imageUrl: "https://images.unsplash.com/photo-1566807810034-cb2150a0abe9?w=400&q=80"
    });
    
    const p2 = await storage.createPlayer({
      name: "Marvin Harrison Jr",
      college: "Ohio State",
      position: "WR",
      height: "6'4\"",
      weight: 205,
      rasScore: "9.2",
      imageUrl: "https://images.unsplash.com/photo-1566807810034-cb2150a0abe9?w=400&q=80"
    });

    const p3 = await storage.createPlayer({
      name: "Drake Maye",
      college: "UNC",
      position: "QB",
      height: "6'4\"",
      weight: 230,
      rasScore: "8.8",
      imageUrl: "https://images.unsplash.com/photo-1566807810034-cb2150a0abe9?w=400&q=80"
    });

    // Add some history
    const date1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const date2 = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const date3 = new Date(); // now

    // Caleb: Flat trend at #1
    await storage.addAdpHistory({ playerId: p1.id, adpValue: "1.2", date: date1 });
    await storage.addAdpHistory({ playerId: p1.id, adpValue: "1.1", date: date2 });
    await storage.addAdpHistory({ playerId: p1.id, adpValue: "1.0", date: date3 });

    // Harrison Jr: Rising slightly
    await storage.addAdpHistory({ playerId: p2.id, adpValue: "4.5", date: date1 });
    await storage.addAdpHistory({ playerId: p2.id, adpValue: "3.8", date: date2 });
    await storage.addAdpHistory({ playerId: p2.id, adpValue: "3.2", date: date3 });

    // Maye: Falling
    await storage.addAdpHistory({ playerId: p3.id, adpValue: "2.5", date: date1 });
    await storage.addAdpHistory({ playerId: p3.id, adpValue: "3.5", date: date2 });
    await storage.addAdpHistory({ playerId: p3.id, adpValue: "4.2", date: date3 });
  }
}
