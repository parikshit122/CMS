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
  verifyEmail,
  resendVerificationOTP,
} = require("../controllers/auth.controller");
const { protect, invalidateToken } = require("../middlewares/auth.middleware");
const {
  authLimiter,
  registerLimiter,
  otpLimiter,
  passwordResetLimiter,
} = require("../middlewares/rateLimiters");
const User = require("../models/User");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ✅ Validation error handler
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

// ✅ Register
router.post(
  "/register",
  registerLimiter,
  [
    body("name")
      .trim()
      .notEmpty().withMessage("Name is required")
      .isLength({ min: 3, max: 50 }).withMessage("Name must be 3-50 characters")
      .escape(), // ✅ Prevent XSS
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .matches(EMAIL_REGEX).withMessage("Please enter a valid email address")
      .isLength({ max: 100 }).withMessage("Email too long")
      .toLowerCase(),
    body("phone")
      .trim()
      .notEmpty().withMessage("Phone number is required")
      .matches(/^[0-9]{10}$/).withMessage("Phone must be exactly 10 digits"),
    body("password")
      .notEmpty().withMessage("Password is required")
      .isLength({ min: 8, max: 128 }).withMessage("Password must be 8-128 characters")
      .matches(/[a-z]/).withMessage("Password must include a lowercase letter")
      .matches(/[A-Z]/).withMessage("Password must include an uppercase letter")
      .matches(/[0-9]/).withMessage("Password must include a number")
      .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Password must include a special character"),
  ],
  validate,
  register
);

// ✅ Login
router.post(
  "/login",
  authLimiter,
  [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .matches(EMAIL_REGEX).withMessage("Please enter a valid email address")
      .isLength({ max: 100 }).withMessage("Email too long")
      .toLowerCase(),
    body("password")
      .notEmpty().withMessage("Password is required")
      .isLength({ max: 128 }).withMessage("Password too long"),
  ],
  validate,
  login
);

// ✅ Token & Auth
router.post("/refresh-token", refreshToken);
router.get("/me", protect, getMe);

// ✅ Logout - Blacklist token
router.post("/logout", protect, (req, res) => {
  try {
    invalidateToken(req.token);
    res.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Logout failed.",
    });
  }
});

// ✅ Social Login
router.post("/social-login", authLimiter, socialLogin);

// ✅ Email Verification
router.post(
  "/verify-email",
  otpLimiter,
  [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .matches(EMAIL_REGEX).withMessage("Invalid email")
      .toLowerCase(),
    body("otp")
      .trim()
      .notEmpty().withMessage("OTP is required")
      .matches(/^\d{6}$/).withMessage("OTP must be 6 digits"),
  ],
  validate,
  verifyEmail
);

router.post(
  "/resend-verification",
  otpLimiter,
  [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .matches(EMAIL_REGEX).withMessage("Invalid email")
      .toLowerCase(),
  ],
  validate,
  resendVerificationOTP
);

// ✅ Password Reset
router.post(
  "/forgot-password",
  otpLimiter,
  [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .matches(EMAIL_REGEX).withMessage("Invalid email")
      .toLowerCase(),
  ],
  validate,
  forgotPassword
);

router.post(
  "/verify-otp",
  passwordResetLimiter,
  [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .matches(EMAIL_REGEX).withMessage("Invalid email")
      .toLowerCase(),
    body("otp")
      .trim()
      .notEmpty().withMessage("OTP is required")
      .matches(/^\d{6}$/).withMessage("OTP must be 6 digits"),
  ],
  validate,
  verifyOTP
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .matches(EMAIL_REGEX).withMessage("Invalid email")
      .toLowerCase(),
    body("newPassword")
      .notEmpty().withMessage("New password is required")
      .isLength({ min: 8, max: 128 }).withMessage("Password must be 8-128 characters")
      .matches(/[a-z]/).withMessage("Must include a lowercase letter")
      .matches(/[A-Z]/).withMessage("Must include an uppercase letter")
      .matches(/[0-9]/).withMessage("Must include a number")
      .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Must include a special character"),
    body("confirmPassword")
      .notEmpty().withMessage("Please confirm your password"),
  ],
  validate,
  resetPassword
);

// ✅ Profile Update (with full validation)
router.patch(
  "/profile",
  protect,
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters")
      .escape(),
    body("phone")
      .optional()
      .trim()
      .matches(/^[0-9]{10}$/).withMessage("Phone must be 10 digits"),
    body("course")
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage("Course name too long")
      .escape(),
    body("year")
      .optional()
      .trim()
      .isIn(["1", "2", "3", "4", "5", ""])
      .withMessage("Invalid year"),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage("Bio cannot exceed 500 characters")
      .escape(),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, phone, course, year, bio } = req.body;

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // ✅ Only update allowed fields
      if (name !== undefined) user.name = name;
      if (bio !== undefined) user.bio = bio;

      // ✅ Only update role-specific fields
      if (user.role === "user") {
        if (course !== undefined) user.course = course;
        if (year !== undefined) user.year = year;
      }

      // ✅ Phone update with duplicate check
      if (phone !== undefined && phone !== user.phone) {
        const phoneExists = await User.findOne({
          phone,
          _id: { $ne: user._id },
        });
        if (phoneExists) {
          return res.status(400).json({
            success: false,
            message: "This phone number is already in use.",
          });
        }
        user.phone = phone;
      }

      await user.save();

      res.json({
        success: true,
        message: "Profile updated successfully.",
        data: user,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Profile update failed.",
      });
    }
  }
);

module.exports = router;