const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("./middlewares/sanitize");
const { generalLimiter } = require("./middlewares/rateLimiters");

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
);

app.use(compression());

const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(mongoSanitize);

app.use("/api/", generalLimiter);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ComplaintSync API is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/debug/env", (req, res) => {
  const cloudinary = require("./config/cloudinary");
  res.json({
    envVars: {
      CLOUDINARY_CLOUD_NAME: !!process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: !!process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: !!process.env.CLOUDINARY_API_SECRET,
    },
    lengths: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME?.length || 0,
      apiKey: process.env.CLOUDINARY_API_KEY?.length || 0,
      apiSecret: process.env.CLOUDINARY_API_SECRET?.length || 0,
    },
    cloudinaryConfig: {
      cloud_name: cloudinary.config().cloud_name ? "SET" : "MISSING",
      api_key: cloudinary.config().api_key ? "SET" : "MISSING",
      api_secret: cloudinary.config().api_secret ? "SET" : "MISSING",
    },
  });
});

app.use("/api", require("./routes"));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use((err, req, res, next) => {
  if (err.message?.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: "CORS policy: Access denied.",
    });
  }

  console.error("Global Error:", err.message);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

module.exports = app;
