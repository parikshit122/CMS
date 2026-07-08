const isDev = process.env.NODE_ENV !== "production";

// ── Sanitize a single value ───────────────────────────────
const sanitizeValue = (value) => {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return value
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove all HTML tags
      .replace(/<[^>]+>/g, "")
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === "object") {
    return sanitizeObject(value);
  }

  return value;
};

// ── Sanitize an object — strip NoSQL injection keys ──────
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  const clean = {};

  for (const key of Object.keys(obj)) {
    // Block MongoDB operator injection ($where, $gt, etc.)
    // Block dot-notation key traversal
    if (key.startsWith("$") || key.includes(".")) {
      const safeKey = key
        .replace(/^\$/g, "_")
        .replace(/\./g, "_");

      clean[safeKey] = sanitizeValue(obj[key]);

      // Only log suspicious keys in development
      if (isDev) {
        console.warn(
          `[sanitize] Suspicious key blocked: "${key}" → "${safeKey}"`
        );
      }
    } else {
      clean[key] = sanitizeValue(obj[key]);
    }
  }

  return clean;
};

// ── Express middleware ────────────────────────────────────
const mongoSanitize = (req, res, next) => {
  try {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body);
    }

    if (req.params && typeof req.params === "object") {
      req.params = sanitizeObject(req.params);
    }

    if (req.query && typeof req.query === "object") {
      req.query = sanitizeObject(req.query);
    }
  } catch (err) {
    // Never crash the app due to sanitization error
    // Log in dev only
    if (isDev) {
      console.error("[sanitize] Error during sanitization:", err.message);
    }
  } finally {
    next();
  }
};

module.exports = mongoSanitize;