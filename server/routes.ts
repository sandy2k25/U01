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
  // Secure Player endpoint for encrypted streams
  app.get("/secure-player", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).send(`
          <html>
            <head>
              <title>Error - WovIeX Secure Player</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  height: 100vh; 
                  margin: 0; 
                  background-color: #000;
                  color: white;
                  text-align: center;
                }
                .error-container {
                  max-width: 90%;
                  padding: 20px;
                }
              </style>
            </head>
            <body>
              <div class="error-container">
                <h2>Error: Missing Stream Token</h2>
                <p>The secure stream URL is invalid or has expired.</p>
              </div>
            </body>
          </html>
        `);
      }
      
      try {
        // Decode the token (which is base64 encoded)
        const streamUrl = Buffer.from(token as string, 'base64').toString('utf-8');
        
        // Send an HTML5 video player with enhanced features that uses the decoded URL
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WovIeX Secure Player</title>
            <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                background-color: #000; 
                font-family: Arial, sans-serif;
                overflow: hidden;
                width: 100vw;
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                width: 100%;
                max-width: 1200px;
                padding: 0;
                position: relative;
                aspect-ratio: 16/9;
              }
              .plyr {
                height: 100%;
                width: 100%;
                border-radius: 6px;
                overflow: hidden;
              }
              .plyr--full-ui input[type=range] {
                color: #3b82f6;
              }
              .plyr__control--overlaid {
                background: rgba(59, 130, 246, 0.8);
              }
              .plyr--video .plyr__control.plyr__tab-focus,
              .plyr--video .plyr__control:hover,
              .plyr--video .plyr__control[aria-expanded=true] {
                background: #3b82f6;
              }
              .plyr__control.plyr__tab-focus {
                box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.5);
              }
              .plyr__menu__container .plyr__control[role=menuitemradio][aria-checked=true]::before {
                background: #3b82f6;
              }
              .loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 16px;
                z-index: 1;
                background: rgba(0,0,0,0.7);
                padding: 15px 25px;
                border-radius: 4px;
                transition: opacity 0.3s ease;
              }
              .watermark {
                position: absolute;
                bottom: 60px;
                right: 15px;
                font-size: 14px;
                padding: 5px 10px;
                background: rgba(0,0,0,0.5);
                color: rgba(255,255,255,0.7);
                border-radius: 3px;
                z-index: 2;
                pointer-events: none;
                user-select: none;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div id="loading" class="loading">Loading secure stream...</div>
              <div class="watermark">WovIeX Player</div>
              <video id="player" crossorigin playsinline controls></video>
            </div>
            
            <script src="https://cdn.plyr.io/3.7.8/plyr.polyfilled.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
            
            <script>
              document.addEventListener('DOMContentLoaded', function() {
                const source = '${streamUrl}';
                const video = document.getElementById('player');
                const loading = document.getElementById('loading');
                
                // For more options see: https://github.com/sampotts/plyr/#options
                const defaultOptions = {
                  speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
                  quality: { default: 'auto' },
                  controls: [
                    'play-large', 'play', 'progress', 'current-time', 'mute',
                    'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
                  ],
                  seekTime: 10,
                  keyboard: { focused: true, global: false },
                  tooltips: { controls: true, seek: true },
                  i18n: {
                    restart: 'Restart',
                    rewind: 'Rewind {seektime}s',
                    play: 'Play',
                    pause: 'Pause',
                    fastForward: 'Forward {seektime}s',
                    seek: 'Seek',
                    played: 'Played',
                    buffered: 'Buffered',
                    currentTime: 'Current time',
                    duration: 'Duration',
                    volume: 'Volume',
                    mute: 'Mute',
                    unmute: 'Unmute',
                    settings: 'Settings',
                    pip: 'PIP',
                    enterFullscreen: 'Enter fullscreen',
                    exitFullscreen: 'Exit fullscreen',
                    speed: 'Speed',
                    normal: 'Normal',
                    quality: 'Quality',
                    loop: 'Loop'
                  }
                };

                // If HLS.js is supported
                if (Hls.isSupported()) {
                  const hls = new Hls();
                  hls.loadSource(source);
                  hls.attachMedia(video);
                  
                  // From the m3u8 playlist, try to detect if quality options are available
                  hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                    loading.style.opacity = '0';
                    setTimeout(() => {
                      loading.style.display = 'none';
                    }, 300);
                    
                    // Initialize player
                    const player = new Plyr(video, defaultOptions);
                    
                    // Quality switching for HLS
                    if (data.levels.length > 1) {
                      const qualities = data.levels.map((level, index) => {
                        return { label: level.height + 'p', value: index };
                      });
                      
                      qualities.unshift({
                        label: 'Auto',
                        value: 'auto'
                      });
                      
                      // Update the quality options in the player
                      player.config.quality = {
                        options: qualities.map(q => q.value),
                        forced: true,
                        onChange: (quality) => {
                          if (quality === 'auto') {
                            hls.currentLevel = -1;
                          } else {
                            hls.currentLevel = quality;
                          }
                        }
                      };
                      
                      // Set quality in player
                      player.quality = 'auto';
                    }
                    
                    // Handle errors
                    hls.on(Hls.Events.ERROR, function(event, data) {
                      loading.textContent = 'Error loading stream. The URL may be invalid or expired.';
                      loading.style.opacity = '1';
                      loading.style.display = 'block';
                      console.error('HLS error:', data);
                    });
                  });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                  // Native HLS support (Safari)
                  video.src = source;
                  const player = new Plyr(video, defaultOptions);
                  
                  video.addEventListener('loadedmetadata', function() {
                    loading.style.opacity = '0';
                    setTimeout(() => {
                      loading.style.display = 'none';
                    }, 300);
                  });
                  
                  video.addEventListener('error', function() {
                    loading.textContent = 'Error loading stream. The URL may be invalid or expired.';
                    loading.style.opacity = '1';
                    loading.style.display = 'block';
                  });
                } else {
                  loading.textContent = 'Your browser does not support HLS playback.';
                }
              });
            </script>
          </body>
          </html>
        `);
      } catch (error) {
        console.error("Error decoding secure player token:", error);
        return res.status(400).send(`
          <html>
            <head>
              <title>Error - WovIeX Secure Player</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  height: 100vh; 
                  margin: 0; 
                  background-color: #000;
                  color: white;
                  text-align: center;
                }
                .error-container {
                  max-width: 90%;
                  padding: 20px;
                }
              </style>
            </head>
            <body>
              <div class="error-container">
                <h2>Error: Invalid Stream Token</h2>
                <p>The secure stream URL is invalid or has expired.</p>
              </div>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error("Error serving secure player:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  // Search files by title
  app.get("/api/search-files", async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string;
      const tmdbApiKey = process.env.TMDB_API_KEY;
      
      if (!tmdbApiKey) {
        return res.status(500).json({ 
          success: false, 
          error: "TMDB API key not configured" 
        });
      }
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Search query is required"
        });
      }
      
      // Search for movies using the TMDB API
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          success: false, 
          error: `TMDB API error: ${response.statusText}` 
        });
      }
      
      const data = await response.json() as any;
      
      return res.json({
        success: true,
        results: data.results || []
      });
    } catch (error) {
      console.error("Error searching for files:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to search for files" 
      });
    }
  });
  
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
  
  // Start both Telegram bots (admin only)
  app.post("/api/admin/start-bots", authenticateAdmin, async (req: Request, res: Response) => {
    try {
      let adminBotStarted = false;
      let userBotStarted = false;
      const messages = [];
      
      // Try to start admin bot
      const adminBotToken = process.env.ADMIN_BOT_TOKEN;
      if (adminBotToken) {
        if (adminTelegramBot) {
          adminTelegramBot.stop();
        }
        
        adminTelegramBot = new AdminTelegramBot(adminBotToken, storage);
        adminTelegramBot.start();
        adminBotStarted = true;
        await storage.setConfig("adminBotEnabled", "true");
        await storage.setConfig("adminBotToken", adminBotToken);
        messages.push("Admin bot started successfully");
        console.log("Admin Telegram bot started manually");
      } else {
        messages.push("Admin bot token not found in environment variables");
      }
      
      // Try to start user bot
      const userBotToken = process.env.USER_BOT_TOKEN;
      if (userBotToken) {
        if (userTelegramBot) {
          userTelegramBot.stop();
        }
        
        userTelegramBot = new UserTelegramBot(userBotToken, storage);
        userTelegramBot.start();
        userBotStarted = true;
        await storage.setConfig("userBotEnabled", "true");
        await storage.setConfig("userBotToken", userBotToken);
        messages.push("User bot started successfully");
        console.log("User Telegram bot started manually");
      } else {
        messages.push("User bot token not found in environment variables");
      }
      
      res.json({
        success: true,
        adminBotStarted,
        userBotStarted,
        messages
      });
    } catch (error) {
      console.error("Error starting Telegram bots:", error);
      res.status(500).json({
        success: false,
        error: "Failed to start Telegram bots"
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

  // Admin password verification endpoint
  app.post("/api/admin/verify-password", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({
          success: false,
          error: "Password is required"
        });
      }
      
      // Check against the admin password (use environment variable)
      const adminPassword = process.env.ADMIN_API_KEY || API_KEY;
      console.log("Admin password verification attempt");
      
      if (password === adminPassword) {
        return res.json({
          success: true,
          message: "Password verified successfully"
        });
      } else {
        return res.json({
          success: false,
          error: "Invalid password"
        });
      }
    } catch (error) {
      console.error("Error verifying admin password:", error);
      res.status(500).json({
        success: false,
        error: "Failed to verify password"
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
