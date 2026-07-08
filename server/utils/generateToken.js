const jwt = require("jsonwebtoken");

const generateAccessToken = (userId) => {
  if (!userId) throw new Error("userId is required");
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

// ── Refresh Token — longer lived ─────────────────────────
const generateRefreshToken = (userId) => {
  if (!userId) throw new Error("userId is required");
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};