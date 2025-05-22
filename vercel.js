// This file adapts your Express app for Vercel deployment
const express = require('express');
const path = require('path');

// Import your routes
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic API routes for demo purposes
app.get('/api/config/extraction-url', (req, res) => {
  res.json({
    success: true,
    url: process.env.DEFAULT_EXTRACTION_URL || "https://oplij.koyeb.app/api/v1/getStream"
  });
});

app.get('/api/search-files', (req, res) => {
  res.json({
    success: true,
    results: []
  });
});

// Serve static files from the build directory
const staticPath = path.join(__dirname, 'dist/public');
app.use(express.static(staticPath));

// For all other routes, serve the index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Export for Vercel
module.exports = app;