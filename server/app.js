const path          = require("path");
const fs            = require("fs");
const express       = require("express");
const cors          = require("cors");
const helmet        = require("helmet");
const compression   = require("compression");
const mongoSanitize = require("./middlewares/sanitize");
const { generalLimiter } = require("./middlewares/rateLimiters");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/error.middleware");

const app = express();

app.set("trust proxy", 1);

// ── 1. Security Headers (iframe & SPA friendly) ───────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy:   { policy: "unsafe-none"  },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy:     false,
    frameguard:                false,
  })
);

// ── 2. Compression ────────────────────────────────────────
app.use(compression());

// ── 3. CORS ───────────────────────────────────────────────
const configuredOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:5173"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (configuredOrigins.includes(origin)) return callback(null, true);
      try {
        const { hostname, protocol } = new URL(origin);
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          return callback(null, true);
        }
        if (protocol === "https:" && hostname.endsWith(".run.app")) {
          return callback(null, true);
        }
      } catch {
        // invalid origin header
      }
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials:    true,
    methods:        ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// ── 4. Body Parser ────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── 5. MongoDB Injection Protection ──────────────────────
app.use(mongoSanitize);

// ── 6. Rate Limiting ──────────────────────────────────────
app.use("/api/", generalLimiter);

// ── 7. Remove fingerprinting ──────────────────────────────
app.disable("x-powered-by");

// ── Health Check (public, no auth required) ───────────────
app.get("/api/health", (req, res) => {
  res.json({
    success:   true,
    status:    "healthy",
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── 8. API Routes ─────────────────────────────────────────
app.use("/api", require("./routes"));

// ── Static Frontend (Built Vite SPA) ──────────────────────
const clientDistPath = path.join(__dirname, "../client/dist");
const clientIndexHtml = path.join(clientDistPath, "index.html");

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api") && fs.existsSync(clientIndexHtml)) {
    return res.sendFile(clientIndexHtml);
  }
  next();
});

// ── 404 + Global Error Handler ────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;