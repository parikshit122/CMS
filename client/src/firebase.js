import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCPm6ooz0NeYAPWFbMyRDW_gcnJIT1Mga8",
  authDomain: "complaint-management-sys-657a3.firebaseapp.com",
  projectId: "complaint-management-sys-657a3",
  storageBucket: "complaint-management-sys-657a3.appspot.com",
  messagingSenderId: "780090821204",
  appId: "1:780090821204:web:0575c73dd57eb0db4afbc1",
  measurementId: "G-M2GL75QKLP",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope("user:email");

export const twitterProvider = new TwitterAuthProvider();

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope("email");