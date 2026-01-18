
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// -------------------------------------------------------------------------
// [사용자 설정 구간] Firebase Console에서 복사한 설정값을 아래에 붙여넣으세요.
// 가이드: 로그인 화면 우측 상단의 'Firebase 연동 가이드' 버튼을 참고하세요.
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

// API Key가 올바르게 설정되었는지 확인합니다.
// 키가 존재하고 비어있지 않으면 설정된 것으로 간주합니다.
const isConfigured = 
  !!firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
  firebaseConfig.apiKey !== "";

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
    
    if (typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.warn("Analytics initialization skipped (environment support check)");
      }
    }

    console.log("%c🔥 [Firebase] 연결 시도 중... (Live Mode)", "color: #10B981; font-weight: bold; font-size: 14px;");
  } catch (e) {
    console.error("%c⚠️ [Firebase] 초기화 오류 (Mock 모드로 전환됨)", "color: #EF4444; font-weight: bold;");
    console.error(e);
    isMockMode = true;
    db = null;
    auth = null;
  }
} else {
  console.warn("%c⚠️ [System] Firebase 설정이 입력되지 않았습니다. (Mock Data Mode)", "color: #F59E0B; font-weight: bold;");
  console.warn("firebaseConfig.ts 파일을 열어 설정값을 입력해주세요.");
  db = null;
  auth = null;
}

export { db, auth, analytics };
