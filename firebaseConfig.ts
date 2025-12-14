
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Access environment variables via process.env (injected by Vite define)
const apiKey = process.env.VITE_FIREBASE_API_KEY;

// Check if configured: requires at least an API Key to attempt connection
export const isMockMode = !apiKey;

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
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
