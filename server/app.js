const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const compression  = require("compression");
const mongoSanitize = require("./middlewares/sanitize");
const { generalLimiter } = require("./middlewares/rateLimiters");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/error.middleware");

const app = express();

app.set("trust proxy", 1);

// ── 1. Security Headers ───────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy:   { policy: "unsafe-none"  },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'"],
        imgSrc:         ["'self'", "data:", "https:"],
        connectSrc:     ["'self'"],
        fontSrc:        ["'self'", "https:"],
        objectSrc:      ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

// ── 2. Compression ────────────────────────────────────────
app.use(compression());

// ── 3. CORS ───────────────────────────────────────────────
const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim());

const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.includes(origin);
      const isDevAllowed =
        process.env.NODE_ENV !== "production" &&
        DEV_ORIGINS.includes(origin);

      if (isAllowed || isDevAllowed) {
        return callback(null, true);
      }

      callback(new Error(`CORS blocked: ${origin}`));
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
app.get("/", (req, res) => {
  res.json({
    success:   true,
    message:   "ComplaintSync API is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success:   true,
    status:    "healthy",
    uptime:    process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── 8. Debug Route (development only) ────────────────────
if (process.env.NODE_ENV !== "production") {
  app.get("/api/debug/env", (req, res) => {
    const cloudinary = require("./config/cloudinary");
    res.json({
      envVars: {
        CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY:    !!process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
      },
      cloudinaryConfig: {
        cloud_name: cloudinary.config().cloud_name ? "SET" : "MISSING",
        api_key:    cloudinary.config().api_key    ? "SET" : "MISSING",
        api_secret: cloudinary.config().api_secret ? "SET" : "MISSING",
      },
    });
  });
}

// ── API Routes ────────────────────────────────────────────
app.use("/api", require("./routes"));

// ── 404 + Global Error Handler ────────────────────────────
// Order matters — notFound must come before errorHandler
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;