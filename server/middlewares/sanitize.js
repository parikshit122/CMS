const isDev = process.env.NODE_ENV !== "production";

const PASSWORD_KEYS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "confirmPassword",
]);

// ── Sanitize a single value ───────────────────────────────
const sanitizeValue = (value, keyName = "") => {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    // Preserve passwords verbatim so valid special characters like < and > are never altered
    if (PASSWORD_KEYS.has(keyName)) {
      return value;
    }
    return value
      .replace(/[<>]/g, "")
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
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

      clean[safeKey] = sanitizeValue(obj[key], safeKey);

      // Only log suspicious keys in development
      if (isDev) {
        console.warn(
          `[sanitize] Suspicious key blocked: "${key}" → "${safeKey}"`
        );
      }
    } else {
      clean[key] = sanitizeValue(obj[key], key);
    }
  }

  return clean;
};

// ── Express 5 safe in-place sanitization for getter-only req.query ──
const sanitizeInPlace = (target) => {
  if (!target || typeof target !== "object") return;
  const cleaned = sanitizeObject(target);
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  for (const [key, value] of Object.entries(cleaned)) {
    target[key] = value;
  }
};

// ── Express middleware ────────────────────────────────────
const mongoSanitize = (req, res, next) => {
  try {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body);
    }

    if (req.params && typeof req.params === "object") {
      sanitizeInPlace(req.params);
    }

    if (req.query && typeof req.query === "object") {
      sanitizeInPlace(req.query);
    }
  } catch (err) {
    // Never crash the app due to sanitization error
    if (isDev) {
      console.error("[sanitize] Error during sanitization:", err.message);
    }
  } finally {
    next();
  }
};

mongoSanitize.sanitizeValue = sanitizeValue;
mongoSanitize.sanitizeObject = sanitizeObject;
mongoSanitize.sanitizeInPlace = sanitizeInPlace;

module.exports = mongoSanitize;