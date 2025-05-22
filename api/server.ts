import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "../server/routes";

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware for logging API responses
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

// Set up error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
});

// Register all routes
registerRoutes(app).then(() => {
  console.log("Routes registered successfully");
}).catch(error => {
  console.error("Failed to register routes:", error);
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  // Path to the built static files
  const staticPath = path.join(process.cwd(), "dist/public");
  
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
    
    // Fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  } else {
    console.warn(`Static path ${staticPath} does not exist`);
  }
}

export default app;