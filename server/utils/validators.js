const { body, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => err.msg),
    });
  }
  next();
};

const registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 3 }).withMessage("Name must be at least 3 characters"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email address")
    .normalizeEmail(),
  body("phone")
    .trim()
    .notEmpty().withMessage("Phone number is required")
    .matches(/^[0-9]{10}$/).withMessage("Phone number must be 10 digits"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .matches(/[a-z]/).withMessage("Must contain at least one lowercase letter")
    .matches(/[A-Z]/).withMessage("Must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("Must contain at least one number")
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage("Must contain at least one special character"),
  handleValidationErrors,
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

module.exports = { registerValidation, loginValidation, handleValidationErrors };