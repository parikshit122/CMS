const sanitizeValue = (value) => {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === "object") {
    return sanitizeObject(value);
  }

  return value;
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      const safeKey = key.replace(/^\$/g, "_").replace(/\./g, "_");
      clean[safeKey] = sanitizeValue(obj[key]);
      console.warn(`⚠️  Sanitized suspicious key: ${key} → ${safeKey}`);
    } else {
      clean[key] = sanitizeValue(obj[key]);
    }
  }
  return clean;
};

const mongoSanitize = (req, res, next) => {
  try {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body);
    }

    if (req.params && typeof req.params === "object") {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (err) {
    console.error("Sanitize error:", err.message);
    next();
  }
};

module.exports = mongoSanitize;