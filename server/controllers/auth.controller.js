// E:\CMS\server\controllers\auth.controller.js
"use strict";

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebaseadmin");
const User = require("../models/User");
const Settings = require("../models/Settings");

const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const {
  generateOTP,
  hashOTP,
  verifyOTP: verifyOTPCode,
  getOTPExpiry,
  canResendOTP,
} = require("../utils/otpGenerator");
const { validateEmail } = require("../utils/emailValidator");

const {
  sendWelcomeEmail,
  sendEmailVerificationOTP,
  sendEmailVerifiedSuccessEmail,
  sendPasswordResetOTPEmail,
  sendPasswordResetSuccessEmail,
} = require("../services/email.service");

const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  provider: user.provider,
  avatar: user.avatar,
  bio: user.bio,
  course: user.course,
  year: user.year,
  isEmailVerified: user.isEmailVerified,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

// ── Register ───────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate email
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, message: emailCheck.reason });
    }

    const settings = await Settings.getSingleton();

    // Check duplicates
    const existingEmail = await User.findOne({ email: emailCheck.email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: existingEmail.isEmailVerified
          ? "An account with this email already exists. Please login."
          : "An account with this email exists but is not verified. Please check your inbox.",
      });
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "This phone number is already registered.",
        });
      }
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: emailCheck.email,
      phone: phone || undefined,
      password,
      provider: "local",
    });

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);
    const otpExpiryMins = settings.otpExpiryMinutes || 10;

    user.emailVerificationOTP = hashedOTP;
    user.emailVerificationOTPExpiry = getOTPExpiry(otpExpiryMins);
    user.emailVerificationAttempts = 0;
    user.lastOTPSentAt = new Date();
    await user.save();

    // Send welcome + OTP email (one email, not two)
    if (settings.emailEnabled) {
      sendWelcomeEmail(user, otp, otpExpiryMins, settings.emailSenderName).catch(
        (err) => console.error("[Register] Email failed:", err.message)
      );
    }

    return res.status(201).json({
      success: true,
      message: `Account created! Please check your email for the verification code.`,
      otpExpiryMinutes: otpExpiryMins,
      email: user.email,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `This ${field} is already registered.`,
      });
    }
    console.error("[Register] Error:", err);
    res.status(500).json({ success: false, message: "Registration failed. Please try again." });
  }
};

