const jwt    = require("jsonwebtoken");
const User   = require("../../models/User");

const JWT_SECRET = process.env.JWT_SECRET ||
  "test_jwt_secret_key_for_testing_only";

// ── Plain password used for all test users ────────────────
// The User model's pre-save hook will hash it automatically
const TEST_PASSWORD = "TestPass123!";

const createTestUser = async (overrides = {}) => {
  const phone = overrides.phone ||
    `${Math.floor(6000000000 + Math.random() * 3999999999)}`;

  const email = overrides.email ||
    `user_${Date.now()}_${Math.random().toString(36).slice(2)}@gmail.com`;

  // ✅ Pass plain password — pre-save hook hashes it
  const user = await User.create({
    name:            "Test User",
    email,
    password:        TEST_PASSWORD,
    role:            "user",
    isEmailVerified: true,
    isActive:        true,
    phone,
    ...overrides,
  });

  return user;
};

const createTestAdmin = async (overrides = {}) =>
  createTestUser({
    role:  "admin",
    email: `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@gmail.com`,
    ...overrides,
  });

const createTestStaff = async (overrides = {}) =>
  createTestUser({
    role:     "staff",
    email:    `staff_${Date.now()}_${Math.random().toString(36).slice(2)}@gmail.com`,
    category: "it",
    ...overrides,
  });

const generateToken = (userId) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "1d" });

const getAuthHeader = (user) => ({
  Authorization: `Bearer ${generateToken(user._id)}`,
});

// Export the plain password so tests can use it
module.exports = {
  createTestUser,
  createTestAdmin,
  createTestStaff,
  generateToken,
  getAuthHeader,
  TEST_PASSWORD,
};