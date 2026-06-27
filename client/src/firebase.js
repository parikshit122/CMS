import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  FacebookAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";

// ✅ Use environment variables (more secure)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// ✅ Ensure session persists across redirects (CRITICAL for mobile)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Firebase persistence error:", err);
});

// ✅ Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// ✅ GitHub Provider
export const githubProvider = new GithubAuthProvider();
githubProvider.addScope("user:email");

// ✅ Twitter Provider
export const twitterProvider = new TwitterAuthProvider();

// ✅ Facebook Provider
export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope("email");

// ✅ Detect mobile devices
export const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};