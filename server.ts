import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { chatRouter } from "./server/routes/chat";
import planRouter from "./server/routes/plan";
import { profileRouter } from "./server/routes/profile";
import { sentinelRouter } from "./server/routes/sentinel";
import { sandboxRouter } from "./server/routes/sandbox";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Rate Limiting (Simple In-Memory)
  const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
  
  // Clean up expired entries every 10 minutes to prevent memory leak
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
         rateLimitMap.delete(ip);
      }
    }
  }, 10 * 60 * 1000).unref?.();

  app.use("/api/chat", (req, res, next) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      let record = rateLimitMap.get(ip);
      
      // Reset every 10 minutes
      if (!record || now > record.resetTime) {
          record = { count: 0, resetTime: now + 10 * 60 * 1000 };
      }
      
      // Limit to 50 requests per 10 minutes per IP
      if (record.count >= 50) {
          res.status(429).json({ error: "Too many requests. Please try again later." });
          return;
      }
      
      record.count++;
      rateLimitMap.set(ip, record);
      next();
  });

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || origin.includes('localhost') || origin.includes('.run.app') || origin.includes('google.com')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
  };
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "50mb" }));

  // API Configuration
  app.use("/api/chat", chatRouter);
  app.use("/api/plan", planRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/sentinel", sentinelRouter);
  app.use("/api/sandbox", sandboxRouter);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import for Vite
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      setHeaders: (res, path, stat) => {
        if (path.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    // Notice: For Express 4 use '*', for Express 5 use '*all'
    app.get("*", (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
