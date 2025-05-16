import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { TelegramBot } from "./telegramBot";

// Simple in-memory authentication
const API_KEY = process.env.ADMIN_API_KEY || "admin-key-123"; // Default key for development
let telegramBot: TelegramBot | null = null;

// Middleware to authenticate admin API requests
const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized access"
    });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // TMDB to IMDB ID conversion endpoint
  app.get("/api/tmdb-to-imdb/:tmdbId", async (req: Request, res: Response) => {
    try {
      const tmdbId = req.params.tmdbId;
      const tmdbApiKey = process.env.TMDB_API_KEY;
      
      if (!tmdbApiKey) {
        return res.status(500).json({ 
          success: false, 
          error: "TMDB API key not configured" 
        });
      }
      
      // Fetch movie details from TMDB API to get the IMDB ID
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbApiKey}`
      );
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          success: false, 
          error: `TMDB API error: ${response.statusText}` 
        });
      }
      
      const data = await response.json() as any;
      
      // Extract IMDB ID from the response
      const imdbId = data.imdb_id;
      
      if (!imdbId) {
        return res.status(404).json({ 
          success: false, 
          error: "IMDB ID not found for the given TMDB ID" 
        });
      }
      
      // Return the IMDB ID
      return res.json({ 
        success: true, 
        imdbId,
        title: data.title,
        release_date: data.release_date
      });
    } catch (error) {
      console.error("Error in TMDB to IMDB conversion:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to convert TMDB ID to IMDB ID" 
      });
    }
  });

  // ---- CONFIG API ENDPOINTS ----
  
  // Get current extraction URL
  app.get("/api/config/extraction-url", async (req: Request, res: Response) => {
    try {
      const extractionUrl = await storage.getConfigByKey("extractionUrl");
      res.json({
        success: true,
        url: extractionUrl
      });
    } catch (error) {
      console.error("Error getting extraction URL:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve extraction URL"
      });
    }
  });
  
  // Update extraction URL (admin only)
  app.post("/api/admin/config/extraction-url", authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({
          success: false,
          error: "URL is required"
        });
      }
      
      await storage.setConfig("extractionUrl", url);
      
      res.json({
        success: true,
        message: "Extraction URL updated successfully"
      });
    } catch (error) {
      console.error("Error updating extraction URL:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update extraction URL"
      });
    }
  });
  
  // Get all config settings (admin only)
  app.get("/api/admin/config", authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const configs = await storage.getAllConfig();
      res.json({
        success: true,
        configs
      });
    } catch (error) {
      console.error("Error getting config settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve config settings"
      });
    }
  });
  
  // Update Telegram bot settings (admin only)
  app.post("/api/admin/config/telegram", authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { enabled, token } = req.body;
      
      if (enabled === undefined) {
        return res.status(400).json({
          success: false,
          error: "Enabled status is required"
        });
      }
      
      // Update bot status
      await storage.setConfig("telegramBotEnabled", enabled.toString());
      
      // Update token if provided
      if (token !== undefined) {
        await storage.setConfig("telegramBotToken", token);
      }
      
      // Start or stop the Telegram bot based on settings
      if (enabled) {
        const botToken = token || await storage.getConfigByKey("telegramBotToken");
        
        if (!botToken) {
          return res.status(400).json({
            success: false,
            error: "Bot token is required when enabling the bot"
          });
        }
        
        // Stop existing bot if it's running
        if (telegramBot) {
          telegramBot.stop();
        }
        
        // Start new bot with the updated token
        telegramBot = new TelegramBot(botToken, storage);
        telegramBot.start();
      } else if (telegramBot) {
        // Stop the bot if it's running
        telegramBot.stop();
        telegramBot = null;
      }
      
      res.json({
        success: true,
        message: "Telegram bot settings updated successfully"
      });
    } catch (error) {
      console.error("Error updating Telegram bot settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update Telegram bot settings"
      });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  // Initialize Telegram bot if enabled
  try {
    const botEnabled = await storage.getConfigByKey("telegramBotEnabled");
    const botToken = await storage.getConfigByKey("telegramBotToken");
    
    if (botEnabled === "true" && botToken) {
      telegramBot = new TelegramBot(botToken, storage);
      telegramBot.start();
      console.log("Telegram bot started");
    }
  } catch (error) {
    console.error("Failed to initialize Telegram bot:", error);
  }

  return httpServer;
}
