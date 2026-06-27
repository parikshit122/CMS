const admin = require("firebase-admin");

const initFirebaseAdmin = () => {
  if (admin.apps.length) return admin;

  try {
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
      console.log("Firebase Admin initialized via env variables");
    } else {
      console.warn("Firebase Admin env variables missing - social login will not work");
    }
  } catch (err) {
    console.error("Firebase Admin init error:", err.message);
  }

  return admin;
};

module.exports = initFirebaseAdmin();