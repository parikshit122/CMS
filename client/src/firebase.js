import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  FacebookAuthProvider,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  setPersistence,
  initializeAuth,
} from "firebase/auth";

const cleanEnv = (value) => {
  if (!value) return "";
  return String(value)
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/,+$/, "")
    .trim();
};

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: cleanEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID),
};

const app = initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
} catch (err) {
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch((e) =>
    console.error("Persistence error:", e)
  );
}

export { auth };

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
googleProvider.setCustomParameters({ prompt: "select_account" });

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope("user:email");

export const twitterProvider = new TwitterAuthProvider();

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope("email");

export const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
};