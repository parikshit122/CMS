const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const {
  register,
  login,
  refreshToken,
  getMe,
  socialLogin,
  forgotPassword,
  verifyOTP,
  resetPassword,
} = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");
const {
  authLimiter,
  registerLimiter,
  otpLimiter,
  passwordResetLimiter,
} = require("../middlewares/rateLimiters");
const User = require("../models/User");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => err.msg),
      message: errors.array()[0].msg,
    });
  }
  next();
};

router.post(
  "/register",
  registerLimiter,
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 3 }).withMessage("Name must be at least 3 characters"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .matches(EMAIL_REGEX).withMessage("Please enter a valid email address")
    .toLowerCase(),
  body("phone")
    .trim()
    .notEmpty().withMessage("Phone number is required")
    .matches(/^[0-9]{10}$/).withMessage("Phone must be exactly 10 digits"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[a-z]/).withMessage("Password must include a lowercase letter")
    .matches(/[A-Z]/).withMessage("Password must include an uppercase letter")
    .matches(/[0-9]/).withMessage("Password must include a number")
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must include a special character"),
  validate,
  register
);

router.post(
  "/login",
  authLimiter,
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .matches(EMAIL_REGEX).withMessage("Please enter a valid email address")
    .toLowerCase(),
  body("password")
    .notEmpty().withMessage("Password is required"),
  validate,
  login
);

router.post("/refresh-token", refreshToken);
router.get("/me", protect, getMe);
router.post("/social-login", authLimiter, socialLogin);
router.post("/forgot-password", otpLimiter, forgotPassword);
router.post("/verify-otp", passwordResetLimiter, verifyOTP);
router.post("/reset-password", passwordResetLimiter, resetPassword);

router.patch("/profile", protect, async (req, res) => {
  try {
    const { name, phone, course, year } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (course !== undefined) user.course = course;
    if (year !== undefined) user.year = year;

    await user.save();

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;