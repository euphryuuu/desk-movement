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
let firebaseStarted = false;
let firstLoad = true;
let saveTimer;

function setOnline(on) {
  const dot = document.getElementById("syncDot");
  const label = document.getElementById("syncLabel");
  if (!dot || !label) return;
  dot.className = "sync-dot" + (on ? " on" : "");
  label.textContent = on ? "自動保存・同期中" : "接続中...";
}

function syncToFB() {
  if (isSyncing || !firebaseStarted) return;
  isSyncing = true;
  return db.ref(DB_PATH).set({
    rooms: STATE.rooms, stocks: STATE.stocks, aiPlan: STATE.aiPlan,
    layoutOld: STATE.layoutOld, layoutNew: STATE.layoutNew, updatedAt: Date.now()
  }).then(() => setOnline(true))
    .catch(() => setOnline(false))
    .finally(() => { isSyncing = false; });
}

function startFirebaseSync() {
  if (firebaseStarted) return;
  firebaseStarted = true;

  db.ref(DB_PATH).on("value", snap => {
    if (isSyncing) return;
    const data = snap.val();
    setOnline(true);
    if (!data) {
      if (firstLoad) { firstLoad = false; syncToFB(); renderAll(); }
      return;
    }
    if (data.rooms) STATE.rooms = data.rooms;
    if (data.stocks) STATE.stocks = data.stocks;
    if (data.aiPlan !== undefined) STATE.aiPlan = data.aiPlan;
    if (data.layoutOld) STATE.layoutOld = data.layoutOld;
    if (data.layoutNew) STATE.layoutNew = data.layoutNew;
    renderAll();
    if (!firstLoad) showToast("🔄 データが更新されました");
    firstLoad = false;
  });

  db.ref(".info/connected").on("value", snap => setOnline(snap.val() === true));
}

function saveAndSync() {
  renderAll();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(syncToFB, 400);
}

// ══════════════════════════════════════
// State
// ══════════════════════════════════════
