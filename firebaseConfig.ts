
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// -------------------------------------------------------------------------
// [설정 완료] 사용자가 제공한 Firebase 설정값입니다.
// -------------------------------------------------------------------------
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

// API Key가 설정되었는지, 그리고 올바른지 확인
const isConfigured = firebaseConfig.apiKey && firebaseConfig.apiKey !== "본인의_API_KEY_를_여기에_붙여넣으세요";

export let isMockMode = !isConfigured;

let app;
let db: any;
let auth: any;
let analytics: any;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Analytics는 브라우저 환경에서만 초기화 (SSR 등 고려)
    if (typeof window !== 'undefined') {
      analytics = getAnalytics(app);
    }

    console.log("%c🔥 [Firebase] 연결 성공! (Live Mode)", "color: #10B981; font-weight: bold; font-size: 14px;");
    console.log("Connect to Project ID:", firebaseConfig.projectId);
  } catch (e) {
    console.error("%c⚠️ [Firebase] 초기화 실패 (Mock 모드로 전환됨)", "color: #EF4444; font-weight: bold;");
    console.error(e);
    isMockMode = true;
    db = null;
    auth = null;
  }
} else {
  console.warn("%c⚠️ [System] Firebase 설정이 발견되지 않았습니다. (Mock Data Mode)", "color: #F59E0B; font-weight: bold;");
  db = null;
  auth = null;
}

export { db, auth, analytics };