// ── Login ──────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No account found with this email.",
      });
    }

    if (user.provider && user.provider !== "local") {
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.provider} login. Please use that instead.`,
      });
    }

    // Check lock
    if (user.isLocked()) {
      const minutesLeft = Math.ceil((user.lockUntil - new Date()) / (1000 * 60));
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      const remaining = Math.max(0, 5 - user.loginAttempts);
      return res.status(401).json({
        success: false,
        message: remaining > 0
          ? `Incorrect password. ${remaining} attempt(s) remaining.`
          : "Account locked due to too many failed attempts. Try again in 30 minutes.",
      });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended.",
        suspendedUntil: user.suspendedUntil,
        reason: user.suspensionReason,
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Please contact admin.",
      });
    }

    if (!user.isEmailVerified) {
      const settings = await Settings.getSingleton();
      const cooldown = canResendOTP(user.lastOTPSentAt, 60);
      let otpMessage = "";

      if (cooldown.canResend) {
        const otp = generateOTP();
        const hashedOTP = await hashOTP(otp);
        const otpExpiryMins = settings.otpExpiryMinutes || 10;

        user.emailVerificationOTP = hashedOTP;
        user.emailVerificationOTPExpiry = getOTPExpiry(otpExpiryMins);
        user.emailVerificationAttempts = 0;
        user.lastOTPSentAt = new Date();
        await user.save();

        if (settings.emailEnabled) {
          sendEmailVerificationOTP(user, otp, otpExpiryMins, settings.emailSenderName).catch(
            (err) => console.error("[Login] OTP email failed:", err.message)
          );
        }
        otpMessage = " A new verification code has been sent to your email.";
      }

      return res.status(403).json({
        success: false,
        message: `Please verify your email before logging in.${otpMessage}`,
        requiresVerify: true,
        email: user.email,
      });
    }

    await user.resetLoginAttempts(req.ip);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return res.json({
      success: true,
      message: "Login successful.",
      accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error("[Login] Error:", err);
    res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
};

const socialLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: "ID token is required." });
    }

    // admin is now getAuth() directly — call verifyIdToken() on it directly
    if (!admin) {
      return res.status(503).json({
        success: false,
        message: "Social login is not configured on this server.",
      });
    }

    const decoded = await admin.verifyIdToken(idToken);
    const { email, name, picture, firebase } = decoded;
    const provider = firebase?.sign_in_provider?.replace(".com", "") || "google";

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email not provided by social provider.",
      });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        provider,
        avatar: picture || "",
        isEmailVerified: true,
        isActive: true,
      });

      const settings = await Settings.getSingleton();
      if (settings.emailEnabled) {
        sendEmailVerifiedSuccessEmail(user, settings.emailSenderName).catch(
          (err) => console.error("[SocialLogin] Welcome email failed:", err.message)
        );
      }
    } else {
      if (user.provider !== provider && user.provider === "local") {
        return res.status(400).json({
          success: false,
          message: "This email is registered with a password. Please login normally.",
        });
      }
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account deactivated. Please contact admin.",
        });
      }
      user.lastLoginAt = new Date();
      await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return res.json({
      success: true,
      message: "Login successful.",
      accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error("[SocialLogin] Error:", err);
    if (err.code === "auth/id-token-expired") {
      return res.status(401).json({ success: false, message: "Session expired. Please try again." });
    }
    if (err.code === "auth/argument-error") {
      return res.status(401).json({ success: false, message: "Invalid authentication token." });
    }
    res.status(500).json({ success: false, message: "Social login failed. Please try again." });
  }
};

const refreshTokenController = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = generateAccessToken(decoded.id);
    res.json({ success: true, accessToken });
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

// ── Get Me ─────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false, message: "Failed to get user" });
  }
};

// ── Forgot Password ────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Please enter your email address." });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, message: emailCheck.reason });
    }

    const settings = await Settings.getSingleton();

    if (!settings.emailEnabled) {
      return res.status(503).json({
        success: false,
        message: "Email service is currently disabled. Please contact admin.",
      });
    }

    const user = await User.findOne({ email: emailCheck.email }).select(
      "+passwordResetOTP +passwordResetOTPExpiry +passwordResetToken +passwordResetTokenExpiry"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email. Please register first.",
      });
    }

    if (user.provider && user.provider !== "local") {
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.provider} login. Password reset is not available.`,
      });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      return res.status(403).json({
        success: false,
        message: "Your account is suspended. Please contact admin.",
      });
    }

    const otpExpiryMinutes = settings.otpExpiryMinutes || 10;

    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);
    const expiry = getOTPExpiry(otpExpiryMinutes);

    user.passwordResetOTP = hashedOTP;
    user.passwordResetOTPExpiry = expiry;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    await user.save();

    await sendPasswordResetOTPEmail(user, otp, otpExpiryMinutes, settings.emailSenderName);

    return res.status(200).json({
      success: true,
      message: `OTP sent to your email. Valid for ${otpExpiryMinutes} minutes.`,
    });
  } catch (err) {
    console.error("[ForgotPassword] Error:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "OTP must be exactly 6 digits." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+passwordResetOTP +passwordResetOTPExpiry +passwordResetToken +passwordResetTokenExpiry"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
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
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
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
    console.error("[VerifyOTP] Error:", err);
    res.status(500).json({ success: false, message: "Verification failed. Please try again." });
  }
};

