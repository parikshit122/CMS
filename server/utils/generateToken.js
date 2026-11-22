const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const fallbackJwtSecret = crypto.randomBytes(32).toString("hex");
const fallbackJwtRefreshSecret = crypto.randomBytes(32).toString("hex");

const getJwtSecret = () => process.env.JWT_SECRET || fallbackJwtSecret;
const getJwtRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || fallbackJwtRefreshSecret;

const generateAccessToken = (userId) => {
  if (!userId) throw new Error("userId is required");
  return jwt.sign(
    { id: userId },
    getJwtSecret(),
    { expiresIn: "15m" }
  );
};

// ── Refresh Token — longer lived ─────────────────────────
const generateRefreshToken = (userId) => {
  if (!userId) throw new Error("userId is required");
  return jwt.sign(
    { id: userId },
    getJwtRefreshSecret(),
    { expiresIn: "7d" }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  getJwtSecret,
  getJwtRefreshSecret,
};