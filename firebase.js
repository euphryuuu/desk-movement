// ══════════════════════════════════════
// Firebase
// ══════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyDkHRhfkNDLvqrGuPb5L9m3N8f8s1HVWM0",
  authDomain: "school-desk-f3589.firebaseapp.com",
  databaseURL: "https://school-desk-f3589-default-rtdb.firebaseio.com",
  projectId: "school-desk-f3589",
  storageBucket: "school-desk-f3589.firebasestorage.app",
  messagingSenderId: "97046400522",
  appId: "1:97046400522:web:4f8719c9f8fbd67520d9f3"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const DB_PATH = "/plannerData";
let isSyncing = false;

function setOnline(on) {
  document.getElementById("syncDot").className = "sync-dot" + (on?" on":"");
  document.getElementById("syncLabel").textContent = on ? "Firebase同期中" : "接続中...";
}

// ══════════════════════════════════════
// State
// ══════════════════════════════════════
