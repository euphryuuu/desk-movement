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
const auth = firebase.auth();
const sharedRef = db.ref("/plannerData");
const stateKeys = ["rooms", "stocks", "aiPlan", "layoutOld", "layoutNew", "stairs"];
const localKey = "desk-movement-local-data";
let defaults;
let savedState;
let sharedReady = false;
let connected = false;
let pendingWrites = 0;
let stopShared;
let sharedSession = 0;

function snapshotState() {
  return JSON.parse(JSON.stringify(Object.fromEntries(stateKeys.map(key => [key, STATE[key]]))));
}

function applyState(data) {
  Object.assign(STATE, JSON.parse(JSON.stringify(defaults)), data);
  STATE.stairs ||= {};
}

function syncStatus(message, online = false) {
  document.getElementById("syncDot").classList.toggle("on", online);
  document.getElementById("syncLabel").textContent = message;
}

function updateSharedStatus() {
  if (sharedReady) syncStatus(connected ?
    (pendingWrites ? "共有データを保存中…" : "自動保存・同期中") : "再接続を待っています", connected);
}

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function mergeFields(remote, before, after) {
  const merged = {...remote};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (sameValue(before[key], after[key])) continue;
    if (after[key] === undefined) delete merged[key];
    else merged[key] = after[key];
  }
  return merged;
}

function mergeRecords(remote, before, after) {
  const existing = new Map(Object.values(remote || {}).filter(Boolean).map(item => [item.id, item]));
  const previous = new Map(before.map(item => [item.id, item]));
  const next = new Map(after.map(item => [item.id, item]));
  for (const id of previous.keys()) {
    if (!next.has(id)) existing.delete(id);
  }
  for (const [id, item] of next) {
    if (!previous.has(id)) existing.set(id, item);
    else if (existing.has(id)) existing.set(id, mergeFields(existing.get(id), previous.get(id), item));
  }
  const remainingBefore = before.filter(item => next.has(item.id)).map(item => item.id);
  const remainingAfter = after.filter(item => previous.has(item.id)).map(item => item.id);
  if (sameValue(remainingBefore, remainingAfter)) return [...existing.values()];
  const ordered = after.map(item => existing.get(item.id)).filter(Boolean);
  return [...ordered, ...[...existing.values()].filter(item => !next.has(item.id))];
}

function updateSharedData(remote, before, after) {
  const data = mergeFields({...remote}, before, after);
  for (const key of ["rooms", "stocks"]) {
    if (!sameValue(before[key], after[key])) {
      data[key] = mergeRecords(remote[key], before[key], after[key]);
    }
  }
  data.stairs = mergeFields(remote.stairs || {}, before.stairs, after.stairs);
  data.updatedAt = Date.now();
  return data;
}

function saveAndSync() {
  const next = snapshotState();
  if (!auth.currentUser) {
    try { localStorage.setItem(localKey, JSON.stringify(next)); }
    catch { syncStatus("端末に保存できませんでした"); }
  } else if (sharedReady && !sameValue(savedState, next)) {
    const before = savedState;
    const session = sharedSession;
    savedState = next;
    pendingWrites++;
    updateSharedStatus();
    sharedRef.transaction(remote => updateSharedData(remote || defaults, before, next), undefined, false)
      .then(result => {
        if (session !== sharedSession) return;
        pendingWrites--;
        if (!pendingWrites) receiveSharedState(result.snapshot.val());
        updateSharedStatus();
      })
      .catch(() => {
        if (session !== sharedSession) return;
        pendingWrites--;
        syncStatus("共有データの保存に失敗しました");
      });
  } else if (!sharedReady) {
    try { localStorage.setItem(localKey, JSON.stringify(next)); }
    catch { syncStatus("端末に保存できませんでした"); }
    showToast("共有に接続していないため、この端末に保存しました");
  }
  renderAll();
}

function receiveSharedState(value) {
  const remote = value || {};
  const data = Object.fromEntries(stateKeys.filter(key => remote[key] !== undefined)
    .map(key => [key, remote[key]]));
  if (remote.updatedAt) {
    data.rooms ||= [];
    data.stocks ||= [];
  }
  const dirty = document.querySelector("#panel-6.active form[data-dirty]");
  applyState(data);
  savedState = snapshotState();
  sharedReady = true;
  updateSharedStatus();
  if (!dirty) renderAll();
}

function startFirebaseSync() {
  defaults = snapshotState();
  function loadLocal() {
    let data = {};
    try { data = JSON.parse(localStorage.getItem(localKey)) || {}; } catch {}
    applyState(data);
    renderAll();
  }
  loadLocal();
  syncStatus("この端末に保存");
  db.ref(".info/connected").on("value", snap => {
    connected = snap.val() === true;
    updateSharedStatus();
  });
  const button = document.getElementById("shared-login");
  const dialog = document.getElementById("shared-dialog");
  const form = document.getElementById("shared-form");
  const error = document.getElementById("shared-error");
  button.addEventListener("click", () => {
    if (auth.currentUser) {
      if (pendingWrites) {
        showToast("共有データの保存が終わるまでお待ちください");
        return;
      }
      auth.signOut();
    } else dialog.showModal();
  });
  document.getElementById("shared-cancel").addEventListener("click", () => dialog.close());
  form.addEventListener("submit", async event => {
    event.preventDefault();
    error.textContent = "";
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      await auth.signInWithEmailAndPassword(form.elements.email.value.trim(), form.elements.password.value);
      form.reset();
      dialog.close();
    } catch {
      error.textContent = "ログインできませんでした。メールアドレスとパスワード、Firebaseの認証設定を確認してください。";
    } finally {
      submit.disabled = false;
    }
  });
  auth.onAuthStateChanged(user => {
    sharedSession++;
    stopShared?.();
    sharedReady = false;
    pendingWrites = 0;
    button.textContent = user ? "共有ログアウト" : "共有ログイン";
    if (!user) {
      loadLocal();
      syncStatus("この端末に保存");
      return;
    }
    syncStatus("共有データに接続中…");
    const listener = sharedRef.on("value", snap => {
      if (!pendingWrites) receiveSharedState(snap.val());
    }, () => {
      sharedReady = false;
      syncStatus("共有データのアクセス権がありません");
    });
    stopShared = () => sharedRef.off("value", listener);
  });
}
