const User = require("../models/User");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebaseadmin");

const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

const buildUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  phone: user.phone,
  bio: user.bio,
  course: user.course,
  year: user.year,
  category: user.category,
});

const register = async (req, res) => {
  try {
    const { name, email, phone, password, course, year } = req.body;

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits",
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    let role = "user";
    if (email.endsWith("@staff.com")) role = "staff";
    if (email.endsWith("@admin.com")) role = "admin";

    const userData = {
      name,
      email,
      phone,
      password,
      role,
    };

    if (role === "user") {
      if (course) userData.course = course;
      if (year) userData.year = year;
    }

    const user = await User.create(userData);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Register failed",
      error: err.message,
    });
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      const daysLeft = Math.ceil(
        (user.suspendedUntil - new Date()) / (1000 * 60 * 60 * 24),
      );
      return res.status(403).json({
        success: false,
        message: `Account suspended. Try again in ${daysLeft} day(s).`,
        suspendedUntil: user.suspendedUntil,
        reason: user.suspensionReason || "",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact admin.",
      });
    }

    const match = await user.matchPassword(password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: err.message,
    });
  }
};

const socialLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    const decoded = await admin.auth().verifyIdToken(idToken);
    const firebaseUser = await admin.auth().getUser(decoded.uid);

    const email = firebaseUser.email || `${decoded.uid}@social.local`;
    const name = firebaseUser.displayName || decoded.name || "User";

    let user = await User.findOne({ email });

    if (!user) {
      let role = "user";
      if (email.endsWith("@staff.com")) role = "staff";
      if (email.endsWith("@admin.com")) role = "admin";

      const randomPassword =
        "Social@" + Math.random().toString(36).slice(2, 10) + "1A";

      user = await User.create({
        name,
        email,
        password: randomPassword,
        avatar: firebaseUser.photoURL || "",
        role,
      });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      const daysLeft = Math.ceil(
        (user.suspendedUntil - new Date()) / (1000 * 60 * 60 * 24),
      );
      return res.status(403).json({
        success: false,
        message: `Account suspended. Try again in ${daysLeft} day(s).`,
        suspendedUntil: user.suspendedUntil,
        reason: user.suspensionReason || "",
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch {
    res.status(500).json({ success: false });
  }
};

const refreshTokenController = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ success: false });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = generateAccessToken(decoded.id);

    res.json({
      success: true,
      accessToken,
    });
  } catch {
    res.status(401).json({ success: false });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false });
  }
};

module.exports = {
  register,
  login,
  socialLogin,
  refreshToken: refreshTokenController,
  getMe,
};
