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
const User = require("../models/User");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => err.msg),
    });
  }
  next();
};

router.post(
  "/register",
  body("name").trim().notEmpty().isLength({ min: 3 }),
  body("email").trim().notEmpty().isEmail().normalizeEmail(),
  body("phone")
    .trim()
    .notEmpty()
    .matches(/^[0-9]{10}$/),
  body("password")
    .notEmpty()
    .isLength({ min: 8 })
    .matches(/[a-z]/)
    .matches(/[A-Z]/)
    .matches(/[0-9]/)
    .matches(/[!@#$%^&*(),.?":{}|<>]/),
  validate,
  register,
);

router.post(
  "/login",
  body("email").trim().notEmpty().isEmail().normalizeEmail(),
  body("password").notEmpty(),
  validate,
  login,
);

router.post("/refresh-token", refreshToken);

router.get("/me", protect, getMe);

router.post("/social-login", socialLogin);

router.post("/forgot-password", forgotPassword);

router.post("/verify-otp", verifyOTP);

router.post("/reset-password", resetPassword);

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