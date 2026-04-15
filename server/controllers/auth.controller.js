const User = require("../models/User");
const { generateToken, generateRefreshToken } = require("../utils/generateToken");

const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: userExists.email === email ? "Email already registered" : "Phone number already registered",
      });
    }

    const user = await User.create({ name, email, phone, password });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id),
        refreshToken: generateRefreshToken(user._id),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (user.isLocked) {
      return res.status(403).json({
        success: false,
        message: "Account locked due to too many failed attempts. Try again after 15 minutes",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    await user.resetLoginAttempts();

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id),
        refreshToken: generateRefreshToken(user._id),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "Refresh token required" });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, token: generateToken(user._id) });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};

const getMe = async (req, res, next) => {
  return res.json({
    success: true,
    data: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
    },
  });
};

module.exports = { register, login, refreshToken, getMe };