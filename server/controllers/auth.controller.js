"use strict";

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebaseadmin");
const {
  findUserById,
  findUserByEmail,
  findUserByPhone,
  createUser,
  getOrCreateFirebaseUser,
  updateUserById,
  comparePassword,
  incrementLoginAttempts,
  resetLoginAttempts,
} = require("../../src/db/users.ts");
const { getSettingsSingleton } = require("../../src/db/settings.ts");

const {
  generateAccessToken,
  generateRefreshToken,
  getJwtRefreshSecret,
} = require("../utils/generateToken");
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
  id: user.id,
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

// ── Register ──────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, message: emailCheck.reason });
    }

    const settings = await getSettingsSingleton();

    const existingEmail = await findUserByEmail(emailCheck.email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: existingEmail.isEmailVerified
          ? "An account with this email already exists. Please login."
          : "An account with this email exists but is not verified. Please check your inbox.",
      });
    }

    if (phone) {
      const existingPhone = await findUserByPhone(String(phone));
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: "This phone number is already registered.",
        });
      }
    }

    const emailServiceReady = Boolean(
      settings.emailEnabled && process.env.BREVO_API_KEY && process.env.EMAIL_FROM
    );

    const createdUser = await createUser({
      name: name.trim(),
      email: emailCheck.email,
      phone: phone || null,
      password,
      provider: "local",
      isEmailVerified: !emailServiceReady,
    });

    if (!emailServiceReady) {
      const accessToken = generateAccessToken(createdUser._id);
      const refreshToken = generateRefreshToken(createdUser._id);

      return res.status(201).json({
        success: true,
        message: "Account created successfully!",
        requiresVerification: false,
        accessToken,
        refreshToken,
        user: buildUserResponse(createdUser),
      });
    }

    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);
    const otpExpiryMins = settings.otpExpiryMinutes || 10;

    const user = await updateUserById(createdUser.id, {
      emailVerificationOTP: hashedOTP,
      emailVerificationOTPExpiry: getOTPExpiry(otpExpiryMins),
      emailVerificationAttempts: 0,
      lastOTPSentAt: new Date(),
    });

    sendWelcomeEmail(user, otp, otpExpiryMins, settings.emailSenderName).catch(
      (err) => console.error("[Register] Email failed:", err.message)
    );

    return res.status(201).json({
      success: true,
      message: "Account created! Please check your email for the verification code.",
      requiresVerification: true,
      otpExpiryMinutes: otpExpiryMins,
      email: user.email,
    });
  } catch (err) {
    if (err.code === "UNIQUE_VIOLATION") {
      return res.status(409).json({
        success: false,
        message: `This ${err.field || "field"} is already registered.`,
      });
    }
    console.error("[Register] Error:", err);
    res.status(500).json({ success: false, message: "Registration failed. Please try again." });
  }
};

// ── Login ─────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await findUserByEmail(email.toLowerCase().trim(), {
      includeSensitive: true,
    });

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

    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.lockUntil) - new Date()) / (1000 * 60));
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      const settings = await getSettingsSingleton();
      const maxAttempts = settings.maxLoginAttempts || 5;
      const updated = await incrementLoginAttempts(user.id, maxAttempts);
      const isNowLocked = Boolean(updated?.lockUntil && new Date(updated.lockUntil) > new Date());
      const remaining = isNowLocked ? 0 : Math.max(0, maxAttempts - (updated?.loginAttempts || 0));
      return res.status(401).json({
        success: false,
        message: remaining > 0
          ? `Incorrect password. ${remaining} attempt(s) remaining.`
          : "Account locked due to too many failed attempts. Try again in 30 minutes.",
      });
    }

    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
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
      const settings = await getSettingsSingleton();
      const cooldown = canResendOTP(user.lastOTPSentAt, 60);
      let otpMessage = "";

      if (cooldown.canResend) {
        const otp = generateOTP();
        const hashedOTP = await hashOTP(otp);
        const otpExpiryMins = settings.otpExpiryMinutes || 10;

        await updateUserById(user.id, {
          emailVerificationOTP: hashedOTP,
          emailVerificationOTPExpiry: getOTPExpiry(otpExpiryMins),
          emailVerificationAttempts: 0,
          lastOTPSentAt: new Date(),
        });

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
        requiresVerification: true,
        email: user.email,
      });
    }

    const freshUser = await resetLoginAttempts(user.id, req.ip);

    const accessToken = generateAccessToken(freshUser._id);
    const refreshToken = generateRefreshToken(freshUser._id);

    return res.json({
      success: true,
      message: "Login successful.",
      accessToken,
      refreshToken,
      user: buildUserResponse(freshUser),
    });
  } catch (err) {
    console.error("[Login] Error:", err);
    res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
};

