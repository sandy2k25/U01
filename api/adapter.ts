import express from 'express';
import type { Request, Response } from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../server/routes';

// Create the Express application
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Initialize Express app with routes
let initialized = false;
let routesRegistered = false;

async function initializeApp() {
  if (!initialized) {
    try {
      // Create a server for route registration
      const server = createServer(app);
      
      // Register routes
      await registerRoutes(app);
      routesRegistered = true;
      
      initialized = true;
      console.log('Server initialized for Vercel deployment');
    } catch (error) {
      console.error('Failed to initialize server:', error);
      throw error;
    }
  }
  
  return app;
}

// Handler for Vercel serverless function
export default async function handler(req: Request, res: Response) {
  try {
    const expressApp = await initializeApp();
    
    // Handle the request with the Express app
    expressApp(req, res);
  } catch (error) {
    console.error('Error in serverless function:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}