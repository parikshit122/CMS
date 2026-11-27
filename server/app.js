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
const configuredOrigins = [
  ...(process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:5173").split(","),
  process.env.FRONTEND_URL || "",
  process.env.RENDER_EXTERNAL_URL || "",
]
  .map((o) => o.trim().replace(/\/+$/, ""))
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
  app.use(
    express.static(clientDistPath, {
      setHeaders: (res, filePath) => {
        if (
          filePath.endsWith(".html") ||
          filePath.endsWith("sw.js") ||
          filePath.endsWith("registerSW.js") ||
          filePath.endsWith(".webmanifest")
        ) {
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );
}

const HASHED_JS_CHUNK_RE = /^\/assets\/[A-Za-z0-9._-]+-[A-Za-z0-9_-]{6,}\.js$/;
const HASHED_CSS_CHUNK_RE = /^\/assets\/[A-Za-z0-9._-]+-[A-Za-z0-9_-]{6,}\.css$/;
const STATIC_ASSET_EXT_RE = /\.(?:js|mjs|cjs|css|map|png|jpe?g|webp|svg|ico|woff2?|ttf|eot|json|webmanifest)$/i;

const STALE_CHUNK_RECOVERY_MODULE = [
  "(function () {",
  '  if (typeof window === "undefined") return;',
  "  try {",
  '    var key = "cms_chunk_reload_ts";',
  "    var last = Number(window.sessionStorage.getItem(key) || 0);",
  "    if (Date.now() - last < 10000) return;",
  "    window.sessionStorage.setItem(key, String(Date.now()));",
  "  } catch (e) {}",
  "  var tasks = [];",
  '  if ("serviceWorker" in navigator) {',
  "    tasks.push(",
  "      navigator.serviceWorker",
  "        .getRegistrations()",
  "        .then(function (regs) {",
  "          return Promise.all(regs.map(function (r) { return r.unregister(); }));",
  "        })",
  "        .catch(function () {})",
  "    );",
  "  }",
  '  if ("caches" in window) {',
  "    tasks.push(",
  "      window.caches",
  "        .keys()",
  "        .then(function (keys) {",
  "          return Promise.all(keys.map(function (k) { return window.caches.delete(k); }));",
  "        })",
  "        .catch(function () {})",
  "    );",
  "  }",
  "  Promise.all(tasks).finally(function () {",
  "    window.location.reload();",
  "  });",
  "})();",
  "export default function StaleChunkRecovery() { return null; }",
].join("\n");

// Self-heal already-open tabs / old service workers requesting replaced Vite chunk hashes
app.use((req, res, next) => {
  if (req.method === "GET" && HASHED_JS_CHUNK_RE.test(req.path)) {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).send(STALE_CHUNK_RECOVERY_MODULE);
  }
  if (req.method === "GET" && HASHED_CSS_CHUNK_RE.test(req.path)) {
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.status(200).send("/* stale stylesheet replaced after rebuild */\n");
  }
  next();
});

app.use((req, res, next) => {
  if (
    req.method === "GET" &&
    !req.path.startsWith("/api") &&
    !req.path.startsWith("/assets/") &&
    !STATIC_ASSET_EXT_RE.test(req.path) &&
    fs.existsSync(clientIndexHtml)
  ) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.sendFile(clientIndexHtml);
  }
  next();
});

// ── 404 + Global Error Handler ────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;