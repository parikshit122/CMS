const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
};

const generateAccessToken = async (userId) => {
  const settings = await Settings.getSingleton();
  const timeoutMinutes = settings.sessionTimeoutMinutes || 15;
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: `${timeoutMinutes}m`,
  });
};

module.exports = { generateToken, generateRefreshToken };