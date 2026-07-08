const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const generateOTP = () => {
  return String(crypto.randomInt(100000, 999999));
};

const hashOTP = async (otp) => {
  return await bcrypt.hash(otp, 10);
};

const verifyOTP = async (plainOTP, hashedOTP) => {
  return await bcrypt.compare(plainOTP, hashedOTP);
};

const getOTPExpiry = (minutes = 10) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

const canResendOTP = (lastSentAt, cooldownSeconds = 60) => {
  if (!lastSentAt) return { canResend: true, waitSeconds: 0 };

  const elapsed = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
  if (elapsed >= cooldownSeconds) {
    return { canResend: true, waitSeconds: 0 };
  }

  return {
    canResend: false,
    waitSeconds: Math.ceil(cooldownSeconds - elapsed),
  };
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
  getOTPExpiry,
  canResendOTP,
};