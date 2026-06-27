const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const admin = require("../config/firebaseadmin");
const {
  sendPasswordResetOTPEmail,
  sendPasswordResetSuccessEmail,
} = require("../services/email.service");

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

    const userData = { name, email, phone, password, role };

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
      return res.status(404).json({
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
    console.log(
      "Token verified for:",
      decoded.email || decoded.uid || "unknown",
    );
    const {
      idToken,
      email: clientEmail,
      name: clientName,
      avatar: clientAvatar,
      provider: clientProvider,
    } = req.body;

    console.log("Payload:", {
      hasIdToken: !!idToken,
      idTokenLength: idToken?.length,
      clientEmail,
      clientProvider,
    });

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "ID token is required.",
      });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
      console.log("Token verified for:", decoded.email);
    } catch (verifyErr) {
      console.error("Firebase token verification FAILED:");
      console.error("  Code:", verifyErr.code);
      console.error("  Message:", verifyErr.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please try again.",
        debug: verifyErr.message,
      });
    }

    const email = decoded.email || clientEmail || "";

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "No email found from social provider. Please use another login method.",
      });
    }

    const name = decoded.name || clientName || email.split("@")[0];
    const avatar = decoded.picture || clientAvatar || "";

    const rawProvider =
      clientProvider || decoded.firebase?.sign_in_provider || "google";

    const providerMap = {
      "google.com": "google",
      "github.com": "github",
      "facebook.com": "facebook",
      "twitter.com": "twitter",
      google: "google",
      github: "github",
      facebook: "facebook",
      twitter: "twitter",
    };

    const provider = providerMap[rawProvider] || "google";

    let user = await User.findOne({ email });

    if (!user) {
      console.log("Creating new user:", email);
      let role = "user";
      if (email.endsWith("@staff.com")) role = "staff";
      if (email.endsWith("@admin.com")) role = "admin";

      user = await User.create({
        name,
        email,
        password: crypto.randomBytes(32).toString("hex"),
        role,
        provider,
        avatar,
      });
    } else {
      console.log("Existing user found:", email);
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

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    console.log("Login successful for:", email);

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error("Social login error:", err.message);
    console.error("Stack:", err.stack);
    return res.status(500).json({
      success: false,
      message: "Social login failed.",
      error: err.message,
    });
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

    res.json({ success: true, accessToken });
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

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "This email is not registered. Please register first.",
      });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      return res.status(403).json({
        success: false,
        message: "Your account is suspended. Contact admin.",
      });
    }

    const otp = String(Math.floor(100000 + crypto.randomInt(900000)));
    const hashedOTP = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    user.passwordResetOTP = hashedOTP;
    user.passwordResetOTPExpiry = expiry;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    await user.save();

    await sendPasswordResetOTPEmail(user, otp);

    return res.status(200).json({
      success: true,
      message: "If this email is registered, an OTP has been sent.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error. Try again.",
      error: err.message,
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be exactly 6 digits.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "This email is not registered. Please register first.",
      });
    }

    if (user.passwordResetOTPExpiry < new Date()) {
      user.passwordResetOTP = null;
      user.passwordResetOTPExpiry = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    const isMatch = await bcrypt.compare(otp, user.passwordResetOTP);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.passwordResetOTP = null;
    user.passwordResetOTPExpiry = null;
    user.passwordResetToken = hashedToken;
    user.passwordResetTokenExpiry = tokenExpiry;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      resetToken: rawToken,
      email: user.email,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error. Try again.",
      error: err.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!strongPassword.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character (@$!%*?&).",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.passwordResetToken || !user.passwordResetTokenExpiry) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset session. Start over.",
      });
    }

    if (user.passwordResetTokenExpiry < new Date()) {
      user.passwordResetToken = null;
      user.passwordResetTokenExpiry = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Reset session expired. Request a new OTP.",
      });
    }

    const isTokenValid = await bcrypt.compare(
      resetToken,
      user.passwordResetToken,
    );

    if (!isTokenValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token. Start the process again.",
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your current password.",
      });
    }

    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    await user.save();

    await sendPasswordResetSuccessEmail(user);

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error. Try again.",
      error: err.message,
    });
  }
};

module.exports = {
  register,
  login,
  socialLogin,
  refreshToken: refreshTokenController,
  getMe,
  forgotPassword,
  verifyOTP,
  resetPassword,
};
