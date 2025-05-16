import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import { AdminTelegramBot, UserTelegramBot } from "./telegramBot";

// Simple in-memory authentication (moved to environment variable)
const API_KEY = process.env.ADMIN_API_KEY || "admin-key-123"; // Default key for development

// Telegram bot instances
let adminTelegramBot: AdminTelegramBot | null = null;
let userTelegramBot: UserTelegramBot | null = null;

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
  
  // Update Admin Telegram bot settings (admin only)
  app.post("/api/admin/config/admin-bot", authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { enabled, token } = req.body;
      
      if (enabled === undefined) {
        return res.status(400).json({
          success: false,
          error: "Enabled status is required"
        });
      }
      
      // Update bot status
      await storage.setConfig("adminBotEnabled", enabled.toString());
      
      // Update token if provided
      if (token !== undefined) {
        await storage.setConfig("adminBotToken", token);
      }
      
      // Start or stop the Admin Telegram bot based on settings
      if (enabled) {
        // Use token from request, environment variable, or storage
        const botToken = token || process.env.ADMIN_BOT_TOKEN || await storage.getConfigByKey("adminBotToken");
        
        if (!botToken) {
          return res.status(400).json({
            success: false,
            error: "Admin bot token is required when enabling the bot"
          });
        }
        
        // Stop existing admin bot if it's running
        if (adminTelegramBot) {
          adminTelegramBot.stop();
        }
        
        // Start new admin bot with the updated token
        adminTelegramBot = new AdminTelegramBot(botToken, storage);
        adminTelegramBot.start();
      } else if (adminTelegramBot) {
        // Stop the admin bot if it's running
        adminTelegramBot.stop();
        adminTelegramBot = null;
      }
      
      res.json({
        success: true,
        message: "Admin Telegram bot settings updated successfully"
      });
    } catch (error) {
      console.error("Error updating Admin Telegram bot settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update Admin Telegram bot settings"
      });
    }
  });
  
  // Update User Telegram bot settings (admin only)
  app.post("/api/admin/config/user-bot", authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { enabled, token } = req.body;
      
      if (enabled === undefined) {
        return res.status(400).json({
          success: false,
          error: "Enabled status is required"
        });
      }
      
      // Update bot status
      await storage.setConfig("userBotEnabled", enabled.toString());
      
      // Update token if provided
      if (token !== undefined) {
        await storage.setConfig("userBotToken", token);
      }
      
      // Start or stop the User Telegram bot based on settings
      if (enabled) {
        // Use token from request, environment variable, or storage
        const botToken = token || process.env.USER_BOT_TOKEN || await storage.getConfigByKey("userBotToken");
        
        if (!botToken) {
          return res.status(400).json({
            success: false,
            error: "User bot token is required when enabling the bot"
          });
        }
        
        // Stop existing user bot if it's running
        if (userTelegramBot) {
          userTelegramBot.stop();
        }
        
        // Start new user bot with the updated token
        userTelegramBot = new UserTelegramBot(botToken, storage);
        userTelegramBot.start();
      } else if (userTelegramBot) {
        // Stop the user bot if it's running
        userTelegramBot.stop();
        userTelegramBot = null;
      }
      
      res.json({
        success: true,
        message: "User Telegram bot settings updated successfully"
      });
    } catch (error) {
      console.error("Error updating User Telegram bot settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update User Telegram bot settings"
      });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  // Initialize Admin Telegram bot if enabled
  try {
    const adminBotEnabled = await storage.getConfigByKey("adminBotEnabled");
    const adminBotToken = process.env.ADMIN_BOT_TOKEN || await storage.getConfigByKey("adminBotToken");
    
    if (adminBotEnabled === "true" && adminBotToken) {
      adminTelegramBot = new AdminTelegramBot(adminBotToken, storage);
      adminTelegramBot.start();
      console.log("Admin Telegram bot started");
    }
  } catch (error) {
    console.error("Failed to initialize Admin Telegram bot:", error);
  }
  
  // Initialize User Telegram bot if enabled
  try {
    const userBotEnabled = await storage.getConfigByKey("userBotEnabled");
    const userBotToken = process.env.USER_BOT_TOKEN || await storage.getConfigByKey("userBotToken");
    
    if (userBotEnabled === "true" && userBotToken) {
      userTelegramBot = new UserTelegramBot(userBotToken, storage);
      userTelegramBot.start();
      console.log("User Telegram bot started");
    }
  } catch (error) {
    console.error("Failed to initialize User Telegram bot:", error);
  }

  return httpServer;
}
