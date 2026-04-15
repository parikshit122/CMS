const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { register, login, refreshToken, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");

// Validation handler
const validate = function(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => err.msg),
    });
  }
  next();
};

// Register route
router.post("/register",
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 3 }).withMessage("Name must be at least 3 characters"),
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email address").normalizeEmail(),
  body("phone").trim().notEmpty().withMessage("Phone number is required").matches(/^[0-9]{10}$/).withMessage("Phone number must be 10 digits"),
  body("password").notEmpty().withMessage("Password is required").isLength({ min: 8 }).withMessage("Password must be at least 8 characters").matches(/[a-z]/).withMessage("Must contain lowercase").matches(/[A-Z]/).withMessage("Must contain uppercase").matches(/[0-9]/).withMessage("Must contain number").matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Must contain special character"),
  validate,
  register
);

// Login route
router.post("/login",
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email address").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
  login
);

// Refresh token
router.post("/refresh-token", refreshToken);

// Protected route
router.get("/me", protect, getMe);

module.exports = router;