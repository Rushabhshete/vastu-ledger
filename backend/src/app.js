import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import routes from "./routes/index.js";
import errorHandler from "./middlewares/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Core middleware
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin:      process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// Serve static uploads (receipts, proofs)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    setHeaders: (res) => {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Global rate limiter — 200 req / 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      200,
    standardHeaders: true,
    legacyHeaders:   false,
  })
);

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// API routes
app.use("/api", routes);

// Centralised error handler (RFC-7807)
app.use(errorHandler);

export default app;
