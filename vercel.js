// Main entry point for Vercel serverless deployment
const express = require('express');
const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log middleware for debugging environment variables
app.use((req, res, next) => {
  console.log('Environment variables available:', {
    NODE_ENV: process.env.NODE_ENV,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY ? 'Set' : 'Not set',
    ADMIN_BOT_TOKEN: process.env.ADMIN_BOT_TOKEN ? 'Set' : 'Not set',
    USER_BOT_TOKEN: process.env.USER_BOT_TOKEN ? 'Set' : 'Not set',
    DEFAULT_EXTRACTION_URL: process.env.DEFAULT_EXTRACTION_URL
  });
  next();
});

// Simple authentication middleware
const authenticateAdmin = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized access"
    });
  }
  
  next();
};

// API Routes
app.get('/api/config/extraction-url', (req, res) => {
  res.json({
    success: true,
    url: process.env.DEFAULT_EXTRACTION_URL || "https://oplij.koyeb.app/api/v1/getStream"
  });
});

app.get('/api/search-files', (req, res) => {
  // Simplified implementation for Vercel
  const query = req.query.query || '';
  
  res.json({
    success: true,
    results: []
  });
});

app.get('/api/tmdb-to-imdb/:tmdbId', (req, res) => {
  const { tmdbId } = req.params;
  
  // Mock implementation
  res.json({
    success: true,
    imdbId: `tt${Math.floor(Math.random() * 10000000)}`,
    title: "Sample Movie Title",
    release_date: "2023-01-01"
  });
});

// Admin routes
app.post('/api/admin/verify-password', (req, res) => {
  const { password } = req.body;
  
  if (password === process.env.ADMIN_API_KEY) {
    res.json({
      success: true,
      apiKey: process.env.ADMIN_API_KEY
    });
  } else {
    res.status(401).json({
      success: false,
      error: "Invalid password"
    });
  }
});

app.get('/api/admin/config', authenticateAdmin, (req, res) => {
  res.json({
    success: true,
    config: {
      adminBotToken: process.env.ADMIN_BOT_TOKEN || "",
      userBotToken: process.env.USER_BOT_TOKEN || "",
      extractionUrl: process.env.DEFAULT_EXTRACTION_URL || "https://oplij.koyeb.app/api/v1/getStream"
    }
  });
});

app.post('/api/admin/config/extraction-url', authenticateAdmin, (req, res) => {
  const { url } = req.body;
  
  // In a real implementation, this would update a database
  // For Vercel, we'll just echo back as if it was updated
  res.json({
    success: true,
    message: "Extraction URL updated successfully",
    url: url
  });
});

// Handle secure player route
app.get('/secure-player', (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send(`
      <html>
        <head>
          <title>Error - Secure Player</title>
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
  
  // Simple player page for demo
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Secure Player</title>
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          background-color: #000; 
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .player-container {
          width: 100%;
          max-width: 1280px;
          aspect-ratio: 16/9;
        }
        video {
          width: 100%;
          height: 100%;
        }
      </style>
    </head>
    <body>
      <div class="player-container">
        <video id="player" controls>
          <source src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" type="application/x-mpegURL">
          Your browser does not support the video tag.
        </video>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const video = document.getElementById('player');
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
              video.play();
            });
          }
          else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
            video.addEventListener('loadedmetadata', function() {
              video.play();
            });
          }
        });
      </script>
    </body>
    </html>
  `);
});

// For static files and client-side routing
app.use(express.static('dist/public'));

// Catch-all route to serve the React SPA
app.get('*', (req, res) => {
  res.sendFile('dist/public/index.html', { root: '.' });
});

// Export for Vercel serverless
module.exports = app;