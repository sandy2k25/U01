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
      console.log("Secure player request received with query:", req.query);
      const { token } = req.query;
      
      if (!token) {
        console.log("Missing token in secure player request");
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
        // Decode the token using the multi-step process that matches client-side encryption
        console.log("Attempting to decode secure token");
        
        // Step 1: Restore the Base64 standard format by replacing URL-safe characters
        let normalizedToken = (token as string)
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        
        // Add back padding if needed
        while (normalizedToken.length % 4) {
          normalizedToken += '=';
        }
        
        // Step 2: Decode the first layer of Base64
        const obfuscatedData = Buffer.from(normalizedToken, 'base64').toString('binary');
        
        // Step 3: Reverse the XOR obfuscation with the same rotating key
        const securityKey = "S3cur3Str3am1ngK3y";
        let decodedData = "";
        
        for (let i = 0; i < obfuscatedData.length; i++) {
          const charCode = obfuscatedData.charCodeAt(i);
          const keyChar = securityKey.charCodeAt(i % securityKey.length);
          decodedData += String.fromCharCode(charCode ^ keyChar);
        }
        
        // Step 4: Decode the Base64 JSON data
        const jsonData = Buffer.from(decodedData, 'base64').toString('utf-8');
        
        // Step 5: Parse the JSON to get the stream URL and check expiry
        const metaData = JSON.parse(jsonData);
        
        // Validate expiry time
        const currentTime = Date.now();
        if (metaData.expires && metaData.expires < currentTime) {
          throw new Error("Stream URL has expired");
        }
        
        // Extract the actual stream URL
        const streamUrl = metaData.stream;
        
        if (!streamUrl) {
          throw new Error("No stream URL found in token");
        }
        
        console.log("Successfully decoded stream URL:", streamUrl ? "URL found" : "Empty URL");
        
        // Send an HTML5 video player with enhanced features that uses the decoded URL
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WovIeX Premium Player</title>
            <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              
              @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap');
              
              :root {
                --primary-color: #6d28d9;
                --secondary-color: #4f46e5;
                --highlight-color: #8b5cf6;
                --dark-color: #1f2937;
                --light-color: #f3f4f6;
                --success-color: #10b981;
                --danger-color: #ef4444;
                --info-color: #3b82f6;
              }
              
              body { 
                background-color: var(--dark-color); 
                font-family: 'Montserrat', sans-serif;
                overflow: hidden;
                width: 100vw;
                height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                position: relative;
              }
              
              .player-container {
                width: 100%;
                max-width: 1280px;
                padding: 0;
                position: relative;
                aspect-ratio: 16/9;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border-radius: 12px;
                background: #000;
                overflow: hidden;
              }
              
              .advanced-controls {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                display: flex;
                justify-content: space-between;
                padding: 15px 20px;
                background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
                z-index: 10;
                opacity: 0;
                transition: opacity 0.3s ease;
              }
              
              .player-container:hover .advanced-controls,
              .player-container:hover .player-info {
                opacity: 1;
              }
              
              .player-branding {
                display: flex;
                align-items: center;
                gap: 10px;
              }
              
              .player-logo {
                background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                width: 36px;
                height: 36px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              }
              
              .player-title {
                font-weight: 500;
                font-size: 16px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
              }
              
              .feature-buttons {
                display: flex;
                gap: 10px;
              }
              
              .feature-button {
                background: rgba(255,255,255,0.15);
                border: none;
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                backdrop-filter: blur(4px);
              }
              
              .feature-button:hover {
                background: rgba(255,255,255,0.25);
                transform: translateY(-2px);
              }
              
              .feature-button.active {
                background: var(--highlight-color);
                box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
              }
              
              .plyr {
                height: 100%;
                width: 100%;
                border-radius: 12px;
                overflow: hidden;
              }
              
              .plyr--full-ui input[type=range] {
                color: var(--highlight-color);
              }
              
              .plyr__control--overlaid {
                background: rgba(109, 40, 217, 0.9);
                padding: 25px;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
              }
              
              .plyr__control--overlaid:hover {
                background: rgba(109, 40, 217, 1);
                transform: scale(1.1);
                box-shadow: 0 0 30px rgba(109, 40, 217, 0.6);
              }
              
              .plyr--video .plyr__control.plyr__tab-focus,
              .plyr--video .plyr__control:hover,
              .plyr--video .plyr__control[aria-expanded=true] {
                background: var(--highlight-color);
              }
              
              .plyr__control.plyr__tab-focus {
                box-shadow: 0 0 0 5px rgba(139, 92, 246, 0.5);
              }
              
              .plyr__menu__container .plyr__control[role=menuitemradio][aria-checked=true]::before {
                background: var(--highlight-color);
              }
              
              .loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 16px;
                z-index: 20;
                background: rgba(31, 41, 55, 0.9);
                padding: 20px 30px;
                border-radius: 12px;
                transition: all 0.4s ease;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                backdrop-filter: blur(10px);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
              }
              
              .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(255,255,255,0.1);
                border-radius: 50%;
                border-top-color: var(--highlight-color);
                animation: spin 1s linear infinite;
              }
              
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
              
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
                70% { box-shadow: 0 0 0 15px rgba(139, 92, 246, 0); }
                100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
              }
              
              @keyframes float {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-5px); }
                100% { transform: translateY(0px); }
              }
              
              @keyframes glow {
                0% { filter: drop-shadow(0 0 2px rgba(139, 92, 246, 0.3)); }
                50% { filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.6)); }
                100% { filter: drop-shadow(0 0 2px rgba(139, 92, 246, 0.3)); }
              }
              
              .watermark {
                position: absolute;
                bottom: 80px;
                right: 20px;
                font-size: 14px;
                padding: 6px 12px;
                background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
                color: white;
                border-radius: 6px;
                z-index: 5;
                pointer-events: none;
                user-select: none;
                opacity: 0.8;
                transform: translateY(0);
                transition: transform 0.3s ease, opacity 0.3s ease;
                box-shadow: 0 2px 10px rgba(0,0,0,0.4);
                animation: float 3s ease-in-out infinite;
              }
              
              .player-container:hover .watermark {
                transform: translateY(-20px);
                opacity: 0.95;
                animation: float 3s ease-in-out infinite, glow 2s ease-in-out infinite;
              }
              
              .player-info {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 20px;
                background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
                z-index: 5;
                opacity: 0;
                transition: opacity 0.3s ease;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              
              .stream-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }
              
              .stream-quality {
                font-size: 12px;
                padding: 3px 8px;
                background: rgba(255,255,255,0.15);
                border-radius: 4px;
                display: inline-block;
                width: fit-content;
              }
              
              .time-info {
                font-size: 12px;
                opacity: 0.7;
              }
              
              .stats-panel {
                position: absolute;
                top: 80px;
                left: 20px;
                background: rgba(31, 41, 55, 0.9);
                border-radius: 8px;
                padding: 15px;
                z-index: 30;
                backdrop-filter: blur(10px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                font-size: 13px;
                display: none;
                max-width: 300px;
              }
              
              .stats-panel.visible {
                display: block;
              }
              
              .stats-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                padding-bottom: 8px;
              }
              
              .stats-panel h3 {
                margin-top: 0;
                margin-bottom: 15px;
                font-size: 14px;
                color: var(--highlight-color);
              }
              
              .stats-label {
                color: rgba(255,255,255,0.7);
              }
              
              .stats-value {
                font-weight: 500;
              }
              
              .screenshot-notification {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(-100px);
                background: var(--success-color);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                z-index: 100;
                transition: transform 0.5s ease;
                display: flex;
                align-items: center;
                gap: 10px;
              }
              
              .screenshot-notification.visible {
                transform: translateX(-50%) translateY(0);
              }
              
              .hotkeys-panel {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(31, 41, 55, 0.95);
                border-radius: 12px;
                padding: 20px;
                z-index: 40;
                backdrop-filter: blur(15px);
                box-shadow: 0 15px 40px rgba(0,0,0,0.5);
                font-size: 14px;
                display: none;
                width: 400px;
                max-width: 90%;
              }
              
              .hotkeys-panel.visible {
                display: block;
              }
              
              .hotkeys-panel h3 {
                margin-top: 0;
                margin-bottom: 20px;
                font-size: 18px;
                color: white;
                text-align: center;
                border-bottom: 1px solid rgba(255,255,255,0.2);
                padding-bottom: 10px;
              }
              
              .hotkeys-panel .close-btn {
                position: absolute;
                top: 15px;
                right: 15px;
                background: transparent;
                border: none;
                color: rgba(255,255,255,0.7);
                cursor: pointer;
                font-size: 16px;
              }
              
              .hotkeys-panel .close-btn:hover {
                color: white;
              }
              
              .hotkey-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
              }
              
              .hotkey-keys {
                font-family: monospace;
                background: rgba(255,255,255,0.1);
                padding: 3px 8px;
                border-radius: 4px;
                font-size: 12px;
              }
              
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7); }
                70% { box-shadow: 0 0 0 15px rgba(139, 92, 246, 0); }
                100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
              }
              
              @keyframes fadeUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              
              .premium-tag {
                position: absolute;
                top: 20px;
                left: 20px;
                background: linear-gradient(135deg, #ff9966, #ff5e62);
                color: white;
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(255, 94, 98, 0.5);
                z-index: 6;
                animation: pulse 2s infinite;
              }
              
              .cinema-mode-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.95);
                z-index: -1;
                opacity: 0;
                transition: opacity 0.5s ease;
              }
              
              .cinema-mode-active .cinema-mode-overlay {
                opacity: 1;
                z-index: 4;
              }
              
              .cinema-mode-active .player-container {
                max-width: 90vw;
                z-index: 5;
              }
            </style>
          </head>
          <body>
            <div class="cinema-mode-overlay"></div>
            <div class="player-container">
              <div class="premium-tag">PREMIUM</div>
            
              <div class="advanced-controls">
                <div class="player-branding">
                  <div class="player-logo">W</div>
                  <div class="player-title">WovIeX Premium Player</div>
                </div>
                <div class="feature-buttons">
                  <button class="feature-button" id="statsToggle" title="Show Stream Stats">
                    <i class="fas fa-chart-bar"></i>
                  </button>
                  <button class="feature-button" id="screenshotBtn" title="Take Screenshot">
                    <i class="fas fa-camera"></i>
                  </button>
                  <button class="feature-button" id="cinemaMode" title="Cinema Mode">
                    <i class="fas fa-film"></i>
                  </button>
                  <button class="feature-button" id="showHotkeys" title="Keyboard Shortcuts">
                    <i class="fas fa-keyboard"></i>
                  </button>
                </div>
              </div>
              
              <div class="loading">
                <div class="loading-spinner"></div>
                <span id="loading-text">Loading secure stream...</span>
              </div>
              
              <div class="watermark">
                <i class="fas fa-shield-alt"></i> WovIeX Premium
              </div>
              
              <div class="player-info">
                <div class="stream-info">
                  <div class="stream-quality" id="current-quality">Auto</div>
                  <div class="time-info" id="current-time">00:00 / 00:00</div>
                </div>
              </div>
              
              <video id="player" crossorigin playsinline controls></video>
              
              <div class="stats-panel" id="statsPanel">
                <h3>Stream Statistics</h3>
                <div class="stats-row">
                  <span class="stats-label">Resolution:</span>
                  <span class="stats-value" id="resolution">-</span>
                </div>
                <div class="stats-row">
                  <span class="stats-label">Bitrate:</span>
                  <span class="stats-value" id="bitrate">-</span>
                </div>
                <div class="stats-row">
                  <span class="stats-label">Buffer:</span>
                  <span class="stats-value" id="buffer">-</span>
                </div>
                <div class="stats-row">
                  <span class="stats-label">Frame rate:</span>
                  <span class="stats-value" id="framerate">-</span>
                </div>
                <div class="stats-row">
                  <span class="stats-label">Dropped frames:</span>
                  <span class="stats-value" id="dropped">-</span>
                </div>
              </div>
              
              <div class="hotkeys-panel" id="hotkeysPanel">
                <h3>Keyboard Shortcuts</h3>
                <button class="close-btn" id="closeHotkeys">×</button>
                <div class="hotkey-row">
                  <span>Play/Pause</span>
                  <span class="hotkey-keys">Space</span>
                </div>
                <div class="hotkey-row">
                  <span>Forward 10s</span>
                  <span class="hotkey-keys">→</span>
                </div>
                <div class="hotkey-row">
                  <span>Backward 10s</span>
                  <span class="hotkey-keys">←</span>
                </div>
                <div class="hotkey-row">
                  <span>Volume Up</span>
                  <span class="hotkey-keys">↑</span>
                </div>
                <div class="hotkey-row">
                  <span>Volume Down</span>
                  <span class="hotkey-keys">↓</span>
                </div>
                <div class="hotkey-row">
                  <span>Mute/Unmute</span>
                  <span class="hotkey-keys">M</span>
                </div>
                <div class="hotkey-row">
                  <span>Fullscreen</span>
                  <span class="hotkey-keys">F</span>
                </div>
                <div class="hotkey-row">
                  <span>Cinema Mode</span>
                  <span class="hotkey-keys">C</span>
                </div>
                <div class="hotkey-row">
                  <span>Screenshot</span>
                  <span class="hotkey-keys">S</span>
                </div>
                <div class="hotkey-row">
                  <span>Toggle Stats</span>
                  <span class="hotkey-keys">I</span>
                </div>
              </div>
              
              <div class="screenshot-notification" id="screenshotNotification">
                <i class="fas fa-check-circle"></i> Screenshot saved to your downloads
              </div>
            </div>
            
            <script src="https://cdn.plyr.io/3.7.8/plyr.polyfilled.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
            
            <script>
              document.addEventListener('DOMContentLoaded', function() {
                const source = '${streamUrl}';
                const video = document.getElementById('player');
                const loading = document.querySelector('.loading');
                const loadingText = document.getElementById('loading-text');
                const statsPanel = document.getElementById('statsPanel');
                const statsToggle = document.getElementById('statsToggle');
                const screenshotBtn = document.getElementById('screenshotBtn');
                const screenshotNotification = document.getElementById('screenshotNotification');
                const hotkeysPanel = document.getElementById('hotkeysPanel');
                const showHotkeys = document.getElementById('showHotkeys');
                const closeHotkeys = document.getElementById('closeHotkeys');
                const cinemaMode = document.getElementById('cinemaMode');
                const currentQuality = document.getElementById('current-quality');
                const currentTime = document.getElementById('current-time');
                const body = document.body;
                
                let player;
                let statsInterval;
                
                // Enhanced player options
                const defaultOptions = {
                  speed: { selected: 1, options: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
                  quality: { default: 'auto' },
                  controls: [
                    'play-large', 'play', 'progress', 'current-time', 'duration',
                    'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
                  ],
                  seekTime: 10,
                  keyboard: { focused: true, global: true },
                  tooltips: { controls: true, seek: true },
                  captions: { active: true, update: true },
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
                    enterFullscreen: 'Fullscreen',
                    exitFullscreen: 'Exit Fullscreen',
                    speed: 'Speed',
                    normal: 'Normal',
                    quality: 'Quality',
                    loop: 'Loop'
                  }
                };
                
                // Toggle stats panel
                function toggleStats() {
                  statsPanel.classList.toggle('visible');
                  statsToggle.classList.toggle('active');
                  
                  if (statsPanel.classList.contains('visible')) {
                    startStatsUpdates();
                  } else {
                    clearInterval(statsInterval);
                  }
                }
                
                // Start periodic stats updates
                function startStatsUpdates() {
                  if (statsInterval) clearInterval(statsInterval);
                  
                  statsInterval = setInterval(() => {
                    if (!window.hls) return;
                    
                    // Update statistics
                    const hls = window.hls;
                    const videoEl = player.elements.original;
                    
                    // Get current quality level
                    const currentLevel = hls.currentLevel >= 0 ? hls.levels[hls.currentLevel] : null;
                    const autoQuality = hls.currentLevel === -1;
                    const loadedLevel = hls.levels[hls.loadLevel] || null;
                    
                    // Update stats
                    document.getElementById('resolution').textContent = currentLevel ? 
                      \`\${currentLevel.width}×\${currentLevel.height}\` : 
                      (loadedLevel ? \`\${loadedLevel.width}×\${loadedLevel.height} (Auto)\` : '-');
                    
                    document.getElementById('bitrate').textContent = currentLevel ? 
                      \`\${(currentLevel.bitrate / 1000000).toFixed(2)} Mbps\` : '-';
                    
                    const bufferLength = videoEl.buffered.length > 0 ? 
                      videoEl.buffered.end(videoEl.buffered.length - 1) - videoEl.currentTime : 0;
                    document.getElementById('buffer').textContent = \`\${bufferLength.toFixed(1)}s\`;
                    
                    // Get framerate if available
                    const framerate = currentLevel && currentLevel.attrs && currentLevel.attrs.FRAME_RATE ? 
                      currentLevel.attrs.FRAME_RATE : '-';
                    document.getElementById('framerate').textContent = framerate;
                    
                    // Dropped frames (estimate)
                    if (videoEl.webkitDroppedFrameCount !== undefined) {
                      document.getElementById('dropped').textContent = 
                        \`\${videoEl.webkitDroppedFrameCount} (\${((videoEl.webkitDroppedFrameCount / videoEl.webkitDecodedFrameCount) * 100).toFixed(1)}%)\`;
                    } else {
                      document.getElementById('dropped').textContent = 'Not available';
                    }
                    
                    // Update quality indicator in player info
                    if (autoQuality) {
                      currentQuality.textContent = "Auto";
                    } else if (currentLevel) {
                      currentQuality.textContent = \`\${currentLevel.height}p\`;
                    }
                    
                  }, 1000);
                }
                
                // Take screenshot function
                function takeScreenshot() {
                  const canvas = document.createElement('canvas');
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  
                  try {
                    const link = document.createElement('a');
                    link.download = \`wovlex-screenshot-\${new Date().getTime()}.jpg\`;
                    link.href = canvas.toDataURL('image/jpeg', 0.8);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Show notification
                    screenshotNotification.classList.add('visible');
                    setTimeout(() => {
                      screenshotNotification.classList.remove('visible');
                    }, 3000);
                  } catch (e) {
                    console.error("Screenshot error:", e);
                  }
                }
                
                // Toggle cinema mode
                function toggleCinemaMode() {
                  body.classList.toggle('cinema-mode-active');
                  cinemaMode.classList.toggle('active');
                }
                
                // Update time display
                function updateTimeDisplay() {
                  if (!video || !player) return;
                  
                  const formatTime = (seconds) => {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return \`\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;
                  };
                  
                  const current = formatTime(video.currentTime);
                  const total = formatTime(video.duration || 0);
                  
                  currentTime.textContent = \`\${current} / \${total}\`;
                }
                
                // Setup event listeners
                statsToggle.addEventListener('click', toggleStats);
                screenshotBtn.addEventListener('click', takeScreenshot);
                showHotkeys.addEventListener('click', () => {
                  hotkeysPanel.classList.add('visible');
                });
                closeHotkeys.addEventListener('click', () => {
                  hotkeysPanel.classList.remove('visible');
                });
                cinemaMode.addEventListener('click', toggleCinemaMode);
                
                // Global keyboard shortcuts
                document.addEventListener('keydown', (e) => {
                  if (document.activeElement === document.body) {
                    // S key - Screenshot
                    if (e.key === 's' || e.key === 'S') {
                      takeScreenshot();
                    }
                    
                    // I key - Stats
                    if (e.key === 'i' || e.key === 'I') {
                      toggleStats();
                    }
                    
                    // C key - Cinema mode
                    if (e.key === 'c' || e.key === 'C') {
                      toggleCinemaMode();
                    }
                    
                    // H key - Hotkeys panel
                    if (e.key === 'h' || e.key === 'H') {
                      hotkeysPanel.classList.toggle('visible');
                    }
                  }
                });
                
                // If HLS.js is supported
                if (Hls.isSupported()) {
                  const hls = new Hls({
                    maxBufferLength: 60,
                    maxMaxBufferLength: 120,
                    enableWorker: true,
                  });
                  
                  // Make HLS instance globally available for stats
                  window.hls = hls;
                  
                  hls.loadSource(source);
                  hls.attachMedia(video);
                  
                  // Handle HLS events
                  hls.on(Hls.Events.MANIFEST_LOADED, function() {
                    loadingText.textContent = "Stream manifest loaded, parsing quality levels...";
                  });
                  
                  // From the m3u8 playlist, try to detect if quality options are available
                  hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                    console.log("HLS manifest parsed successfully");
                    loadingText.textContent = "Starting playback...";
                    
                    // Add fadeout animation
                    setTimeout(() => {
                      loading.style.opacity = '0';
                      setTimeout(() => {
                        loading.style.display = 'none';
                      }, 400);
                    }, 500);
                    
                    // Initialize player
                    player = new Plyr(video, defaultOptions);
                    
                    // Track player time updates
                    player.on('timeupdate', updateTimeDisplay);
                    
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
                            currentQuality.textContent = "Auto";
                          } else {
                            hls.currentLevel = quality;
                            const level = hls.levels[quality];
                            if (level) {
                              currentQuality.textContent = \`\${level.height}p\`;
                            }
                          }
                        }
                      };
                      
                      // Set quality in player
                      player.quality = 'auto';
                    }
                    
                    // Start video automatically with a slight delay
                    setTimeout(() => {
                      video.play().catch(err => {
                        console.warn("Autoplay prevented:", err);
                      });
                    }, 1000);
                  });
                  
                  // Handle errors
                  hls.on(Hls.Events.ERROR, function(event, data) {
                    loading.style.display = 'block';
                    loading.style.opacity = '1';
                    
                    if (data.fatal) {
                      loadingText.innerHTML = \`Error loading stream: \${data.type === Hls.ErrorTypes.NETWORK_ERROR ? 
                        'Network issue - check your connection' : 
                        'Media error - stream may be invalid or expired'}\`;
                      
                      console.error('Fatal HLS error:', data);
                    } else {
                      console.warn('Non-fatal HLS error:', data);
                    }
                  });
                  
                  // Recovery from non-fatal errors
                  hls.on(Hls.Events.LEVEL_LOADED, function() {
                    if (loading.style.display === 'block') {
                      loading.style.opacity = '0';
                      setTimeout(() => {
                        loading.style.display = 'none';
                      }, 400);
                    }
                  });
                  
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                  // Native HLS support (Safari)
                  video.src = source;
                  player = new Plyr(video, defaultOptions);
                  
                  // Track player time updates
                  player.on('timeupdate', updateTimeDisplay);
                  
                  video.addEventListener('loadedmetadata', function() {
                    loading.style.opacity = '0';
                    setTimeout(() => {
                      loading.style.display = 'none';
                    }, 400);
                    
                    // Start video automatically with a slight delay
                    setTimeout(() => {
                      video.play().catch(err => {
                        console.warn("Autoplay prevented:", err);
                      });
                    }, 1000);
                  });
                  
                  video.addEventListener('error', function() {
                    loading.style.display = 'block';
                    loading.style.opacity = '1';
                    loadingText.textContent = 'Error loading stream. The URL may be invalid or expired.';
                  });
                } else {
                  loadingText.textContent = 'Your browser does not support HLS playback.';
                }
              });
            </script>
          </body>
          </html>
        `);
      } catch (error) {
        console.error("Error decoding secure player token:", error);
        // Try to get more details about the error
        const errorDetails = error instanceof Error ? error.message : 'Unknown error';
        console.error("Error details:", errorDetails);
        
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
                <p style="font-size: 12px; margin-top: 15px; color: #666;">Error: ${errorDetails}</p>
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
