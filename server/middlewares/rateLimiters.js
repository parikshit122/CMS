const rateLimit = require("express-rate-limit");

// ── Skip all rate limiting in test environment ────────────
const isTest  = process.env.NODE_ENV === "test";
const skipAll = () => isTest;

const skipHealthCheck = (req) =>
  req.path === "/health" || isTest;

const authLimiter = rateLimit({
  windowMs:               15 * 60 * 1000,
  max:                    10,
  message:                { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders:        true,
  legacyHeaders:          false,
  skipSuccessfulRequests: true,
  skip:                   skipAll,
});

const registerLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  message:         { success: false, message: "Too many accounts created. Please try again in an hour." },
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipAll,
});

const otpLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  message:         { success: false, message: "Too many OTP requests. Please try again in an hour." },
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipAll,
});

const passwordResetLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  message:         { success: false, message: "Too many password reset attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipAll,
});

const generalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             150,
  message:         { success: false, message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipHealthCheck,
});

const uploadLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             20,
  message:         { success: false, message: "Too many upload requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipAll,
});

const adminLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             200,
  message:         { success: false, message: "Too many admin requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipAll,
});

module.exports = {
  authLimiter,
  registerLimiter,
  otpLimiter,
  passwordResetLimiter,
  generalLimiter,
  uploadLimiter,
  adminLimiter,
};