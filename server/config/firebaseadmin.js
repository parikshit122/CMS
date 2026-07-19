const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

try {
  if (getApps().length === 0) {
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
      console.log("✅ Firebase Admin initialized");
    } else {
      // console.warn("⚠️  Firebase env vars missing — social login disabled");
    }
  }
} catch (err) {
  console.error("❌ Firebase Admin init error:", err.message);
}

// Export getAuth() directly so callers do: admin.verifyIdToken(token)
module.exports = getApps().length ? getAuth() : null;
