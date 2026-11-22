import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  FacebookAuthProvider,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import firebaseAppletConfig from "../../firebase-applet-config.json";

const cleanEnv = (value) => {
  if (!value) return "";
  return String(value)
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/,+$/, "")
    .trim();
};

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY) || firebaseAppletConfig.apiKey,
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || firebaseAppletConfig.authDomain,
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID) || firebaseAppletConfig.projectId,
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || firebaseAppletConfig.storageBucket,
  messagingSenderId:
    cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || firebaseAppletConfig.messagingSenderId,
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID) || firebaseAppletConfig.appId,
  measurementId:
    cleanEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) || firebaseAppletConfig.measurementId,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

const app = hasFirebaseConfig
  ? !getApps().length
    ? initializeApp(firebaseConfig)
    : getApps()[0]
  : null;

export const auth = app ? getAuth(app) : null;

export const authReady = (async () => {
  if (!auth) return null;
  try {
    await setPersistence(auth, indexedDBLocalPersistence);
  } catch {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      // ignore persistence fallback failure
    }
  }
  return auth;
})();

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

  const userAgent = navigator.userAgent || navigator.vendor || "";
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS/i.test(
      userAgent
    );
  const isTouchDevice =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 1024;

  return isMobileUA || (isTouchDevice && isSmallScreen);
};