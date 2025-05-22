import { Request, Response } from 'express';
import app from './server';

// Handler for Vercel serverless deployment
export default function handler(req: Request, res: Response) {
  // Pass the request to the Express app
  return app(req, res);
}