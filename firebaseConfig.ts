
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Helper to safely access environment variables in various environments (Vite/Browser/Node)
const getEnv = (key: string): string => {
  // 1. Try Vite's import.meta.env
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  // 2. Try process.env (Fallback)
  try {
    // Check if process exists and has env
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  return '';
};

// Access vars
const apiKey = getEnv('VITE_FIREBASE_API_KEY');

// Check if configured: requires at least an API Key to attempt connection
export const isMockMode = !apiKey;

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

let app;
let db: any;

if (!isMockMode) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("🔥 Firebase initialized successfully (Live Mode)");
  } catch (e) {
    console.error("Firebase init failed, falling back to mock mode", e);
    db = null;
  }
} else {
  console.log("⚠️ Running in Mock Mode (No Firebase Config Found). Data is local only.");
  db = null;
}

export { db };
