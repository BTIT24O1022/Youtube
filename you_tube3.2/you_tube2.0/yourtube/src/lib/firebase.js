// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// NEXT_PUBLIC_ prefix is required so Next.js includes these values in the
// browser bundle at build time (anything without that prefix stays
// server-only and would be undefined here). Firebase's web config isn't a
// true secret (it ships to every visitor's browser either way), but env
// vars let you point at a different Firebase project per environment
// without touching code.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCyxbdclt2ocA5zgE-MDy1ndYIFqVMAr30",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "yourtube-8cda9.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "yourtube-8cda9",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "yourtube-8cda9.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "921641878423",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:921641878423:web:0d65801eebaf2b25f03ad2",
};

// Initialize Firebase safely
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };
