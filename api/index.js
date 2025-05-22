// Vercel serverless function handler
const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
app.use(express.json());

// Define API routes
app.get('/api/config/extraction-url', (req, res) => {
  res.json({
    success: true,
    url: process.env.DEFAULT_EXTRACTION_URL || "https://oplij.koyeb.app/api/v1/getStream"
  });
});

// Handle secure player route
app.get('/secure-player', (req, res) => {
  const staticPath = path.join(process.cwd(), 'dist/public');
  
  if (fs.existsSync(staticPath)) {
    res.sendFile(path.join(staticPath, 'index.html'));
  } else {
    res.status(404).send('Build files not found');
  }
});

// Serve static files (if available)
if (fs.existsSync(path.join(process.cwd(), 'dist/public'))) {
  app.use(express.static(path.join(process.cwd(), 'dist/public')));
  
  // Fallback to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist/public', 'index.html'));
  });
}

// Export the Express app for Vercel
module.exports = app;