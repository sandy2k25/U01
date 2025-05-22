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
              <title>Error - WovIe Player</title>
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
            <title>WovIe Player</title>
            <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&family=Russo+One&display=swap" rel="stylesheet">
            <!-- Google Cast SDK -->
            <script type="text/javascript" src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"></script>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              
              :root {
                --primary-color: #6d28d9;
                --secondary-color: #4f46e5;
                --highlight-color: #8b5cf6;
                --dark-color: #1f2937;
                --light-color: #f3f4f6;
                --success-color: #10b981;
                --danger-color: #ef4444;
                --info-color: #3b82f6;
                --logo-background: linear-gradient(135deg, #8b5cf6, #6d28d9);
                --logo-shadow: 0 8px 32px rgba(109, 40, 217, 0.4);
              }
              
              body { 
                background-color: var(--dark-color); 
                font-family: 'Poppins', sans-serif;
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
                cursor: none;
              }
              
              .player-container:hover {
                cursor: default;
              }
              
              .advanced-controls {
                position: absolute;
                top: 0;
                right: 0;
                display: flex;
                justify-content: flex-end;
                padding: 15px 20px;
                background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
                z-index: 10;
                opacity: 0;
                transition: opacity 0.5s ease;
                pointer-events: none;
              }
              
              .player-container.controls-visible .advanced-controls,
              .player-container.controls-visible .player-info,
              .player-container.controls-visible .custom-controls,
              .player-container.controls-visible .volume-container,
              .player-container.controls-visible .fullscreen-btn,
              .player-container.controls-visible .settings-container,
              .player-container.controls-visible .custom-progress-container,
              .player-container.controls-visible .additional-controls {
                opacity: 1;
                pointer-events: auto;
              }

              .feature-buttons {
                display: flex;
                gap: 10px;
                pointer-events: auto;
              }
              
              /* Audio visualization effect */
              .audio-visualizer {
                position: absolute;
                bottom: 70px;
                left: 20px;
                height: 40px;
                width: 120px;
                display: flex;
                align-items: flex-end;
                gap: 2px;
                z-index: 5;
                opacity: 0;
                transition: opacity 0.5s ease;
              }
              
              .player-container.controls-visible .audio-visualizer {
                opacity: 0.7;
              }
              
              .audio-bar {
                width: 4px;
                background: linear-gradient(to top, var(--primary-color), var(--highlight-color));
                border-radius: 2px;
                transition: height 0.1s ease;
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
              
              video {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }
              
              /* Additional controls for new features - Redesigned for better layout */
              .additional-controls {
                position: absolute;
                top: 60px; /* Moved down below the premium tag and other top controls */
                right: 20px;
                padding: 10px 0;
                z-index: 10;
                display: flex;
                gap: 10px;
                opacity: 0;
                transition: opacity 0.5s ease;
                pointer-events: none;
              }
              
              /* Animated progress bar */
              .custom-progress-container {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 20px;
                background: transparent;
                z-index: 10;
                opacity: 0;
                transition: opacity 0.5s ease;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
              }
              
              .custom-progress-bar {
                width: 95%;
                height: 5px;
                background: rgba(255,255,255,0.2);
                border-radius: 2.5px;
                overflow: hidden;
                position: relative;
                pointer-events: auto;
              }
              
              .progress-fill {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, 
                  rgba(139, 92, 246, 0.7) 0%, 
                  rgba(139, 92, 246, 1) 100%);
                position: absolute;
                top: 0;
                left: 0;
                transition: width 0.1s linear;
              }
              
              .progress-hover {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 0;
                background: rgba(255, 255, 255, 0.2);
                transform-origin: left;
                transform: scaleX(0);
                transition: transform 0.1s ease;
              }
              
              .progress-handle {
                position: absolute;
                top: 50%;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: var(--highlight-color);
                transform: translate(-50%, -50%) scale(0);
                transition: transform 0.1s ease;
                left: 0%;
                z-index: 2;
                box-shadow: 0 0 5px rgba(0,0,0,0.5);
              }
              
              .player-container.controls-visible .custom-progress-container:hover .progress-handle {
                transform: translate(-50%, -50%) scale(1);
              }
              
              .player-container.controls-visible .custom-progress-container:hover .custom-progress-bar {
                height: 8px;
              }
              
              .buffered-bar {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background: rgba(255, 255, 255, 0.1);
                width: 0%;
              }
              
              /* Enhanced play button with animation */
              .plyr__control--overlaid {
                background: rgba(109, 40, 217, 0.9);
                padding: 25px;
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
                            box-shadow 0.3s ease,
                            background-color 0.3s ease;
                animation: pulse 2s infinite;
              }
              
              .plyr__control--overlaid:hover {
                background: rgba(109, 40, 217, 1);
                transform: scale(1.15) rotate(5deg);
                box-shadow: 0 0 30px rgba(109, 40, 217, 0.7);
                animation: none;
              }
              
              .plyr__control--overlaid:active {
                transform: scale(0.95);
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
                0% { transform: translateY(0px) rotate(0deg) scale(1); }
                25% { transform: translateY(-5px) rotate(2deg) scale(1.03); }
                75% { transform: translateY(3px) rotate(-2deg) scale(0.97); }
                100% { transform: translateY(0px) rotate(0deg) scale(1); }
              }
              
              @keyframes glow {
                0% { filter: drop-shadow(0 0 5px rgba(139, 92, 246, 0.5)); }
                50% { filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.8)); }
                100% { filter: drop-shadow(0 0 5px rgba(139, 92, 246, 0.5)); }
              }
              
              .player-info {
                position: absolute;
                bottom: 20px;
                left: 0;
                right: 0;
                padding: 10px 20px;
                z-index: 5;
                opacity: 0;
                transition: opacity 0.5s ease;
                display: flex;
                justify-content: space-between;
                align-items: center;
                pointer-events: none;
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
              
              @keyframes fadeUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              
              /* Interactive ripple effect */
              @keyframes ripple {
                0% { transform: scale(0); opacity: 1; }
                100% { transform: scale(3); opacity: 0; }
              }
              
              .ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(139, 92, 246, 0.4);
                transform: scale(0);
                animation: ripple 1s ease-out;
                pointer-events: none;
              }
              
              /* Play/Pause transition effect */
              @keyframes playPauseWave {
                0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.3); }
                100% { box-shadow: 0 0 0 20px rgba(255, 255, 255, 0); }
              }
              
              /* Animated premium badge */
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
                backdrop-filter: blur(4px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                transform-origin: left center;
                opacity: 0;
                transition: opacity 0.5s ease;
                letter-spacing: 0.5px;
              }
              
              .player-container.controls-visible .premium-tag {
                opacity: 1;
              }
              
              .premium-tag:hover {
                animation: pulse 1s infinite, wiggle 1s ease-in-out;
                transform: scale(1.05);
              }
              
              @keyframes wiggle {
                0%, 100% { transform: rotate(0); }
                25% { transform: rotate(5deg) scale(1.05); }
                75% { transform: rotate(-5deg) scale(1.05); }
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
              
              /* Custom control buttons to ensure they work properly */
              .custom-controls {
                position: absolute;
                bottom: 30px;
                left: 0;
                right: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 20px;
                z-index: 15;
                opacity: 0;
                transition: opacity 0.5s ease;
                pointer-events: none;
              }
              
              .control-btn {
                background: rgba(0,0,0,0.6);
                border: none;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                pointer-events: auto;
              }
              
              .control-btn:hover {
                background: rgba(109, 40, 217, 0.8);
                transform: scale(1.1);
              }
              
              .play-btn {
                width: 60px;
                height: 60px;
                background: rgba(109, 40, 217, 0.8);
                animation: pulse 2s infinite;
              }
              
              /* Settings menu - Redesigned for a modern look */
              .settings-container {
                position: absolute;
                bottom: 40px;
                right: 20px;
                z-index: 15;
                opacity: 0;
                transition: opacity 0.5s ease;
                pointer-events: none;
              }
              
              .player-container.controls-visible .settings-container {
                opacity: 1;
                pointer-events: auto;
              }
              
              .settings-btn {
                background: rgba(31, 41, 55, 0.8);
                border: none;
                border-radius: 50%;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                backdrop-filter: blur(4px);
                border: 1px solid rgba(255,255,255,0.1);
              }
              
              .settings-btn:hover {
                background: rgba(109, 40, 217, 0.8);
                transform: translateY(-3px);
                box-shadow: 0 6px 18px rgba(109, 40, 217, 0.3);
              }
              
              .settings-menu {
                position: absolute;
                bottom: 55px;
                right: 0;
                background: rgba(31, 41, 55, 0.95);
                border-radius: 12px;
                width: 260px;
                padding: 15px 0;
                backdrop-filter: blur(10px);
                box-shadow: 0 15px 25px rgba(0,0,0,0.4);
                display: none;
                transform-origin: bottom right;
                transform: scale(0.95);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease;
                opacity: 0;
                max-height: 80vh;
                z-index: 100; /* Ensure settings menu has high z-index */
                overflow-y: auto;
                border: 1px solid rgba(255,255,255,0.1);
              }
              
              .settings-menu.visible {
                display: block;
                transform: scale(1);
                opacity: 1;
              }
              
              .settings-menu h4 {
                margin: 0;
                padding: 12px 20px;
                font-size: 15px;
                font-weight: 600;
                color: white;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                letter-spacing: 0.5px;
              }
              
              .settings-option {
                padding: 12px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                transition: background-color 0.2s ease, transform 0.2s ease;
                color: rgba(255,255,255,0.9);
              }
              
              .settings-option:hover {
                background: rgba(255,255,255,0.1);
                transform: translateX(5px);
              }
              
              .settings-option.active {
                background: rgba(139, 92, 246, 0.2);
                color: var(--highlight-color);
              }
              
              .settings-option span {
                font-size: 14px;
              }
              
              .settings-feature {
                padding: 12px 20px;
                display: flex;
                align-items: center;
                cursor: pointer;
                transition: all 0.2s ease;
                color: rgba(255,255,255,0.9);
                border-left: 3px solid transparent;
              }
              
              .settings-feature:hover {
                background: rgba(255,255,255,0.1);
                border-left: 3px solid var(--highlight-color);
                padding-left: 25px;
              }
              
              .settings-feature i {
                margin-right: 12px;
                width: 20px;
                height: 20px;
                text-align: center;
                font-size: 16px;
                color: rgba(255,255,255,0.7);
              }
              
              .settings-feature span {
                font-size: 14px;
                flex-grow: 1;
              }
              
              .settings-feature.active {
                color: var(--highlight-color);
                background: rgba(139, 92, 246, 0.1);
                border-left: 3px solid var(--highlight-color);
              }
              
              /* Enhanced PIP feature styling */
              #featurePip {
                position: relative;
                background: rgba(139, 92, 246, 0.15);
              }
              
              #featurePip:after {
                content: '';
                position: absolute;
                right: 15px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: var(--highlight-color);
                animation: pulse 2s infinite;
              }
              
              .feature-badge {
                background-color: var(--highlight-color);
                color: white;
                border-radius: 4px;
                padding: 2px 6px;
                font-size: 12px;
                font-weight: bold;
                margin-left: auto;
                box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
              }
              
              .settings-feature.active i {
                color: var(--highlight-color);
              }
              
              .submenu-icon {
                margin-left: 5px;
                opacity: 0.7;
                font-size: 12px;
              }
              
              .volume-container {
                position: absolute;
                bottom: 40px;
                left: 20px;
                z-index: 15;
                opacity: 0;
                transition: opacity 0.5s ease;
                display: flex;
                align-items: center;
                gap: 10px;
                pointer-events: none;
              }
              
              .player-container:hover .volume-container {
                opacity: 1;
              }
              
              .volume-btn {
                background: rgba(0,0,0,0.6);
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                pointer-events: auto;
              }
              
              .volume-btn:hover {
                background: rgba(109, 40, 217, 0.8);
                transform: scale(1.1);
              }
              
              .volume-slider {
                width: 0;
                height: 5px;
                background: rgba(255,255,255,0.2);
                border-radius: 2.5px;
                position: relative;
                overflow: hidden;
                transition: width 0.3s ease;
                pointer-events: auto;
              }
              
              .player-container.controls-visible .volume-container:hover .volume-slider {
                width: 80px;
              }
              
              .volume-level {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background: var(--highlight-color);
                width: 100%;
                transform-origin: left;
                transform: scaleX(0.75); /* Default 75% volume */
              }
              
              .fullscreen-btn {
                position: absolute;
                bottom: 40px;
                right: 70px;
                background: rgba(0,0,0,0.6);
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                z-index: 15;
                opacity: 0;
                pointer-events: none;
              }
              
              .player-container:hover .fullscreen-btn {
                opacity: 1;
              }
              
              .fullscreen-btn:hover {
                background: rgba(109, 40, 217, 0.8);
                transform: scale(1.1);
              }
              
              /* Time preview on progress bar hover */
              .time-preview {
                position: absolute;
                bottom: 15px;
                background: rgba(31, 41, 55, 0.9);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s ease;
                transform: translateX(-50%);
                z-index: 11;
              }
              
              .player-container.controls-visible .custom-progress-container:hover .time-preview {
                opacity: 1;
              }
              
              /* Cast button styles */
              #castButton {
                color: white;
              }
              
              #castButton.connected {
                color: var(--highlight-color);
              }
              
              /* PiP button styles */
              .pip-btn {
                background: rgba(0,0,0,0.6);
                border-radius: 50%;
                color: white;
              }
              
              .pip-btn.active {
                color: var(--highlight-color);
              }
              
              /* Landscape button styles */
              .landscape-btn {
                background: rgba(0,0,0,0.6);
                border-radius: 50%;
                color: white;
              }
              
              .landscape-active .landscape-btn {
                color: var(--highlight-color);
              }
              
              /* Toast notification for features */
              .toast-notification {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                background: rgba(31, 41, 55, 0.9);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                z-index: 100;
                transition: transform 0.5s ease;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
              }
              
              .toast-notification.visible {
                transform: translateX(-50%) translateY(0);
              }
              
              /* Quality selector - Redesigned and repositioned */
              .quality-selector {
                position: absolute;
                top: 70px; /* Moved below the premium tag */
                right: 20px;
                z-index: 16; /* Higher z-index to ensure visibility */
                opacity: 0;
                transition: opacity 0.5s ease;
                pointer-events: none;
                display: flex;
                align-items: center;
                gap: 10px;
              }
              
              .player-container.controls-visible .quality-selector {
                opacity: 1;
                pointer-events: auto;
              }
              
              .quality-button {
                background: rgba(0,0,0,0.7);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 14px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                backdrop-filter: blur(4px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
              }
              
              .quality-button:hover {
                background: rgba(109, 40, 217, 0.8);
                transform: translateY(-2px);
              }
              
              .quality-dropdown {
                position: absolute;
                top: 45px;
                right: 0;
                background: rgba(31, 41, 55, 0.95);
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                display: none;
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
              }
              
              .quality-dropdown.visible {
                display: block;
                opacity: 1;
                transform: translateY(0);
              }
              
              .quality-option {
                padding: 8px 16px;
                min-width: 100px;
                cursor: pointer;
                transition: background 0.2s ease;
                white-space: nowrap;
                display: flex;
                align-items: center;
                justify-content: space-between;
              }
              
              .quality-option:hover {
                background: rgba(255,255,255,0.1);
              }
              
              .quality-option.active {
                background: rgba(139, 92, 246, 0.2);
                color: var(--highlight-color);
              }
              
              /* Fullscreen mode in landscape */
              @media screen and (max-width: 768px) {
                .player-container.landscape-active {
                  max-width: 100%;
                  width: 100%;
                  height: 100vh;
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  border-radius: 0;
                  aspect-ratio: unset;
                }
              }
            </style>
          </head>
          <body>
            <div class="cinema-mode-overlay"></div>
            <div class="player-container" id="playerContainer">
              <div class="premium-tag">WovIe PREMIUM</div>
              
              <!-- Quality selector in the player UI -->
              <div class="quality-selector">
                <button class="quality-button" id="qualityButton">
                  <i class="fas fa-cog"></i> <span id="currentQualityText">Auto</span>
                </button>
                <div class="quality-dropdown" id="qualityDropdown">
                  <div class="quality-option active" data-quality="auto">
                    <span>Auto</span>
                    <i class="fas fa-check"></i>
                  </div>
                  <!-- Quality options will be added dynamically -->
                </div>
              </div>
              
              <!-- Additional Controls for newer features -->
              <div class="additional-controls">
                <button class="feature-button" id="castButton" title="Cast to TV">
                  <i class="fas fa-cast"></i>
                </button>
                <button class="feature-button pip-btn" id="pipButton" title="Picture-in-Picture">
                  <i class="fas fa-clone"></i>
                </button>
                <button class="feature-button landscape-btn" id="landscapeButton" title="Landscape Mode">
                  <i class="fas fa-mobile-alt"></i>
                </button>
              </div>
              
              <!-- Advanced Controls with improved layout -->
              <div class="control-panel">
                <div class="control-panel-inner">
                  <button class="control-panel-button" id="statsToggle" title="Show Stream Stats">
                    <i class="fas fa-chart-bar"></i>
                  </button>
                  <button class="control-panel-button" id="screenshotBtn" title="Take Screenshot">
                    <i class="fas fa-camera"></i>
                  </button>
                  <button class="control-panel-button" id="cinemaMode" title="Cinema Mode">
                    <i class="fas fa-film"></i>
                  </button>
                  <button class="control-panel-button" id="showHotkeys" title="Keyboard Shortcuts">
                    <i class="fas fa-keyboard"></i>
                  </button>
                </div>
              </div>
              
              <div class="audio-visualizer" id="audioVisualizer">
                <!-- Audio bars will be added dynamically -->
              </div>
              
              <!-- Custom controls that work properly -->
              <div class="custom-controls" id="customControls">
                <button class="control-btn" id="rewindBtn">
                  <i class="fas fa-backward fa-lg"></i>
                </button>
                <button class="control-btn play-btn" id="playBtn">
                  <i class="fas fa-play fa-lg" id="playIcon"></i>
                </button>
                <button class="control-btn" id="forwardBtn">
                  <i class="fas fa-forward fa-lg"></i>
                </button>
              </div>
              
              <!-- Volume control -->
              <div class="volume-container">
                <button class="volume-btn" id="volumeBtn">
                  <i class="fas fa-volume-up" id="volumeIcon"></i>
                </button>
                <div class="volume-slider" id="volumeSlider">
                  <div class="volume-level" id="volumeLevel"></div>
                </div>
              </div>
              
              <!-- Fullscreen button -->
              <div class="fullscreen-btn" id="fullscreenBtn">
                <i class="fas fa-expand" id="fullscreenIcon"></i>
              </div>
              
              <!-- Settings menu with all features included -->
              <div class="settings-container">
                <button class="settings-btn" id="settingsBtn">
                  <i class="fas fa-cog"></i>
                </button>
                <div class="settings-menu" id="settingsMenu">
                  <!-- Features section -->
                  <h4>Features</h4>
                  <div class="settings-feature" id="featureCast">
                    <i class="fas fa-cast"></i>
                    <span>Cast to TV</span>
                  </div>
                  <div class="settings-feature" id="featurePip">
                    <i class="fas fa-clone"></i>
                    <span>Picture-in-Picture</span>
                    <span class="feature-badge">P</span>
                  </div>
                  <div class="settings-feature" id="featureLandscape">
                    <i class="fas fa-mobile-alt"></i>
                    <span>Landscape Mode</span>
                  </div>
                  <div class="settings-feature" id="featureCinema">
                    <i class="fas fa-film"></i>
                    <span>Cinema Mode</span>
                  </div>
                  <div class="settings-feature" id="featureScreenshot">
                    <i class="fas fa-camera"></i>
                    <span>Take Screenshot</span>
                  </div>
                  <div class="settings-feature" id="featureStats">
                    <i class="fas fa-chart-bar"></i>
                    <span>Show Statistics</span>
                  </div>
                  <div class="settings-feature" id="featureHotkeys">
                    <i class="fas fa-keyboard"></i>
                    <span>Keyboard Shortcuts</span>
                  </div>
                  
                  <!-- Playback speed section -->
                  <h4>Playback Speed</h4>
                  <div class="settings-option" data-speed="0.25">
                    <span>0.25x</span>
                  </div>
                  <div class="settings-option" data-speed="0.5">
                    <span>0.5x</span>
                  </div>
                  <div class="settings-option" data-speed="0.75">
                    <span>0.75x</span>
                  </div>
                  <div class="settings-option active" data-speed="1">
                    <span>1x (Normal)</span>
                    <i class="fas fa-check"></i>
                  </div>
                  <div class="settings-option" data-speed="1.25">
                    <span>1.25x</span>
                  </div>
                  <div class="settings-option" data-speed="1.5">
                    <span>1.5x</span>
                  </div>
                  <div class="settings-option" data-speed="1.75">
                    <span>1.75x</span>
                  </div>
                  <div class="settings-option" data-speed="2">
                    <span>2x</span>
                  </div>
                  
                  <!-- Quality section -->
                  <h4>Quality</h4>
                  <div class="settings-option active" data-quality="auto">
                    <span>Auto</span>
                    <i class="fas fa-check"></i>
                  </div>
                  <!-- Quality options will be added dynamically -->
                </div>
              </div>
              
              <!-- Custom progress bar -->
              <div class="custom-progress-container" id="customProgressContainer">
                <div class="custom-progress-bar" id="customProgressBar">
                  <div class="buffered-bar" id="bufferedBar"></div>
                  <div class="progress-fill" id="progressFill"></div>
                  <div class="progress-hover" id="progressHover"></div>
                  <div class="progress-handle" id="progressHandle"></div>
                </div>
                <div class="time-preview" id="timePreview">00:00</div>
              </div>
              
              <div class="loading">
                <div class="loading-spinner"></div>
                <span id="loading-text">Loading secure stream...</span>
              </div>
              
              <div class="player-info">
                <div class="stream-info">
                  <div class="stream-quality" id="current-quality">Auto</div>
                  <div class="time-info" id="current-time">00:00 / 00:00</div>
                </div>
              </div>
              
              <video id="player" crossorigin playsinline></video>
              
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
                <div class="hotkey-row">
                  <span>Picture-in-Picture</span>
                  <span class="hotkey-keys">P</span>
                </div>
              </div>
              
              <div class="screenshot-notification" id="screenshotNotification">
                <i class="fas fa-check-circle"></i> Screenshot saved to your downloads
              </div>
              
              <div class="toast-notification" id="toastNotification">
                <i class="fas fa-info-circle"></i> <span id="toastMessage"></span>
              </div>
            </div>
            
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
                const hotkeysPanel = document.getElementById('hotkeysPanel');
                const showHotkeys = document.getElementById('showHotkeys');
                const closeHotkeys = document.getElementById('closeHotkeys');
                const cinemaMode = document.getElementById('cinemaMode');
                const currentQuality = document.getElementById('current-quality');
                const currentTime = document.getElementById('current-time');
                const body = document.body;
                const playerContainer = document.getElementById('playerContainer');
                const toastNotification = document.getElementById('toastNotification');
                const toastMessage = document.getElementById('toastMessage');
                const screenshotNotification = document.getElementById('screenshotNotification');
                
                // Quality selector in player UI
                const qualityButton = document.getElementById('qualityButton');
                const currentQualityText = document.getElementById('currentQualityText');
                const qualityDropdown = document.getElementById('qualityDropdown');
                
                // Feature buttons (both in UI and settings menu)
                const castButton = document.getElementById('castButton');
                const pipButton = document.getElementById('pipButton');
                const landscapeButton = document.getElementById('landscapeButton');
                
                // Feature settings
                const featureCast = document.getElementById('featureCast');
                const featurePip = document.getElementById('featurePip');
                const featureLandscape = document.getElementById('featureLandscape');
                const featureCinema = document.getElementById('featureCinema');
                const featureScreenshot = document.getElementById('featureScreenshot');
                const featureStats = document.getElementById('featureStats');
                const featureHotkeys = document.getElementById('featureHotkeys');
                
                // Custom controls
                const playBtn = document.getElementById('playBtn');
                const playIcon = document.getElementById('playIcon');
                const rewindBtn = document.getElementById('rewindBtn');
                const forwardBtn = document.getElementById('forwardBtn');
                
                // Progress bar elements
                const customProgressContainer = document.getElementById('customProgressContainer');
                const customProgressBar = document.getElementById('customProgressBar');
                const progressFill = document.getElementById('progressFill');
                const progressHover = document.getElementById('progressHover');
                const progressHandle = document.getElementById('progressHandle');
                const timePreview = document.getElementById('timePreview');
                const bufferedBar = document.getElementById('bufferedBar');
                
                // Volume control
                const volumeBtn = document.getElementById('volumeBtn');
                const volumeIcon = document.getElementById('volumeIcon');
                const volumeSlider = document.getElementById('volumeSlider');
                const volumeLevel = document.getElementById('volumeLevel');
                
                // Fullscreen control
                const fullscreenBtn = document.getElementById('fullscreenBtn');
                const fullscreenIcon = document.getElementById('fullscreenIcon');
                
                // Settings
                const settingsBtn = document.getElementById('settingsBtn');
                const settingsMenu = document.getElementById('settingsMenu');
                
                let statsInterval;
                let isMuted = false;
                let volume = 0.75; // Default volume (75%)
                let isDragging = false;
                let controlsVisible = true;
                let controlsTimeout;
                let lastMouseMoveTime = Date.now();
                let isLandscapeMode = false;
                let castSession = null;
                
                // Show toast message
                function showToast(message, duration = 3000) {
                  toastMessage.textContent = message;
                  toastNotification.classList.add('visible');
                  
                  setTimeout(() => {
                    toastNotification.classList.remove('visible');
                  }, duration);
                }
                
                // Toggle quality dropdown
                qualityButton.addEventListener('click', function() {
                  qualityDropdown.classList.toggle('visible');
                  event.stopPropagation();
                });
                
                // Close quality dropdown when clicking elsewhere
                document.addEventListener('click', function() {
                  qualityDropdown.classList.remove('visible');
                });
                
                // Auto-hide controls functionality
                function showControls() {
                  playerContainer.classList.add('controls-visible');
                  controlsVisible = true;
                  document.body.style.cursor = 'default';
                  clearTimeout(controlsTimeout);
                  
                  // Set timeout to hide controls after inactivity
                  controlsTimeout = setTimeout(() => {
                    if (!video.paused) {
                      hideControls();
                    }
                  }, 3000); // Hide after 3 seconds of inactivity
                }
                
                function hideControls() {
                  // Don't hide if video is paused or settings menu is open
                  if (video.paused || settingsMenu.classList.contains('visible') ||
                      hotkeysPanel.classList.contains('visible') || 
                      statsPanel.classList.contains('visible') ||
                      qualityDropdown.classList.contains('visible')) {
                    return;
                  }
                  
                  playerContainer.classList.remove('controls-visible');
                  controlsVisible = false;
                  document.body.style.cursor = 'none';
                }
                
                // Setup mouse movement to show controls
                playerContainer.addEventListener('mousemove', function() {
                  lastMouseMoveTime = Date.now();
                  if (!controlsVisible) {
                    showControls();
                  } else {
                    // Reset the auto-hide timer
                    clearTimeout(controlsTimeout);
                    controlsTimeout = setTimeout(() => {
                      if (!video.paused) {
                        hideControls();
                      }
                    }, 3000);
                  }
                });
                
                // Show controls on mouse enter
                playerContainer.addEventListener('mouseenter', showControls);
                
                // Prevent hiding when over controls
                document.querySelectorAll('.control-btn, .feature-button, .volume-btn, .settings-btn, .fullscreen-btn, .quality-button').forEach(el => {
                  el.addEventListener('mouseenter', () => {
                    clearTimeout(controlsTimeout);
                  });
                });
                
                // Always show controls when video is paused
                video.addEventListener('pause', showControls);
                
                // Hide controls a few seconds after playing starts
                video.addEventListener('play', () => {
                  clearTimeout(controlsTimeout);
                  controlsTimeout = setTimeout(() => {
                    hideControls();
                  }, 3000);
                });
                
                // Implement feature: Chromecast
                function initializeCastApi() {
                  if (!window.chrome || !window.chrome.cast || !window.chrome.cast.isAvailable) {
                    setTimeout(initializeCastApi, 1000);
                    return;
                  }
                  
                  const applicationID = chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;
                  const sessionRequest = new chrome.cast.SessionRequest(applicationID);
                  const apiConfig = new chrome.cast.ApiConfig(
                    sessionRequest,
                    sessionListener,
                    receiverListener
                  );
                  
                  chrome.cast.initialize(apiConfig, onInitSuccess, onInitError);
                  
                  // Add click event to cast buttons (both in UI and settings)
                  [castButton, featureCast].forEach(btn => {
                    if (btn) {
                      btn.addEventListener('click', function(e) {
                        if (e) createRipple(e);
                        if (castSession) {
                          // If already casting, stop casting
                          castSession.stop();
                          castSession = null;
                          castButton.classList.remove('active');
                          featureCast.classList.remove('active');
                          showToast('Disconnected from Chromecast');
                        } else {
                          // Start casting
                          chrome.cast.requestSession(
                            function(session) {
                              onRequestSessionSuccess(session);
                            },
                            onRequestSessionError
                          );
                        }
                        showControls();
                      });
                    }
                  });
                }
                
                function sessionListener(session) {
                  castSession = session;
                  castButton.classList.add('active');
                  featureCast.classList.add('active');
                  
                  if (session.media.length) {
                    onMediaDiscovered('onRequestSessionSuccess', session.media[0]);
                  }
                }
                
                function receiverListener(availability) {
                  if (availability === chrome.cast.ReceiverAvailability.AVAILABLE) {
                    castButton.style.display = 'flex';
                    featureCast.style.display = 'flex';
                  } else {
                    castButton.style.display = 'none';
                    featureCast.style.display = 'none';
                  }
                }
                
                function onInitSuccess() {
                  console.log('Cast API initialized successfully');
                }
                
                function onInitError(error) {
                  console.error('Cast API initialization error:', error);
                  castButton.style.display = 'none';
                  featureCast.style.display = 'none';
                }
                
                function onRequestSessionSuccess(session) {
                  castSession = session;
                  castButton.classList.add('active');
                  featureCast.classList.add('active');
                  
                  const mediaInfo = new chrome.cast.media.MediaInfo(source, 'application/x-mpegURL');
                  const request = new chrome.cast.media.LoadRequest(mediaInfo);
                  
                  castSession.loadMedia(request, 
                    function(media) {
                      console.log('Cast media loaded successfully');
                      showToast('Connected to Chromecast');
                      
                      // Pause local playback
                      if (!video.paused) {
                        video.pause();
                      }
                      
                      media.addUpdateListener(function(isAlive) {
                        if (!isAlive) {
                          // If media session is dead, reset casting UI
                          castSession = null;
                          castButton.classList.remove('active');
                          featureCast.classList.remove('active');
                        }
                      });
                    }, 
                    function(error) {
                      console.error('Cast media load error:', error);
                      showToast('Failed to connect to Chromecast');
                      castSession = null;
                      castButton.classList.remove('active');
                      featureCast.classList.remove('active');
                    }
                  );
                }
                
                function onRequestSessionError(error) {
                  console.error('Cast session request error:', error);
                  showToast('Chromecast connection failed');
                }
                
                function onMediaDiscovered(how, media) {
                  // Store the media for later control
                  currentMedia = media;
                }
                
                // Implement feature: Picture-in-Picture
                function setupPictureInPicture() {
                  // Check if Picture-in-Picture is supported
                  if (document.pictureInPictureEnabled || 
                      (video.webkitSupportsPresentationMode && typeof video.webkitSetPresentationMode === 'function')) {
                    pipButton.style.display = 'flex';
                    featurePip.style.display = 'flex';
                    
                    // Set up both UI and settings click handlers
                    [pipButton, featurePip].forEach(btn => {
                      if (btn) {
                        btn.addEventListener('click', function(e) {
                          if (e) createRipple(e);
                          togglePictureInPicture();
                          showControls();
                        });
                      }
                    });
                    
                    // Also add keyboard shortcut for PiP (p key)
                    document.addEventListener('keydown', function(e) {
                      if (e.key === 'p' || e.key === 'P') {
                        if (document.activeElement === document.body) {
                          togglePictureInPicture();
                          showControls();
                        }
                      }
                    });
                    
                    // Update active state when entering/exiting PiP mode
                    video.addEventListener('enterpictureinpicture', function() {
                      pipButton.classList.add('active');
                      featurePip.classList.add('active');
                    });
                    
                    video.addEventListener('leavepictureinpicture', function() {
                      pipButton.classList.remove('active');
                      featurePip.classList.remove('active');
                    });
                  } else {
                    // Hide PiP button if not supported
                    pipButton.style.display = 'none';
                    featurePip.style.display = 'none';
                  }
                }
                
                function togglePictureInPicture() {
                  try {
                    // Close settings menu when activating PiP to prevent overlap
                    const settingsMenu = document.getElementById('settingsMenu');
                    if (settingsMenu && settingsMenu.classList.contains('visible')) {
                      settingsMenu.classList.remove('visible');
                    }
                    
                    if (document.pictureInPictureElement) {
                      // Exit Picture-in-Picture mode
                      document.exitPictureInPicture()
                        .then(() => {
                          showToast('Exited Picture-in-Picture mode');
                          pipButton.classList.remove('active');
                          featurePip.classList.remove('active');
                        })
                        .catch(error => {
                          console.error('Error exiting Picture-in-Picture mode:', error);
                          showToast('Failed to exit Picture-in-Picture mode');
                        });
                    } else if (video.webkitSupportsPresentationMode && 
                              typeof video.webkitSetPresentationMode === 'function') {
                      // Safari specific implementation
                      video.webkitSetPresentationMode(
                        video.webkitPresentationMode === 'picture-in-picture' ? 
                          'inline' : 'picture-in-picture'
                      );
                      
                      if (video.webkitPresentationMode === 'picture-in-picture') {
                        pipButton.classList.add('active');
                        featurePip.classList.add('active');
                        showToast('Entered Picture-in-Picture mode');
                      } else {
                        pipButton.classList.remove('active');
                        featurePip.classList.remove('active');
                        showToast('Exited Picture-in-Picture mode');
                      }
                    } else if (document.pictureInPictureEnabled) {
                      // Standard implementation for other browsers
                      video.requestPictureInPicture()
                        .then(() => {
                          pipButton.classList.add('active');
                          featurePip.classList.add('active');
                          showToast('Entered Picture-in-Picture mode');
                        })
                        .catch(error => {
                          console.error('Error entering Picture-in-Picture mode:', error);
                          showToast('Failed to enter Picture-in-Picture mode');
                        });
                    } else {
                      showToast('Picture-in-Picture mode not supported in this browser');
                    }
                  } catch (error) {
                    console.error('PiP error:', error);
                    showToast('Picture-in-Picture error: ' + error.message);
                  }
                }
                
                // Implement feature: Landscape Mode
                function setupLandscapeMode() {
                  // Set up click handlers for both UI and settings buttons
                  [landscapeButton, featureLandscape].forEach(btn => {
                    if (btn) {
                      btn.addEventListener('click', function(e) {
                        if (e) createRipple(e);
                        toggleLandscapeMode();
                        showControls();
                      });
                    }
                  });
                  
                  // Manual implementation for landscape mode
                  function toggleLandscapeMode() {
                    if (isLandscapeMode) {
                      // Exit landscape mode
                      playerContainer.classList.remove('landscape-active');
                      landscapeButton.classList.remove('active');
                      featureLandscape.classList.remove('active');
                      document.body.style.overflow = '';
                      
                      // Exit fullscreen if we're in it
                      if (document.fullscreenElement) {
                        document.exitFullscreen().catch(err => {
                          console.error("Error exiting fullscreen:", err);
                        });
                      }
                      
                      isLandscapeMode = false;
                      showToast('Exited landscape mode');
                      
                    } else {
                      // Enter landscape mode
                      playerContainer.classList.add('landscape-active');
                      landscapeButton.classList.add('active');
                      featureLandscape.classList.add('active');
                      document.body.style.overflow = 'hidden';
                      
                      // Request fullscreen for better landscape experience
                      if (playerContainer.requestFullscreen) {
                        playerContainer.requestFullscreen().catch(err => {
                          // Fullscreen may be rejected on some devices without user gesture
                          console.warn("Fullscreen request was rejected:", err);
                        });
                      }
                      
                      isLandscapeMode = true;
                      showToast('Entered landscape mode');
                      
                      // Try to force orientation on mobile - this will likely fail without permission,
                      // but we'll handle it gracefully 
                      if (screen.orientation && typeof screen.orientation.lock === 'function') {
                        screen.orientation.lock('landscape').catch(err => {
                          console.warn("Screen orientation lock failed:", err);
                          // Don't show this error to user as we have a fallback with CSS
                        });
                      }
                    }
                  }
                  
                  // Listen for orientation changes
                  if (window.matchMedia) {
                    const mediaQuery = window.matchMedia("(orientation: landscape)");
                    
                    const handleOrientationChange = (e) => {
                      if (e.matches) {
                        // Landscape orientation detected
                        if (isLandscapeMode) {
                          // Already in landscape mode - do nothing
                        } else {
                          // Auto enable landscape mode
                          if (document.fullscreenElement) {
                            // Only auto-enable if we're in fullscreen
                            isLandscapeMode = true;
                            playerContainer.classList.add('landscape-active');
                            landscapeButton.classList.add('active');
                            featureLandscape.classList.add('active');
                          }
                        }
                      } else {
                        // Portrait orientation detected
                        if (isLandscapeMode) {
                          // Auto disable landscape mode
                          playerContainer.classList.remove('landscape-active');
                          landscapeButton.classList.remove('active');
                          featureLandscape.classList.remove('active');
                          isLandscapeMode = false;
                        }
                      }
                    };
                    
                    // Add listener for orientation change
                    mediaQuery.addEventListener("change", handleOrientationChange);
                    
                    // Check initial orientation
                    handleOrientationChange(mediaQuery);
                  }
                  
                  // Handle fullscreen change events
                  document.addEventListener('fullscreenchange', function() {
                    if (document.fullscreenElement) {
                      fullscreenIcon.className = 'fas fa-compress';
                    } else {
                      fullscreenIcon.className = 'fas fa-expand';
                      if (isLandscapeMode) {
                        // If exiting fullscreen while in landscape mode, exit landscape mode too
                        playerContainer.classList.remove('landscape-active');
                        landscapeButton.classList.remove('active');
                        featureLandscape.classList.remove('active');
                        document.body.style.overflow = '';
                        isLandscapeMode = false;
                      }
                    }
                    showControls();
                  });
                }
                
                // Implement feature: Cinema Mode
                function setupCinemaMode() {
                  // Set up click handlers for both UI and settings buttons
                  [cinemaMode, featureCinema].forEach(btn => {
                    if (btn) {
                      btn.addEventListener('click', function(e) {
                        if (e) createRipple(e);
                        toggleCinemaMode();
                        showControls();
                      });
                    }
                  });
                  
                  // Also add keyboard shortcut for cinema mode (c key)
                  document.addEventListener('keydown', function(e) {
                    if (e.key === 'c' || e.key === 'C') {
                      if (document.activeElement === document.body) {
                        toggleCinemaMode();
                        showControls();
                      }
                    }
                  });
                }
                
                // Toggle cinema mode
                function toggleCinemaMode() {
                  body.classList.toggle('cinema-mode-active');
                  cinemaMode.classList.toggle('active');
                  featureCinema.classList.toggle('active');
                  
                  if (body.classList.contains('cinema-mode-active')) {
                    showToast('Entered Cinema Mode');
                  } else {
                    showToast('Exited Cinema Mode');
                  }
                  
                  // Reset inactivity timer
                  showControls();
                }
                
                // Implement feature: Screenshot
                function setupScreenshot() {
                  // Set up click handlers for both UI and settings buttons
                  [screenshotBtn, featureScreenshot].forEach(btn => {
                    if (btn) {
                      btn.addEventListener('click', function(e) {
                        if (e) createRipple(e);
                        takeScreenshot();
                        showControls();
                      });
                    }
                  });
                  
                  // Also add keyboard shortcut for screenshot (s key)
                  document.addEventListener('keydown', function(e) {
                    if (e.key === 's' || e.key === 'S') {
                      if (document.activeElement === document.body) {
                        takeScreenshot();
                        showControls();
                      }
                    }
                  });
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
                    link.download = \`wovie-screenshot-\${new Date().getTime()}.jpg\`;
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
                  
                  // Reset inactivity timer
                  showControls();
                }
                
                // Implement feature: Stats
                function setupStats() {
                  // Set up click handlers for both UI and settings buttons
                  [statsToggle, featureStats].forEach(btn => {
                    if (btn) {
                      btn.addEventListener('click', function(e) {
                        if (e) createRipple(e);
                        toggleStats();
                        showControls();
                      });
                    }
                  });
                  
                  // Also add keyboard shortcut for stats (i key)
                  document.addEventListener('keydown', function(e) {
                    if (e.key === 'i' || e.key === 'I') {
                      if (document.activeElement === document.body) {
                        toggleStats();
                        showControls();
                      }
                    }
                  });
                }
                
                // Toggle stats panel
                function toggleStats() {
                  statsPanel.classList.toggle('visible');
                  statsToggle.classList.toggle('active');
                  featureStats.classList.toggle('active');
                  
                  if (statsPanel.classList.contains('visible')) {
                    startStatsUpdates();
                    showToast('Stream Statistics Enabled');
                    showControls(); // Keep controls visible when stats are shown
                  } else {
                    clearInterval(statsInterval);
                    showToast('Stream Statistics Disabled');
                    
                    // Hide controls if should be hidden
                    if (!video.paused && Date.now() - lastMouseMoveTime > 3000) {
                      hideControls();
                    }
                  }
                }
                
                // Implement feature: Keyboard Shortcuts
                function setupHotkeys() {
                  // Set up click handlers for both UI and settings buttons
                  [showHotkeys, featureHotkeys].forEach(btn => {
                    if (btn) {
                      btn.addEventListener('click', function(e) {
                        if (e) createRipple(e);
                        hotkeysPanel.classList.add('visible');
                        showControls();
                        clearTimeout(controlsTimeout); // Prevent auto-hide
                      });
                    }
                  });
                  
                  closeHotkeys.addEventListener('click', function(e) {
                    if (e) createRipple(e);
                    hotkeysPanel.classList.remove('visible');
                    showControls();
                    
                    // Start hide timer if video is playing
                    if (!video.paused) {
                      clearTimeout(controlsTimeout);
                      controlsTimeout = setTimeout(() => {
                        hideControls();
                      }, 3000);
                    }
                  });
                }
                
                // Start periodic stats updates
                function startStatsUpdates() {
                  if (statsInterval) clearInterval(statsInterval);
                  
                  statsInterval = setInterval(() => {
                    if (!window.hls) return;
                    
                    // Update statistics
                    const hls = window.hls;
                    const videoEl = video;
                    
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
                
                // Update buffered progress
                function updateBufferedProgress() {
                  if (!video || video.buffered.length === 0) return;
                  
                  const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                  const duration = video.duration;
                  const bufferedPercent = (bufferedEnd / duration) * 100;
                  
                  bufferedBar.style.width = \`\${bufferedPercent}%\`;
                }
                
                // Update progress bar
                function updateProgressBar() {
                  if (!video || isNaN(video.duration)) return;
                  const progress = (video.currentTime / video.duration) * 100;
                  progressFill.style.width = \`\${progress}%\`;
                  progressHandle.style.left = \`\${progress}%\`;
                  
                  // Update buffered progress too
                  updateBufferedProgress();
                }
                
                // Format time (seconds to MM:SS)
                function formatTime(seconds) {
                  if (isNaN(seconds)) return "00:00";
                  
                  seconds = Math.max(0, seconds);
                  const minutes = Math.floor(seconds / 60);
                  seconds = Math.floor(seconds % 60);
                  return \`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
                }
                
                // Handle progress bar interactions
                function setupProgressBar() {
                  // Click on progress bar to seek
                  customProgressBar.addEventListener('click', function(e) {
                    if (!video || isNaN(video.duration)) return;
                    
                    const rect = this.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    video.currentTime = pos * video.duration;
                    updateProgressBar();
                    
                    // Reset inactivity timer
                    showControls();
                  });
                  
                  // Show hover effect and time preview
                  customProgressContainer.addEventListener('mousemove', function(e) {
                    if (!video || isNaN(video.duration)) return;
                    
                    const rect = customProgressBar.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    
                    progressHover.style.transform = \`scaleX(\${pos})\`;
                    
                    const previewTime = pos * video.duration;
                    timePreview.textContent = formatTime(previewTime);
                    timePreview.style.left = \`\${pos * 100}%\`;
                    
                    // If dragging, update video time
                    if (isDragging) {
                      video.currentTime = previewTime;
                      updateProgressBar();
                    }
                    
                    // Reset inactivity timer
                    showControls();
                  });
                  
                  // Handle mouse down for drag-to-seek
                  customProgressContainer.addEventListener('mousedown', function(e) {
                    if (!video || isNaN(video.duration)) return;
                    isDragging = true;
                    
                    // Add event listeners for drag
                    document.addEventListener('mousemove', handleDrag);
                    document.addEventListener('mouseup', handleDragEnd);
                    
                    // Initial seek
                    const rect = customProgressBar.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    video.currentTime = pos * video.duration;
                    updateProgressBar();
                    
                    // Reset inactivity timer
                    showControls();
                  });
                  
                  function handleDrag(e) {
                    if (!isDragging || !video || isNaN(video.duration)) return;
                    
                    const rect = customProgressBar.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    
                    // Update time preview
                    timePreview.textContent = formatTime(pos * video.duration);
                    timePreview.style.left = \`\${pos * 100}%\`;
                    
                    // Update progress
                    progressFill.style.width = \`\${pos * 100}%\`;
                    progressHandle.style.left = \`\${pos * 100}%\`;
                    
                    // Reset inactivity timer
                    lastMouseMoveTime = Date.now();
                  }
                  
                  function handleDragEnd(e) {
                    if (!isDragging) return;
                    
                    const rect = customProgressBar.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    
                    // Set video time
                    if (!isNaN(video.duration)) {
                      video.currentTime = pos * video.duration;
                    }
                    
                    // End dragging
                    isDragging = false;
                    document.removeEventListener('mousemove', handleDrag);
                    document.removeEventListener('mouseup', handleDragEnd);
                    
                    // Reset inactivity timer
                    lastMouseMoveTime = Date.now();
                    showControls();
                  }
                  
                  // Hide hover effect when mouse leaves
                  customProgressContainer.addEventListener('mouseleave', function() {
                    progressHover.style.transform = 'scaleX(0)';
                  });
                }
                
                // Toggle settings menu
                function toggleSettingsMenu() {
                  const wasVisible = settingsMenu.classList.contains('visible');
                  settingsMenu.classList.toggle('visible');
                  
                  // Always show controls when settings menu is open
                  if (settingsMenu.classList.contains('visible')) {
                    showControls();
                    clearTimeout(controlsTimeout); // Prevent auto-hide
                  } else if (wasVisible && !video.paused) {
                    // Start the hide timer when closing settings
                    clearTimeout(controlsTimeout);
                    controlsTimeout = setTimeout(() => {
                      hideControls();
                    }, 3000);
                  }
                }
                
                // Toggle fullscreen
                function toggleFullscreen() {
                  const container = document.querySelector('.player-container');
                  
                  if (!document.fullscreenElement) {
                    if (container.requestFullscreen) {
                      container.requestFullscreen();
                    } else if (container.webkitRequestFullscreen) {
                      container.webkitRequestFullscreen();
                    } else if (container.mozRequestFullScreen) {
                      container.mozRequestFullScreen();
                    } else if (container.msRequestFullscreen) {
                      container.msRequestFullscreen();
                    }
                    fullscreenIcon.className = 'fas fa-compress';
                  } else {
                    if (document.exitFullscreen) {
                      document.exitFullscreen();
                    } else if (document.webkitExitFullscreen) {
                      document.webkitExitFullscreen();
                    } else if (document.mozCancelFullScreen) {
                      document.mozCancelFullScreen();
                    } else if (document.msExitFullscreen) {
                      document.msExitFullscreen();
                    }
                    fullscreenIcon.className = 'fas fa-expand';
                  }
                  
                  // Reset inactivity timer
                  showControls();
                }
                
                // Update time display
                function updateTimeDisplay() {
                  if (!video || isNaN(video.duration)) return;
                  
                  const current = formatTime(video.currentTime);
                  const total = formatTime(video.duration);
                  
                  currentTime.textContent = \`\${current} / \${total}\`;
                  
                  // Update progress bar
                  updateProgressBar();
                }
                
                // Toggle mute
                function toggleMute() {
                  if (video.muted) {
                    video.muted = false;
                    volumeIcon.className = volume > 0.5 ? 'fas fa-volume-up' : 'fas fa-volume-down';
                    volumeLevel.style.transform = \`scaleX(\${volume})\`;
                  } else {
                    video.muted = true;
                    volumeIcon.className = 'fas fa-volume-mute';
                    volumeLevel.style.transform = 'scaleX(0)';
                  }
                  isMuted = video.muted;
                  
                  // Reset inactivity timer
                  showControls();
                }
                
                // Set volume
                function setVolume(vol) {
                  volume = Math.max(0, Math.min(1, vol));
                  video.volume = volume;
                  volumeLevel.style.transform = \`scaleX(\${volume})\`;
                  
                  // Update icon based on volume level
                  if (volume === 0) {
                    volumeIcon.className = 'fas fa-volume-mute';
                    video.muted = true;
                    isMuted = true;
                  } else {
                    video.muted = false;
                    isMuted = false;
                    if (volume < 0.3) {
                      volumeIcon.className = 'fas fa-volume-off';
                    } else if (volume < 0.7) {
                      volumeIcon.className = 'fas fa-volume-down';
                    } else {
                      volumeIcon.className = 'fas fa-volume-up';
                    }
                  }
                  
                  // Reset inactivity timer
                  showControls();
                }
                
                // Change playback speed
                function setPlaybackSpeed(speed) {
                  video.playbackRate = speed;
                  showToast(\`Playback speed set to \${speed}x\`);
                  
                  // Create a data object to store current player settings
                  const playerSettings = {
                    playbackSpeed: speed,
                    quality: currentQualityText ? currentQualityText.textContent : 'Auto'
                  };
                  
                  // Store settings in localStorage for download and persistence
                  try {
                    localStorage.setItem('woviePlayerSettings', JSON.stringify(playerSettings));
                  } catch (e) {
                    console.warn('Could not save settings to localStorage', e);
                  }
                  
                  // Update UI
                  document.querySelectorAll('.settings-option[data-speed]').forEach(option => {
                    option.classList.remove('active');
                    option.querySelector('i')?.remove();
                  });
                  
                  const activeOption = document.querySelector(\`.settings-option[data-speed="\${speed}"]\`);
                  if (activeOption) {
                    activeOption.classList.add('active');
                    if (!activeOption.querySelector('i')) {
                      const checkIcon = document.createElement('i');
                      checkIcon.className = 'fas fa-check';
                      activeOption.appendChild(checkIcon);
                    }
                  }
                  
                  // Reset inactivity timer
                  showControls();
                }
                
                // Change quality level
                function setQualityLevel(level) {
                  if (!window.hls) return;
                  
                  const hls = window.hls;
                  let qualityText = 'Auto';
                  
                  if (level === 'auto') {
                    hls.currentLevel = -1;
                    currentQualityText.textContent = 'Auto';
                    showToast('Automatic quality selection enabled');
                  } else {
                    const levelIndex = parseInt(level);
                    hls.currentLevel = levelIndex;
                    
                    if (hls.levels[levelIndex]) {
                      const height = hls.levels[levelIndex].height;
                      qualityText = \`\${height}p\`;
                      currentQualityText.textContent = qualityText;
                      showToast(\`Quality set to \${height}p\`);
                    }
                  }
                  
                  // Read current playback speed to synchronize settings
                  let currentSpeed = video.playbackRate;
                  
                  // Create a data object to store current player settings
                  const playerSettings = {
                    playbackSpeed: currentSpeed,
                    quality: qualityText
                  };
                  
                  // Store settings in localStorage for download and persistence
                  try {
                    localStorage.setItem('woviePlayerSettings', JSON.stringify(playerSettings));
                  } catch (e) {
                    console.warn('Could not save settings to localStorage', e);
                  }
                  
                  // Update both UIs
                  updateQualityUI(level);
                  
                  // Close dropdown
                  qualityDropdown.classList.remove('visible');
                }
                
                // Update quality selection UI
                function updateQualityUI(level) {
                  // Update main quality selector
                  document.querySelectorAll('.quality-option').forEach(option => {
                    option.classList.remove('active');
                    const check = option.querySelector('i');
                    if (check) option.removeChild(check);
                  });
                  
                  const activeOption = document.querySelector(\`.quality-option[data-quality="\${level}"]\`);
                  if (activeOption) {
                    activeOption.classList.add('active');
                    if (!activeOption.querySelector('i')) {
                      const check = document.createElement('i');
                      check.className = 'fas fa-check';
                      activeOption.appendChild(check);
                    }
                  }
                  
                  // Update settings menu quality
                  document.querySelectorAll('.settings-option[data-quality]').forEach(option => {
                    option.classList.remove('active');
                    const check = option.querySelector('i');
                    if (check) option.removeChild(check);
                  });
                  
                  const activeSettingOption = document.querySelector(\`.settings-option[data-quality="\${level}"]\`);
                  if (activeSettingOption) {
                    activeSettingOption.classList.add('active');
                    if (!activeSettingOption.querySelector('i')) {
                      const check = document.createElement('i');
                      check.className = 'fas fa-check';
                      activeSettingOption.appendChild(check);
                    }
                  }
                }
                
                // Add ripple effect on click
                function createRipple(event) {
                  const button = event.currentTarget;
                  
                  // Remove any existing ripples
                  const ripples = button.getElementsByClassName("ripple");
                  while (ripples.length > 0) {
                    ripples[0].remove();
                  }
                  
                  // Create new ripple
                  const circle = document.createElement("span");
                  const diameter = Math.max(button.clientWidth, button.clientHeight);
                  
                  circle.style.width = circle.style.height = \`\${diameter}px\`;
                  circle.style.left = \`\${event.offsetX - diameter / 2}px\`;
                  circle.style.top = \`\${event.offsetY - diameter / 2}px\`;
                  circle.classList.add("ripple");
                  
                  button.appendChild(circle);
                  
                  // Auto remove after animation completes
                  setTimeout(() => {
                    if (circle && circle.parentNode) {
                      circle.parentNode.removeChild(circle);
                    }
                  }, 1000);
                }
                
                // Audio visualization function
                function addAudioVisualization() {
                  const visualizer = document.getElementById('audioVisualizer');
                  if (!visualizer || !video) return;
                  
                  // Create audio bars
                  const numBars = 20;
                  for (let i = 0; i < numBars; i++) {
                    const bar = document.createElement('div');
                    bar.className = 'audio-bar';
                    bar.style.height = '0px';
                    visualizer.appendChild(bar);
                  }
                  
                  const audioBars = visualizer.querySelectorAll('.audio-bar');
                  
                  // Function to animate bars based on video playback
                  function animateBars() {
                    if (!video.paused) {
                      // Generate random heights for the bars to simulate audio visualization
                      audioBars.forEach(bar => {
                        const height = Math.floor(Math.random() * 35) + 5;
                        bar.style.height = \`\${height}px\`;
                      });
                    }
                    
                    // Request next animation frame
                    if (!video.paused) {
                      requestAnimationFrame(animateBars);
                    }
                  }
                  
                  // Start animation when playing, stop when paused
                  video.addEventListener('play', () => {
                    requestAnimationFrame(animateBars);
                  });
                  
                  video.addEventListener('pause', () => {
                    // Reset bar heights when paused
                    audioBars.forEach(bar => {
                      bar.style.height = '3px';
                    });
                  });
                }
                
                // Setup custom controls
                function setupCustomControls() {
                  // Update play button icon based on play state
                  function updatePlayButton() {
                    if (video.paused) {
                      playIcon.className = 'fas fa-play fa-lg';
                    } else {
                      playIcon.className = 'fas fa-pause fa-lg';
                    }
                  }
                  
                  // Play/Pause toggle
                  playBtn.addEventListener('click', function(e) {
                    createRipple(e);
                    if (video.paused) {
                      video.play();
                    } else {
                      video.pause();
                    }
                    updatePlayButton();
                    showControls();
                  });
                  
                  // Rewind 10 seconds
                  rewindBtn.addEventListener('click', function(e) {
                    createRipple(e);
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    showControls();
                  });
                  
                  // Forward 10 seconds
                  forwardBtn.addEventListener('click', function(e) {
                    createRipple(e);
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    showControls();
                  });
                  
                  // Update button state on play/pause
                  video.addEventListener('play', updatePlayButton);
                  video.addEventListener('pause', updatePlayButton);
                  
                  // Volume button
                  volumeBtn.addEventListener('click', function(e) {
                    createRipple(e);
                    toggleMute();
                    showControls();
                  });
                  
                  // Volume slider interaction
                  volumeSlider.addEventListener('click', function(e) {
                    const rect = this.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    setVolume(pos);
                    showControls();
                  });
                  
                  // Fullscreen button
                  fullscreenBtn.addEventListener('click', function(e) {
                    createRipple(e);
                    toggleFullscreen();
                    showControls();
                  });
                  
                  // Settings button
                  settingsBtn.addEventListener('click', function(e) {
                    createRipple(e);
                    toggleSettingsMenu();
                    showControls();
                  });
                  
                  // Monitor fullscreen changes
                  document.addEventListener('fullscreenchange', function() {
                    if (document.fullscreenElement) {
                      fullscreenIcon.className = 'fas fa-compress';
                    } else {
                      fullscreenIcon.className = 'fas fa-expand';
                    }
                    showControls();
                  });
                  
                  // Setup settings menu playback speed options
                  document.querySelectorAll('.settings-option[data-speed]').forEach(option => {
                    option.addEventListener('click', function() {
                      const speed = parseFloat(this.getAttribute('data-speed'));
                      setPlaybackSpeed(speed);
                      toggleSettingsMenu();
                      showControls();
                    });
                  });
                  
                  // Setup progress bar
                  setupProgressBar();
                  
                  // Initial show controls
                  showControls();
                }
                
                // Close settings when clicking outside
                document.addEventListener('click', function(e) {
                  if (settingsMenu.classList.contains('visible')) {
                    if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) {
                      settingsMenu.classList.remove('visible');
                      
                      // Start hide timer if video is playing
                      if (!video.paused) {
                        clearTimeout(controlsTimeout);
                        controlsTimeout = setTimeout(() => {
                          hideControls();
                        }, 3000);
                      }
                    }
                  }
                });
                
                // Video container click for play/pause toggle
                playerContainer.addEventListener('click', function(e) {
                  // Only toggle if clicked directly on the container (not on controls)
                  if (e.target === playerContainer || e.target === video) {
                    if (video.paused) {
                      video.play();
                    } else {
                      video.pause();
                    }
                  }
                });
                
                // Global keyboard shortcuts
                document.addEventListener('keydown', (e) => {
                  if (document.activeElement === document.body) {
                    // Show controls on any key press
                    showControls();
                    
                    // Space for play/pause
                    if (e.code === 'Space') {
                      e.preventDefault();
                      if (video && video.paused) {
                        video.play();
                      } else if (video) {
                        video.pause();
                      }
                    }
                    
                    // Right arrow for forward 10s
                    if (e.code === 'ArrowRight') {
                      e.preventDefault();
                      if (video) video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    }
                    
                    // Left arrow for backward 10s
                    if (e.code === 'ArrowLeft') {
                      e.preventDefault();
                      if (video) video.currentTime = Math.max(0, video.currentTime - 10);
                    }
                    
                    // Up arrow for volume up
                    if (e.code === 'ArrowUp') {
                      e.preventDefault();
                      setVolume(volume + 0.1);
                    }
                    
                    // Down arrow for volume down
                    if (e.code === 'ArrowDown') {
                      e.preventDefault();
                      setVolume(volume - 0.1);
                    }
                    
                    // M key for mute toggle
                    if (e.key === 'm' || e.key === 'M') {
                      toggleMute();
                    }
                    
                    // F key for fullscreen
                    if (e.key === 'f' || e.key === 'F') {
                      toggleFullscreen();
                    }
                  }
                });
                
                // Load player settings from localStorage for consistent download experience
                function loadSavedPlayerSettings() {
                  try {
                    const savedSettings = localStorage.getItem('woviePlayerSettings');
                    if (savedSettings) {
                      const settings = JSON.parse(savedSettings);
                      
                      // Apply saved playback speed if available
                      if (settings.playbackSpeed) {
                        setPlaybackSpeed(parseFloat(settings.playbackSpeed));
                      }
                      
                      // Note: Quality will be handled by HLS.js automatically based on bandwidth,
                      // but we'll store the user's preferred selection for download settings
                    }
                  } catch (e) {
                    console.warn('Could not load saved player settings', e);
                  }
                }
                
                // Initialize all features
                function initializeFeatures() {
                  // Initialize Chromecast if supported
                  if (window.chrome && window.chrome.cast) {
                    window.__onGCastApiAvailable = function(isAvailable) {
                      if (isAvailable) {
                        initializeCastApi();
                      }
                    };
                  } else {
                    // Hide cast button if not supported
                    castButton.style.display = 'none';
                    featureCast.style.display = 'none';
                  }
                  
                  // Initialize other features
                  setupPictureInPicture();
                  setupLandscapeMode();
                  setupCinemaMode();
                  setupScreenshot();
                  setupStats();
                  setupHotkeys();
                }
                
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
                  
                  // Setup video event listeners for time updates
                  video.addEventListener('timeupdate', updateTimeDisplay);
                  
                  // Setup seeking events for the progress bar
                  video.addEventListener('seeked', updateProgressBar);
                  video.addEventListener('progress', updateBufferedProgress);
                  
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
                    
                    // Setup custom controls
                    setupCustomControls();
                    
                    // Initialize features
                    initializeFeatures();
                    
                    // Initially show controls
                    showControls();
                    
                    // Add quality options to both UIs if multiple qualities are available
                    if (data.levels.length > 1) {
                      // Add quality options to the main quality dropdown
                      data.levels.forEach((level, index) => {
                        const option = document.createElement('div');
                        option.className = 'quality-option';
                        option.setAttribute('data-quality', index.toString());
                        
                        const label = document.createElement('span');
                        label.textContent = \`\${level.height}p\`;
                        option.appendChild(label);
                        
                        option.addEventListener('click', function() {
                          setQualityLevel(this.getAttribute('data-quality'));
                        });
                        
                        qualityDropdown.appendChild(option);
                      });
                      
                      // Add quality options to settings menu
                      const qualityContainer = document.querySelector('.settings-menu h4:last-child');
                      const qualityList = qualityContainer.parentNode;
                      
                      // Clear existing quality options (except Auto)
                      const autoOption = document.querySelector('.settings-option[data-quality="auto"]');
                      
                      // Add quality options
                      data.levels.forEach((level, index) => {
                        const option = document.createElement('div');
                        option.className = 'settings-option';
                        option.setAttribute('data-quality', index.toString());
                        
                        const label = document.createElement('span');
                        label.textContent = \`\${level.height}p\`;
                        option.appendChild(label);
                        
                        option.addEventListener('click', function() {
                          setQualityLevel(this.getAttribute('data-quality'));
                          toggleSettingsMenu();
                        });
                        
                        qualityList.appendChild(option);
                      });
                    } else {
                      // Hide quality selectors if only one quality is available
                      qualityButton.style.display = 'none';
                      document.querySelector('.settings-menu h4:last-child').style.display = 'none';
                      document.querySelector('.settings-option[data-quality="auto"]').style.display = 'none';
                    }
                    
                    // Add visual enhancements after player is initialized
                    setTimeout(() => {
                      // Add audio visualization effect
                      addAudioVisualization();
                    }, 1000);
                    
                    // Set initial volume
                    setVolume(volume);
                    
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
                  
                  // Setup custom controls
                  setupCustomControls();
                  
                  // Initialize features
                  initializeFeatures();
                  
                  // Setup video event listeners for time updates
                  video.addEventListener('timeupdate', updateTimeDisplay);
                  
                  // Setup seeking events for the progress bar
                  video.addEventListener('seeked', updateProgressBar);
                  video.addEventListener('progress', updateBufferedProgress);
                  
                  video.addEventListener('loadedmetadata', function() {
                    loading.style.opacity = '0';
                    setTimeout(() => {
                      loading.style.display = 'none';
                    }, 400);
                    
                    // Add visual enhancements
                    setTimeout(() => {
                      addAudioVisualization();
                    }, 1000);
                    
                    // Set initial volume
                    setVolume(volume);
                    
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
              <title>Error - WovIe Player</title>
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
  
  // Get all config (admin only)
  app.get("/api/admin/config", authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const config = await storage.getAllConfig();
      res.json({
        success: true,
        config
      });
    } catch (error) {
      console.error("Error getting config:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve config"
      });
    }
  });
  
  // Start Telegram bots (admin only)
  app.post("/api/admin/start-bots", authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const adminBotToken = await storage.getConfigByKey("adminBotToken");
      const userBotToken = await storage.getConfigByKey("userBotToken");
      
      // Start admin bot if token is available
      if (adminBotToken) {
        if (!adminTelegramBot) {
          adminTelegramBot = new AdminTelegramBot(adminBotToken, storage);
        }
        adminTelegramBot.start();
      }
      
      // Start user bot if token is available
      if (userBotToken) {
        if (!userTelegramBot) {
          userTelegramBot = new UserTelegramBot(userBotToken, storage);
        }
        userTelegramBot.start();
      }
      
      res.json({
        success: true,
        message: "Telegram bots started successfully",
        adminBotActive: !!adminBotToken,
        userBotActive: !!userBotToken
      });
    } catch (error) {
      console.error("Error starting Telegram bots:", error);
      res.status(500).json({
        success: false,
        error: "Failed to start Telegram bots"
      });
    }
  });
  
  // Update admin bot token (admin only)
  app.post("/api/admin/config/admin-bot", authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Token is required"
        });
      }
      
      // Stop existing bot if running
      if (adminTelegramBot) {
        adminTelegramBot.stop();
        adminTelegramBot = null;
      }
      
      // Save the new token
      await storage.setConfig("adminBotToken", token);
      
      // Create and start the new bot
      adminTelegramBot = new AdminTelegramBot(token, storage);
      adminTelegramBot.start();
      
      res.json({
        success: true,
        message: "Admin bot token updated and bot started"
      });
    } catch (error) {
      console.error("Error updating admin bot token:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update admin bot token"
      });
    }
  });
  
  // Update user bot token (admin only)
  app.post("/api/admin/config/user-bot", authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          error: "Token is required"
        });
      }
      
      // Stop existing bot if running
      if (userTelegramBot) {
        userTelegramBot.stop();
        userTelegramBot = null;
      }
      
      // Save the new token
      await storage.setConfig("userBotToken", token);
      
      // Create and start the new bot
      userTelegramBot = new UserTelegramBot(token, storage);
      userTelegramBot.start();
      
      res.json({
        success: true,
        message: "User bot token updated and bot started"
      });
    } catch (error) {
      console.error("Error updating user bot token:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user bot token"
      });
    }
  });
  
  // Verify admin password
  app.post("/api/admin/verify-password", async (req: Request, res: Response) => {
    try {
      const { password } = req.body;
      
      console.log("Admin password verification attempt");
      
      if (!password) {
        return res.status(400).json({
          success: false,
          error: "Password is required"
        });
      }
      
      // For simplicity, we're using a hardcoded admin password
      // In a real-world scenario, this should be stored securely and hashed
      const correctPassword = process.env.ADMIN_PASSWORD || "admin123";
      
      if (password === correctPassword) {
        return res.json({
          success: true,
          message: "Password verified successfully"
        });
      } else {
        return res.status(401).json({
          success: false,
          error: "Invalid password"
        });
      }
    } catch (error) {
      console.error("Error verifying admin password:", error);
      res.status(500).json({
        success: false,
        error: "Failed to verify admin password"
      });
    }
  });

  const server = createServer(app);
  return server;
}