// ── Social Login (Firebase Auth -> PostgreSQL Upsert) ─────
const socialLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: "ID token is required." });
    }

    if (!admin) {
      return res.status(503).json({
        success: false,
        message: "Social login is not configured on this server.",
      });
    }

    const decoded = await admin.verifyIdToken(idToken);
    let { email, name, picture, firebase, uid } = decoded;
    const provider =
      firebase?.sign_in_provider?.replace(".com", "") || req.body.provider || "google";

    if (!email && uid) {
      try {
        const userRecord = await admin.getUser(uid);
        email =
          userRecord.email ||
          (userRecord.providerData && userRecord.providerData[0]?.email);
      } catch (err) {
        console.error("[SocialLogin] Error fetching user record:", err.message);
      }
    }

    name = name || req.body.name || email?.split("@")[0];
    picture = picture || req.body.avatar || "";

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email not provided by social provider. Please ensure your email is public or verified.",
      });
    }

    const { user, created } = await getOrCreateFirebaseUser({
      uid,
      email: email.toLowerCase(),
      name: name || email.split("@")[0],
      avatar: picture || "",
      provider,
    });

    if (created) {
      const settings = await getSettingsSingleton();
      if (settings.emailEnabled) {
        sendEmailVerifiedSuccessEmail(user, settings.emailSenderName).catch((err) =>
          console.error("[SocialLogin] Welcome email failed:", err.message)
        );
      }
    } else {
      if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended.",
          suspendedUntil: user.suspendedUntil,
          reason: user.suspensionReason,
        });
      }
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account deactivated. Please contact admin.",
        });
      }
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

// ── Refresh Token ─────────────────────────────────────────
const refreshTokenController = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }
    const decoded = jwt.verify(refreshToken, getJwtRefreshSecret());
    if (!decoded?.id) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    const user = await findUserById(decoded.id, { includeSensitive: true });
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account deactivated. Please contact admin.",
      });
    }
    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      return res.status(403).json({
        success: false,
        message: "Account suspended.",
        suspendedUntil: user.suspendedUntil,
      });
    }
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      return res.status(423).json({ success: false, message: "Account temporarily locked." });
    }

    const accessToken = generateAccessToken(user._id);
    res.json({ success: true, accessToken });
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

// ── Get Me ────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
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
      return res.status(400).json({ success: false, message: "Please enter your email address." });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, message: emailCheck.reason });
    }

    const settings = await getSettingsSingleton();

    if (!settings.emailEnabled || !process.env.BREVO_API_KEY || !process.env.EMAIL_FROM) {
      return res.status(503).json({
        success: false,
        message: "Email service is not configured yet. Please add Brevo keys in server settings or contact admin.",
      });
    }

    const user = await findUserByEmail(emailCheck.email, { includeSensitive: true });

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

    if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
      return res.status(403).json({
        success: false,
        message: "Your account is suspended. Please contact admin.",
      });
    }

    const otpExpiryMinutes = settings.otpExpiryMinutes || 10;
    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);
    const expiry = getOTPExpiry(otpExpiryMinutes);

    await updateUserById(user.id, {
      passwordResetOTP: hashedOTP,
      passwordResetOTPExpiry: expiry,
      passwordResetToken: null,
      passwordResetTokenExpiry: null,
    });

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