// ── Reset Password ─────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken) {
      return res.status(400).json({ success: false, message: "Invalid reset session. Please start over." });
    }
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "Please fill in both password fields." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    const settings = await Settings.getSingleton();
    const minLength = settings.passwordMinLength || 8;

    if (newPassword.length < minLength) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${minLength} characters long.`,
      });
    }
    if (settings.passwordRequireUppercase && !/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one uppercase letter." });
    }
    if (settings.passwordRequireNumber && !/\d/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one number." });
    }
    if (settings.passwordRequireSpecial && !/[@$!%*?&#]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one special character." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+password +passwordResetToken +passwordResetTokenExpiry"
    );

    if (!user || !user.passwordResetToken) {
      return res.status(400).json({ success: false, message: "Reset session not found. Please request a new OTP." });
    }
    if (user.passwordResetTokenExpiry < new Date()) {
      user.passwordResetToken = null;
      user.passwordResetTokenExpiry = null;
      await user.save();
      return res.status(400).json({ success: false, message: "Reset session expired. Please request a new OTP." });
    }

    const isTokenValid = await bcrypt.compare(resetToken, user.passwordResetToken);
    if (!isTokenValid) {
      return res.status(400).json({ success: false, message: "Invalid reset token. Please start over." });
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

    // Send success confirmation email
    if (settings.emailEnabled) {
      sendPasswordResetSuccessEmail(user, settings.emailSenderName).catch(
        (err) => console.error("[ResetPassword] Email failed:", err.message)
      );
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now log in.",
    });
  } catch (err) {
    console.error("[ResetPassword] Error:", err);
    res.status(500).json({ success: false, message: "Password reset failed. Please try again." });
  }
};

// ── Verify Email ───────────────────────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "OTP must be exactly 6 digits." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+emailVerificationOTP +emailVerificationOTPExpiry +emailVerificationAttempts"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified. Please login." });
    }
    if (!user.emailVerificationOTP) {
      return res.status(400).json({
        success: false,
        message: "No verification code found. Please request a new one.",
      });
    }
    if (user.emailVerificationOTPExpiry < new Date()) {
      user.emailVerificationOTP = null;
      user.emailVerificationOTPExpiry = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Verification code expired. Please request a new one.",
      });
    }
    if (user.emailVerificationAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new code.",
      });
    }

    const isValid = await verifyOTPCode(otp, user.emailVerificationOTP);
    if (!isValid) {
      user.emailVerificationAttempts += 1;
      await user.save();
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${5 - user.emailVerificationAttempts} attempts remaining.`,
      });
    }

    // Mark verified
    user.isEmailVerified = true;
    user.emailVerificationOTP = null;
    user.emailVerificationOTPExpiry = null;
    user.emailVerificationAttempts = 0;
    user.lastOTPSentAt = null;
    await user.save();

    // Send verified success email
    const settings = await Settings.getSingleton();
    if (settings.emailEnabled) {
      sendEmailVerifiedSuccessEmail(user, settings.emailSenderName).catch(
        (err) => console.error("[VerifyEmail] Success email failed:", err.message)
      );
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return res.json({
      success: true,
      message: "Email verified successfully! Welcome aboard!",
      accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (err) {
    console.error("[VerifyEmail] Error:", err);
    res.status(500).json({ success: false, message: "Verification failed. Please try again." });
  }
};

const resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+emailVerificationOTP +emailVerificationOTPExpiry +emailVerificationAttempts"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified. Please login." });
    }

    const cooldownCheck = canResendOTP(user.lastOTPSentAt, 60);
    if (!cooldownCheck.canResend) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${cooldownCheck.waitSeconds} seconds before requesting a new code.`,
        waitSeconds: cooldownCheck.waitSeconds,
      });
    }

    const settings = await Settings.getSingleton();
    const otpExpiryMinutes = settings.otpExpiryMinutes || 10;

    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);

    user.emailVerificationOTP = hashedOTP;
    user.emailVerificationOTPExpiry = getOTPExpiry(otpExpiryMinutes);
    user.emailVerificationAttempts = 0;
    user.lastOTPSentAt = new Date();
    await user.save();

    if (settings.emailEnabled) {
      sendEmailVerificationOTP(user, otp, otpExpiryMinutes, settings.emailSenderName).catch(
        (err) => console.error("[ResendOTP] Email failed:", err.message)
      );
    }

    return res.json({
      success: true,
      message: `New verification code sent! Valid for ${otpExpiryMinutes} minutes.`,
      otpExpiryMinutes,
    });
  } catch (err) {
    console.error("[ResendOTP] Error:", err);
    res.status(500).json({ success: false, message: "Failed to resend code. Please try again." });
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
  verifyEmail,
  resendVerificationOTP,
};