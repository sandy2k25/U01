// Adapter for running Express apps on Vercel
import express from 'express';
import { registerRoutes } from './server/routes';

// Create the Express application
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${ms}ms`);
  });
  next();
});

// Register all the routes from our application
const setupApp = async () => {
  try {
    await registerRoutes(app);
    console.log('Express routes registered for Vercel deployment');
  } catch (error) {
    console.error('Failed to register routes:', error);
  }
  return app;
};

// Prepare the application
const appPromise = setupApp();

// Export the serverless handler
export default async function vercelHandler(req, res) {
  const expressApp = await appPromise;
  return expressApp(req, res);
}