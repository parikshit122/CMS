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

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long.",
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one uppercase letter (A-Z).",
      });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one lowercase letter (a-z).",
      });
    }

    if (!/\d/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one number (0-9).",
      });
    }

    if (!/[@$!%*?&#]/.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one special character (@$!%*?&#).",
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered. Please login instead.",
      });
    }

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: "This phone number is already registered.",
      });
    }

    let role = "user";
    if (email.endsWith("@staff.com")) role = "staff";
    if (email.endsWith("@admin.com")) role = "admin";

    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
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
    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0];
      return res.status(400).json({
        success: false,
        message: firstError.message,
      });
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered.`,
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
      error: err.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email. Please register first.",
      });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      const daysLeft = Math.ceil(
        (user.suspendedUntil - new Date()) / (1000 * 60 * 60 * 24),
      );
      return res.status(403).json({
        success: false,
        message: `Your account is suspended. Try again in ${daysLeft} day(s).`,
        suspendedUntil: user.suspendedUntil,
        reason: user.suspensionReason || "",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact admin.",
      });
    }

    if (user.provider && user.provider !== "local") {
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.provider} login. Please sign in with ${user.provider}.`,
      });
    }

    const match = await user.matchPassword(password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Please try again or reset your password.",
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
      message: "Login failed. Please try again.",
      error: err.message,
    });
  }
};

const socialLogin = async (req, res) => {
  try {
    console.log("=".repeat(50));
    console.log("Social login request received from:", req.headers.origin);

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

    if (!idToken && !clientEmail) {
      return res.status(400).json({
        success: false,
        message: "Authentication data missing.",
      });
    }

    let decoded = null;

    if (idToken) {
      try {
        decoded = await admin.auth().verifyIdToken(idToken);
        console.log("✅ Token verified for:", decoded.email || decoded.uid);
      } catch (verifyErr) {
        console.error(
          "⚠️ Token verification failed:",
          verifyErr.code,
          verifyErr.message,
        );
        console.log("⚠️ Falling back to client-provided email");
      }
    }

    const email = decoded?.email || clientEmail || "";

    if (!email) {
      console.error("❌ No email available");
      return res.status(400).json({
        success: false,
        message: "No email found. Please try another login method.",
      });
    }

    const name = decoded?.name || clientName || email.split("@")[0];
    const avatar = decoded?.picture || clientAvatar || "";

    const rawProvider =
      clientProvider || decoded?.firebase?.sign_in_provider || "google";

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

    let user;
    try {
      user = await User.findOne({ email });
      console.log(user ? "✅ Existing user" : "🆕 New user needed");
    } catch (dbErr) {
      console.error("❌ DB error finding user:", dbErr.message);
      return res.status(500).json({
        success: false,
        message: "Database error. Try again.",
        error: dbErr.message,
      });
    }

    if (!user) {
      try {
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
        console.log("✅ User created:", user._id);
      } catch (createErr) {
        console.error("❌ User creation failed:", createErr.message);
        return res.status(500).json({
          success: false,
          message: "Failed to create user.",
          error: createErr.message,
        });
      }
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

    let accessToken, refreshToken;
    try {
      accessToken = generateAccessToken(user._id);
      refreshToken = generateRefreshToken(user._id);
    } catch (tokenErr) {
      console.error("❌ Token generation failed:", tokenErr.message);
      return res.status(500).json({
        success: false,
        message: "Token generation failed.",
        error: tokenErr.message,
      });
    }

    console.log("✅ Login successful for:", email);
    console.log("=".repeat(50));

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error("❌ FATAL Social login error:", err.message);
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
        message: "Please enter your email address.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email. Please register first.",
      });
    }

    if (user.provider && user.provider !== "local") {
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.provider} login. Password reset is not available. Please sign in with ${user.provider}.`,
      });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is suspended. Please contact admin to reset your password.",
      });
    }

    if (
      user.passwordResetOTPExpiry &&
      user.passwordResetOTPExpiry > new Date()
    ) {
      const secondsLeft = Math.ceil(
        (user.passwordResetOTPExpiry - new Date()) / 1000,
      );
      if (secondsLeft > 540) {
        return res.status(429).json({
          success: false,
          message: `OTP already sent. Please wait ${Math.ceil((secondsLeft - 540) / 60)} minute(s) before requesting a new one.`,
        });
      }
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
      message:
        "OTP sent to your email. Please check your inbox (and spam folder).",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
      error: err.message,
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Please enter the 6-digit OTP.",
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be exactly 6 digits (numbers only).",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email.",
      });
    }

    if (!user.passwordResetOTP) {
      return res.status(400).json({
        success: false,
        message: "No active OTP found. Please request a new OTP first.",
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
        message: "Incorrect OTP. Please check your email and try again.",
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
      message: "OTP verified successfully. You can now set a new password.",
      resetToken: rawToken,
      email: user.email,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Verification failed. Please try again.",
      error: err.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid reset session. Please start over from forgot password.",
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please enter a new password.",
      });
    }

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please confirm your new password.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match. Please make sure both fields are identical.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one uppercase letter (A-Z).",
      });
    }

    if (!/[a-z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one lowercase letter (a-z).",
      });
    }

    if (!/\d/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one number (0-9).",
      });
    }

    if (!/[@$!%*?&#]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one special character (@$!%*?&#).",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found. Please start over.",
      });
    }

    if (!user.passwordResetToken || !user.passwordResetTokenExpiry) {
      return res.status(400).json({
        success: false,
        message: "Reset session not found. Please request a new OTP.",
      });
    }

    if (user.passwordResetTokenExpiry < new Date()) {
      user.passwordResetToken = null;
      user.passwordResetTokenExpiry = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Your reset session has expired. Please request a new OTP.",
      });
    }

    const isTokenValid = await bcrypt.compare(
      resetToken,
      user.passwordResetToken,
    );

    if (!isTokenValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token. Please start the process again.",
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password cannot be the same as your current password. Please choose a different one.",
      });
    }

    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    await user.save();

    await sendPasswordResetSuccessEmail(user);

    return res.status(200).json({
      success: true,
      message:
        "Password reset successful! You can now log in with your new password.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Password reset failed. Please try again.",
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
