
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// User provided configuration (Hardcoded for stability)
const firebaseConfig = {
  apiKey: "AIzaSyD7SFyIl_vM_Xy4PlPavHfla0C7JwMhZ4s",
  authDomain: "gen-lang-client-0655618246.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0655618246-default-rtdb.firebaseio.com",
  projectId: "gen-lang-client-0655618246",
  storageBucket: "gen-lang-client-0655618246.firebasestorage.app",
  messagingSenderId: "634141617126",
  appId: "1:634141617126:web:170cb4fd4b2b3ef7a60427",
  measurementId: "G-C4GDY5BFFN"
};

// Check if configured: requires at least an API Key to attempt connection
export const isMockMode = !firebaseConfig.apiKey || firebaseConfig.apiKey === '';

let app;
let db: any;

if (!isMockMode) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("🔥 [Firebase] Initialized successfully in Live Mode using provided keys.");
  } catch (e) {
    console.warn("⚠️ [Firebase] Initialization failed. Falling back to Mock Mode safely.");
    console.error(e);
    // Fallback to mock mode if initialization fails despite keys being present
    db = null;
  }
} else {
  console.log("⚠️ [System] Running in Mock Mode (No Firebase Keys found). Data will be local only.");
  db = null;
}

export { db };
