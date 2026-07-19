const jwt     = require("jsonwebtoken");
const User    = require("../models/User");

// ── Token blacklist ───────────────────────────────────────
// Stores { token: expiresAt } so we can clean up expired entries
const tokenBlacklist = new Map();

// Clean expired tokens every 15 minutes instead of clearing ALL
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of tokenBlacklist.entries()) {
    if (expiresAt < now) {
      tokenBlacklist.delete(token);
    }
  }
}, 15 * 60 * 1000);
cleanupInterval.unref();

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login first.",
      });
    }

    if (typeof token !== "string" || token.split(".").length !== 3) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format.",
      });
    }

    if (tokenBlacklist.has(token)) {
      return res.status(401).json({
        success: false,
        message: "Token has been invalidated. Please login again.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
    }

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    if (req.user.lockUntil && req.user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (req.user.lockUntil - new Date()) / (1000 * 60)
      );
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    if (req.user.suspendedUntil && req.user.suspendedUntil > new Date()) {
      return res.status(403).json({
        success: false,
        message:        "Account suspended.",
        suspendedUntil: req.user.suspendedUntil,
      });
    }

    if (req.user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Please contact admin.",
      });
    }

    req.token = token;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
};

const invalidateToken = (token) => {
  try {
    // Decode without verifying to get expiry time
    const decoded    = jwt.decode(token);
    const expiresAt  = decoded?.exp
      ? decoded.exp * 1000          // JWT exp is in seconds
      : Date.now() + 15 * 60 * 1000; // fallback 15 min

    tokenBlacklist.set(token, expiresAt);
  } catch {
    // If decode fails just add with 15min TTL
    tokenBlacklist.set(token, Date.now() + 15 * 60 * 1000);
  }
};

module.exports = { protect, authorize, invalidateToken };