// ── Verify OTP ────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (typeof email !== "string" || !email.trim() || typeof otp !== "string" || !otp.trim()) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "OTP must be exactly 6 digits." });
    }

    const user = await findUserByEmail(email.toLowerCase().trim(), {
      includeSensitive: true,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    if (!user.passwordResetOTP) {
      return res.status(400).json({
        success: false,
        message: "No active OTP found. Please request a new OTP first.",
      });
    }

    if (new Date(user.passwordResetOTPExpiry) < new Date()) {
      await updateUserById(user.id, {
        passwordResetOTP: null,
        passwordResetOTPExpiry: null,
      });
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

    await updateUserById(user.id, {
      passwordResetOTP: null,
      passwordResetOTPExpiry: null,
      passwordResetToken: hashedToken,
      passwordResetTokenExpiry: tokenExpiry,
    });

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

// ── Reset Password ────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (typeof email !== "string" || !email.trim() || typeof resetToken !== "string" || !resetToken) {
      return res.status(400).json({ success: false, message: "Invalid reset session. Please start over." });
    }
    if (typeof newPassword !== "string" || typeof confirmPassword !== "string" || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "Please fill in both password fields." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    const settings = await getSettingsSingleton();
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
    if (settings.passwordRequireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Password must contain at least one special character." });
    }

    const user = await findUserByEmail(email.toLowerCase().trim(), {
      includeSensitive: true,
    });

    if (!user || !user.passwordResetToken) {
      return res.status(400).json({ success: false, message: "Reset session not found. Please request a new OTP." });
    }
    if (new Date(user.passwordResetTokenExpiry) < new Date()) {
      await updateUserById(user.id, {
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      });
      return res.status(400).json({ success: false, message: "Reset session expired. Please request a new OTP." });
    }

    const isTokenValid = await bcrypt.compare(resetToken, user.passwordResetToken);
    if (!isTokenValid) {
      return res.status(400).json({ success: false, message: "Invalid reset token. Please start over." });
    }

    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: "New password cannot be the same as your current password.",
        });
      }
    }

    await updateUserById(user.id, {
      password: newPassword,
      passwordResetToken: null,
      passwordResetTokenExpiry: null,
    });

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

// ── Verify Email ──────────────────────────────────────────
const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (typeof email !== "string" || !email.trim() || typeof otp !== "string" || !otp.trim()) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "OTP must be exactly 6 digits." });
    }

    const user = await findUserByEmail(email.toLowerCase().trim(), {
      includeSensitive: true,
    });

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
    if (new Date(user.emailVerificationOTPExpiry) < new Date()) {
      await updateUserById(user.id, {
        emailVerificationOTP: null,
        emailVerificationOTPExpiry: null,
      });
      return res.status(400).json({
        success: false,
        message: "Verification code expired. Please request a new one.",
      });
    }
    if ((user.emailVerificationAttempts || 0) >= 5) {
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Please request a new code.",
      });
    }

    const isValid = await verifyOTPCode(otp, user.emailVerificationOTP);
    if (!isValid) {
      const nextAttempts = (user.emailVerificationAttempts || 0) + 1;
      await updateUserById(user.id, { emailVerificationAttempts: nextAttempts });
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${5 - nextAttempts} attempts remaining.`,
      });
    }

    const verifiedUser = await updateUserById(user.id, {
      isEmailVerified: true,
      emailVerificationOTP: null,
      emailVerificationOTPExpiry: null,
      emailVerificationAttempts: 0,
      lastOTPSentAt: null,
    });

    const settings = await getSettingsSingleton();
    if (settings.emailEnabled) {
      sendEmailVerifiedSuccessEmail(verifiedUser, settings.emailSenderName).catch(
        (err) => console.error("[VerifyEmail] Success email failed:", err.message)
      );
    }

    const accessToken = generateAccessToken(verifiedUser._id);
    const refreshToken = generateRefreshToken(verifiedUser._id);

    return res.json({
      success: true,
      message: "Email verified successfully! Welcome aboard!",
      accessToken,
      refreshToken,
      user: buildUserResponse(verifiedUser),
    });
  } catch (err) {
    console.error("[VerifyEmail] Error:", err);
    res.status(500).json({ success: false, message: "Verification failed. Please try again." });
  }
};

// ── Resend Verification OTP ───────────────────────────────
const resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const user = await findUserByEmail(email.toLowerCase().trim(), {
      includeSensitive: true,
    });

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

    const settings = await getSettingsSingleton();
    const otpExpiryMinutes = settings.otpExpiryMinutes || 10;

    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);

    await updateUserById(user.id, {
      emailVerificationOTP: hashedOTP,
      emailVerificationOTPExpiry: getOTPExpiry(otpExpiryMinutes),
      emailVerificationAttempts: 0,
      lastOTPSentAt: new Date(),
    });

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
