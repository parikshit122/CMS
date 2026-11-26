const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../utils/generateToken");
const adminAuth = require("../config/firebaseadmin");
const {
  findUserById,
  getOrCreateFirebaseUser,
} = require("../../src/db/users.ts");
const { normalizeSocialProvider } = require("../../src/lib/auth-helpers.ts");

// ── Token blacklist ───────────────────────────────────────
const tokenBlacklist = new Map();

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

    let user = null;

    // 1. Try verifying as app JWT first; if signature/format doesn't match, try Firebase ID token
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      if (decoded?.id) {
        user = await findUserById(decoded.id, { includeSensitive: true });
      }
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
        });
      }

      // Fallback: verify Firebase Auth ID token directly
      if (adminAuth) {
        try {
          const decodedFirebase = await adminAuth.verifyIdToken(token);
          if (decodedFirebase?.uid && decodedFirebase?.email) {
            const { user: syncedUser } = await getOrCreateFirebaseUser({
              uid: decodedFirebase.uid,
              email: decodedFirebase.email,
              name: decodedFirebase.name,
              avatar: decodedFirebase.picture,
              provider: normalizeSocialProvider(
                decodedFirebase.firebase?.sign_in_provider
              ),
              emailVerified: Boolean(decodedFirebase.email_verified),
            });
            user = syncedUser;
          }
        } catch (firebaseErr) {
          if (firebaseErr?.code === "UNVERIFIED_SOCIAL_EMAIL") {
            return res.status(403).json({
              success: false,
              message: firebaseErr.message,
            });
          }
          return res.status(401).json({
            success: false,
            message: "Invalid token. Please login again.",
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: "Invalid token. Please login again.",
        });
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const minutesLeft = Math.ceil(
        (new Date(user.lockUntil) - new Date()) / (1000 * 60)
      );
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      return res.status(403).json({
        success: false,
        message: "Account suspended.",
        suspendedUntil: user.suspendedUntil,
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Please contact admin.",
      });
    }

    // Strip sensitive fields before attaching req.user
    const {
      password: _p,
      passwordResetOTP: _pro,
      passwordResetToken: _prt,
      emailVerificationOTP: _evo,
      ...safeUser
    } = user;

    req.user = safeUser;
    req.token = token;
    next();
  } catch (error) {
    console.error("[AuthMiddleware] Error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
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
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp
      ? decoded.exp * 1000
      : Date.now() + 15 * 60 * 1000;

    tokenBlacklist.set(token, expiresAt);
  } catch {
    tokenBlacklist.set(token, Date.now() + 15 * 60 * 1000);
  }
};

const isTokenInvalidated = (token) => {
  if (!token || typeof token !== "string") return false;
  const expiresAt = tokenBlacklist.get(token);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    tokenBlacklist.delete(token);
    return false;
  }
  return true;
};

/**
 * Optional authentication middleware for public endpoints that adapt to caller clearance
 * (e.g. campus navigation per-zone access tiers). Never blocks unauthenticated requests;
 * populates req.user only when a valid, active, non-blacklisted token is provided.
 */
const optionalProtect = async (req, res, next) => {
  req.user = null;
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token || typeof token !== "string" || token.split(".").length !== 3) {
      return next();
    }

    if (isTokenInvalidated(token)) {
      return next();
    }

    let user = null;
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      if (decoded?.id) {
        user = await findUserById(decoded.id, { includeSensitive: true });
      }
    } catch {
      if (adminAuth) {
        try {
          const decodedFirebase = await adminAuth.verifyIdToken(token);
          if (decodedFirebase?.uid && decodedFirebase?.email) {
            const { user: syncedUser } = await getOrCreateFirebaseUser({
              uid: decodedFirebase.uid,
              email: decodedFirebase.email,
              name: decodedFirebase.name,
              avatar: decodedFirebase.picture,
              provider: normalizeSocialProvider(
                decodedFirebase.firebase?.sign_in_provider
              ),
              emailVerified: Boolean(decodedFirebase.email_verified),
            });
            user = syncedUser;
          }
        } catch {
          user = null;
        }
      }
    }

    if (!user || user.isActive === false) return next();
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) return next();
    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) return next();

    const {
      password: _p,
      passwordResetOTP: _pro,
      passwordResetToken: _prt,
      emailVerificationOTP: _evo,
      ...safeUser
    } = user;

    req.user = safeUser;
    req.token = token;
  } catch {
    req.user = null;
  }
  return next();
};

module.exports = {
  protect,
  optionalProtect,
  authorize,
  invalidateToken,
  isTokenInvalidated,
};