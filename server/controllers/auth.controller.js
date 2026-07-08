const User     = require("../models/User");
const Settings = require("../models/Settings");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const bcrypt   = require("bcryptjs");

const { validateEmail } = require("../utils/emailValidator");
const {
  generateOTP,
  hashOTP,
  verifyOTP: verifyOTPCode,
  getOTPExpiry,
  canResendOTP,
} = require("../utils/otpGenerator");
const {
  sendPasswordResetOTPEmail,
  sendPasswordResetSuccessEmail,
  sendEmailVerificationOTP,
  sendEmailVerifiedSuccessEmail,
} = require("../services/email.service");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");

// ── Build safe user response object ──────────────────────
const buildUserResponse = (user) => ({
  id:       user._id,
  name:     user.name,
  email:    user.email,
  role:     user.role,
  avatar:   user.avatar,
  phone:    user.phone,
  bio:      user.bio,
  course:   user.course,
  year:     user.year,
  category: user.category,
  provider: user.provider,
});

// ── Register ──────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, phone, password, course, year } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long.",
      });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({
        success: false,
        message: emailCheck.reason,
      });
    }
    const cleanEmail = emailCheck.email;

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

    const settings  = await Settings.getSingleton();
    const minLength = settings.passwordMinLength || 8;

    if (password.length < minLength) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${minLength} characters long.`,
      });
    }

    if (settings.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one uppercase letter.",
      });
    }

    if (settings.passwordRequireNumber && !/\d/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one number.",
      });
    }

    if (settings.passwordRequireSpecial && !/[@$!%*?&#]/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one special character (@$!%*?&#).",
      });
    }

    const exists = await User.findOne({ email: cleanEmail });
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

    // ✅ Role is always "user" — never assigned from email domain
    const userData = {
      name:            name.trim(),
      email:           cleanEmail,
      phone,
      password,
      role:            "user",
      isEmailVerified: false,
    };

    // Only add course/year for student accounts
    if (course) userData.course = course;
    if (year)   userData.year   = year;

    const otpExpiryMinutes = settings.otpExpiryMinutes || 10;
    const otp              = generateOTP();
    const hashedOTP        = await hashOTP(otp);

    userData.emailVerificationOTP        = hashedOTP;
    userData.emailVerificationOTPExpiry  = getOTPExpiry(otpExpiryMinutes);
    userData.lastOTPSentAt               = new Date();

    const user = await User.create(userData);

    if (settings.emailEnabled) {
      await sendEmailVerificationOTP(
        user,
        otp,
        otpExpiryMinutes,
        settings.emailSenderName
      );
    }

    res.status(201).json({
      success:              true,
      message:              "Registration successful! Please check your email for the verification code.",
      requiresVerification: true,
      email:                cleanEmail,
      otpExpiryMinutes,
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
    });
  }
};

// ── Login ─────────────────────────────────────────────────
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

    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockUntil - new Date()) / (1000 * 60)
      );
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      const daysLeft = Math.ceil(
        (user.suspendedUntil - new Date()) / (1000 * 60 * 60 * 24)
      );
      return res.status(403).json({
        success: false,
        message:        `Your account is suspended. Try again in ${daysLeft} day(s).`,
        suspendedUntil: user.suspendedUntil,
        reason:         user.suspensionReason || "",
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
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil     = new Date(Date.now() + 30 * 60 * 1000);
        user.loginAttempts = 0;
        await user.save();
        return res.status(423).json({
          success: false,
          message: "Too many failed attempts. Account locked for 30 minutes.",
        });
      }

      await user.save();
      return res.status(401).json({
        success: false,
        message: `Incorrect password. ${5 - user.loginAttempts} attempt(s) remaining.`,
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message:              "Please verify your email address to login.",
        requiresVerification: true,
        email:                user.email,
      });
    }

    user.loginAttempts = 0;
    user.lockUntil     = null;
    user.lastLoginAt   = new Date();
    user.lastLoginIP   = req.ip;
    await user.save();

    const accessToken  = generateAccessToken(user._id);
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
    });
  }
};

// ── Social Login ──────────────────────────────────────────
const socialLogin = async (req, res) => {
  try {
    const {
      idToken,
      email:    clientEmail,
      name:     clientName,
      avatar:   clientAvatar,
      provider: clientProvider,
    } = req.body;

    if (!idToken && !clientEmail) {
      return res.status(400).json({
        success: false,
        message: "Authentication data missing.",
      });
    }

    let decoded = null;

    if (idToken) {
      try {
        const admin = require("../config/firebaseadmin");
        decoded     = await admin.auth().verifyIdToken(idToken);
      } catch {
        // Silent fallback to client-provided data
      }
    }

    const email = decoded?.email || clientEmail || "";

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "No email found. Please try another login method.",
      });
    }

    const name   = decoded?.name    || clientName   || email.split("@")[0];
    const avatar = decoded?.picture || clientAvatar || "";

    const rawProvider = clientProvider ||
      decoded?.firebase?.sign_in_provider || "google";

    const providerMap = {
      "google.com":   "google",
      "github.com":   "github",
      "facebook.com": "facebook",
      "twitter.com":  "twitter",
      google:         "google",
      github:         "github",
      facebook:       "facebook",
      twitter:        "twitter",
    };

    const provider = providerMap[rawProvider] || "google";

    let user = await User.findOne({ email });

    if (!user) {
      // ✅ Always create as "user" — no email domain role check
      user = await User.create({
        name,
        email,
        // ✅ Use crypto for random password — this is correct usage
        // Social login users never use this password
        password:        crypto.randomBytes(32).toString("hex"),
        role:            "user",
        provider,
        avatar,
        isEmailVerified: true,
      });
    }

    if (user.suspendedUntil && user.suspendedUntil > new Date()) {
      const daysLeft = Math.ceil(
        (user.suspendedUntil - new Date()) / (1000 * 60 * 60 * 24)
      );
      return res.status(403).json({
        success: false,
        message:        `Account suspended. Try again in ${daysLeft} day(s).`,
        suspendedUntil: user.suspendedUntil,
        reason:         user.suspensionReason || "",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact admin.",
      });
    }

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: buildUserResponse(user),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Social login failed.",
    });
  }
};

// ── Refresh Token ─────────────────────────────────────────
const refreshTokenController = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }
    const decoded     = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = generateAccessToken(decoded.id);
    res.json({ success: true, accessToken });
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

// ── Get current user ──────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch {
    res.status(500).json({ success: false, message: "Failed to get user" });
  }
};

// ── Forgot Password ───────────────────────────────────────
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

    const settings = await Settings.getSingleton();

    if (!settings.emailEnabled) {
      return res.status(503).json({
        success: false,
        message: "Email service is currently disabled. Please contact admin.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select(
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

    // ✅ Use utility functions — consistent with rest of app
    const otp       = generateOTP();
    const hashedOTP = await hashOTP(otp);
    const expiry    = getOTPExpiry(otpExpiryMinutes);

    user.passwordResetOTP          = hashedOTP;
    user.passwordResetOTPExpiry    = expiry;
    user.passwordResetToken        = null;
    user.passwordResetTokenExpiry  = null;
    await user.save();

    await sendPasswordResetOTPEmail(
      user,
      otp,
      otpExpiryMinutes,
      settings.emailSenderName
    );

    return res.status(200).json({
      success: true,
      message: `OTP sent to your email. Valid for ${otpExpiryMinutes} minutes.`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

// ── Verify OTP ────────────────────────────────────────────
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

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select(
      "+passwordResetOTP +passwordResetOTPExpiry +passwordResetToken +passwordResetTokenExpiry"
    );

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
      user.passwordResetOTP         = null;
      user.passwordResetOTPExpiry   = null;
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

    // ✅ crypto used correctly here — generating secure reset token
    const rawToken    = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const tokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.passwordResetOTP          = null;
    user.passwordResetOTPExpiry    = null;
    user.passwordResetToken        = hashedToken;
    user.passwordResetTokenExpiry  = tokenExpiry;
    await user.save();

    return res.status(200).json({
      success:    true,
      message:    "OTP verified successfully. You can now set a new password.",
      resetToken: rawToken,
      email:      user.email,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Verification failed. Please try again.",
    });
  }
};

// ── Reset Password ────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset session. Please start over.",
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please fill in both password fields.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    const settings  = await Settings.getSingleton();
    const minLength = settings.passwordMinLength || 8;

    if (newPassword.length < minLength) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${minLength} characters long.`,
      });
    }

    if (settings.passwordRequireUppercase && !/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one uppercase letter.",
      });
    }

    if (settings.passwordRequireNumber && !/\d/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one number.",
      });
    }

    if (settings.passwordRequireSpecial && !/[@$!%*?&#]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one special character (@$!%*?&#).",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password +passwordResetToken +passwordResetTokenExpiry");

    if (!user || !user.passwordResetToken) {
      return res.status(400).json({
        success: false,
        message: "Reset session not found. Please request a new OTP.",
      });
    }

    if (user.passwordResetTokenExpiry < new Date()) {
      user.passwordResetToken        = null;
      user.passwordResetTokenExpiry  = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Reset session expired. Please request a new OTP.",
      });
    }

    const isTokenValid = await bcrypt.compare(resetToken, user.passwordResetToken);
    if (!isTokenValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token. Please start over.",
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your current password.",
      });
    }

    user.password                  = newPassword;
    user.passwordResetToken        = null;
    user.passwordResetTokenExpiry  = null;
    await user.save();

    if (settings.emailEnabled) {
      await sendPasswordResetSuccessEmail(user, settings.emailSenderName);
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successful! You can now log in.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Password reset failed. Please try again.",
    });
  }
};

