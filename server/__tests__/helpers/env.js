// Must be first — loads test env before anything else
require("dotenv").config({ path: require("path").join(__dirname, "../../.env.test") });

// Override any production settings for tests
process.env.NODE_ENV        = "test";
process.env.BCRYPT_ROUNDS   = "1";   // Fast hashing in tests
process.env.JWT_SECRET      = "test_jwt_secret_key_for_testing_only";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_key_for_testing_only";