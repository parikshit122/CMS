const User = require("../models/User");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebaseadmin");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    let role = "user";

    // ✅ Automatic role logic
    if (email.endsWith("@staff.com")) {
      role = "staff";
    } else if (email.endsWith("@admin.com")) {
      role = "admin";
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
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

    // ✅ use matchPassword not comparePassword
    const match = await user.matchPassword(password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user._id);

    // ✅ send user object
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
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

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const firebaseUser = await admin.auth().getUser(decoded.uid);

    const email = firebaseUser.email || `${decoded.uid}@social.local`;
    const name = firebaseUser.displayName || decoded.name || "User";
    const provider =
      decoded.firebase?.sign_in_provider === "google.com" ? "google" : "local";

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword =
        "Social@" + Math.random().toString(36).slice(2, 10) + "1A";

      user = await User.create({
        name,
        email,
        provider,
        password: randomPassword,
        avatar: firebaseUser.photoURL || "",
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Social login error:", err);
    res.status(500).json({ success: false, message: "Social login failed" });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const newToken = generateToken(decoded.id);
    res.json({ success: true, token: newToken });
  } catch {
    res.status(401).json({ success: false });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (err) {
    console.error("GetMe error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to get user",
    });
  }
};

module.exports = {
  register,
  login,
  socialLogin,
  refreshToken,
  getMe,
};