// ── Verify Email ──────────────────────────────────────────
const verifyEmail = async (req, res) => {
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

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select(
      "+emailVerificationOTP +emailVerificationOTPExpiry +emailVerificationAttempts"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified. Please login.",
      });
    }

    if (!user.emailVerificationOTP) {
      return res.status(400).json({
        success: false,
        message: "No verification code found. Please request a new one.",
      });
    }

    if (user.emailVerificationOTPExpiry < new Date()) {
      user.emailVerificationOTP        = null;
      user.emailVerificationOTPExpiry  = null;
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

    user.isEmailVerified             = true;
    user.emailVerificationOTP        = null;
    user.emailVerificationOTPExpiry  = null;
    user.emailVerificationAttempts   = 0;
    user.lastOTPSentAt               = null;
    await user.save();

    const settings = await Settings.getSingleton();
    if (settings.emailEnabled) {
      await sendEmailVerifiedSuccessEmail(user, settings.emailSenderName);
    }

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success:      true,
      message:      "Email verified successfully! Welcome aboard!",
      accessToken,
      refreshToken,
      user:         buildUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Verification failed. Please try again.",
    });
  }
};

// ── Resend Verification OTP ───────────────────────────────
const resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select(
      "+emailVerificationOTP +emailVerificationOTPExpiry +emailVerificationAttempts"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified. Please login.",
      });
    }

    const cooldownCheck = canResendOTP(user.lastOTPSentAt, 60);
    if (!cooldownCheck.canResend) {
      return res.status(429).json({
        success: false,
        message:     `Please wait ${cooldownCheck.waitSeconds} seconds before requesting a new code.`,
        waitSeconds: cooldownCheck.waitSeconds,
      });
    }

    const settings        = await Settings.getSingleton();
    const otpExpiryMinutes = settings.otpExpiryMinutes || 10;

    const otp       = generateOTP();
    const hashedOTP = await hashOTP(otp);

    user.emailVerificationOTP        = hashedOTP;
    user.emailVerificationOTPExpiry  = getOTPExpiry(otpExpiryMinutes);
    user.emailVerificationAttempts   = 0;
    user.lastOTPSentAt               = new Date();
    await user.save();

    if (settings.emailEnabled) {
      await sendEmailVerificationOTP(
        user,
        otp,
        otpExpiryMinutes,
        settings.emailSenderName
      );
    }

    res.json({
      success:         true,
      message:         `New verification code sent! Valid for ${otpExpiryMinutes} minutes.`,
      otpExpiryMinutes,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to resend code. Please try again.",
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
  verifyEmail,
  resendVerificationOTP,
};