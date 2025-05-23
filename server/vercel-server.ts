// This file is used for Vercel serverless deployment
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response } from 'express';
import { json } from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import { registerRoutes } from './routes';

// Create memory store for sessions
const MemoryStoreSession = MemoryStore(session);

// Create an express app
const app = express();

// Setup middleware
app.use(json());

// Setup session for authentication
app.use(
  session({
    cookie: { maxAge: 86400000 }, // 24 hours
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // Clear expired sessions
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || 'dev-secret-key'
  })
);

// Setup CORS for development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Register all routes and handlers
registerRoutes(app);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Server error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Create a handler for Vercel serverless deployment
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return new Promise((resolve) => {
    app(req, res, () => {
      resolve(undefined);
    });
  });
}