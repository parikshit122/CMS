const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const {
  register,
  login,
  refreshToken,
  getMe,
  socialLogin
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
  body("phone").trim().notEmpty().matches(/^[0-9]{10}$/),
  body("password")
    .notEmpty()
    .isLength({ min: 8 })
    .matches(/[a-z]/)
    .matches(/[A-Z]/)
    .matches(/[0-9]/)
    .matches(/[!@#$%^&*(),.?":{}|<>]/),
  validate,
  register
);

router.post(
  "/login",
  body("email").trim().notEmpty().isEmail().normalizeEmail(),
  body("password").notEmpty(),
  validate,
  login
);

router.post("/refresh-token", refreshToken);

router.get("/me", protect, getMe);

router.post("/social-login", socialLogin);


module.exports = router;