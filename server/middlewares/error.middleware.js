// E:\CMS\server\middlewares\error.middleware.js

const isDev = process.env.NODE_ENV !== "production";

// ── Global Error Handler ──────────────────────────────────
// Must have 4 params for Express to treat it as error middleware
const errorHandler = (err, req, res, next) => {

  // ── Log the error ─────────────────────────────────────
  if (isDev) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
    console.error(`[ERROR] ${err.message}`);
    console.error(err.stack);
  } else {
    // In production only log the message — no stack trace
    console.error(`[ERROR] ${req.method} ${req.originalUrl} — ${err.message}`);
  }

  // ── Already sent headers — let Express handle it ──────
  if (res.headersSent) {
    return next(err);
  }

  // ── Mongoose Validation Error ─────────────────────────
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages[0] || "Validation failed",
      ...(isDev && { errors: messages }),
    });
  }

  // ── Mongoose Duplicate Key ────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(400).json({
      success: false,
      message: `This ${field} is already in use`,
    });
  }

  // ── Mongoose Cast Error (invalid ObjectId) ────────────
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  // ── JWT Errors ────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token. Please login again.",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
  }

  // ── Multer Errors ─────────────────────────────────────
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size is 5MB.",
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected file field.",
    });
  }

  // ── CORS Error ────────────────────────────────────────
  if (err.message?.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: "CORS policy: Access denied.",
    });
  }

  // ── Default: 500 Internal Server Error ────────────────
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message: isDev
      ? err.message || "Internal server error"
      : "Something went wrong. Please try again.",
    // Only expose stack in development
    ...(isDev && { stack: err.stack }),
  });
};

// ── 404 Handler ───────────────────────────────────────────
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

module.exports = { errorHandler, notFoundHandler };