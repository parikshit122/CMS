const { adminAuth } = require("../../src/lib/firebase-admin.ts");

// Export getAuth() instance directly so callers do: admin.verifyIdToken(token)
module.exports = adminAuth;
