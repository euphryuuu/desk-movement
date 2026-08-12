let STATE = {
  rooms:      JSON.parse(JSON.stringify(INIT_ROOMS)),
  stocks:     INIT_ROOMS.map(r => mkStock(r.id)),
  aiPlan:     "",
  layoutOld:  INIT_LAYOUT_OLD,
  layoutNew:  INIT_LAYOUT_NEW,
};
let aiSheets = [];
let dragSrc = null;

// ══════════════════════════════════════
// Firebase sync
// ══════════════════════════════════════
function syncToFB() {
  if(isSyncing) return;
  db.ref(DB_PATH).set({
    rooms:     STATE.rooms,
    stocks:    STATE.stocks,
    aiPlan:    STATE.aiPlan,
    layoutOld: STATE.layoutOld,
    layoutNew: STATE.layoutNew,
    updatedAt: Date.now()
  });
}

let firstLoad = true;
db.ref(DB_PATH).on("value", snap => {
  if(isSyncing) return;
  const data = snap.val();
  setOnline(true);

  if(!data) {
    // DBが空 → 初期データをそのまま使いFirebaseに保存
    if(firstLoad) {
      firstLoad = false;
      syncToFB();
      renderAll();
    }
    return;
  }

  if(data.rooms)     STATE.rooms     = data.rooms;
  if(data.stocks)    STATE.stocks    = data.stocks;
  if(data.aiPlan !== undefined) STATE.aiPlan = data.aiPlan;
  if(data.layoutOld) STATE.layoutOld = data.layoutOld;
  if(data.layoutNew) STATE.layoutNew = data.layoutNew;

  renderAll();
  if(!firstLoad) showToast("🔄 データが更新されました");
  firstLoad = false;
});

db.ref(".info/connected").on("value", snap => {
  setOnline(snap.val() === true);
});

function saveAndSync() {
  isSyncing = true;
  syncToFB();
  setTimeout(() => { isSyncing = false; }, 1000);
  renderAll();
}

// ══════════════════════════════════════
// Toast
// ══════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = "none"; }, 2500);
}

// ══════════════════════════════════════
// Tabs
// ══════════════════════════════════════
let currentTab = 1;
function goTab(n) {
  currentTab = n;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", +t.dataset.tab === n));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.getElementById(`panel-${n}`).classList.add("active");
  renderPanel(n);
}
function renderAll() { renderPanel(currentTab); }
function renderPanel(n) {
  if(n===1) renderPanel1();
  if(n===2) renderPanel2();
  if(n===3) renderPanel3();
  if(n===4) renderPanel4();
  if(n===5) renderPanel5();
  if(n===6) renderPanel6();
  if(n===7) renderPanel7();
}

// ══════════════════════════════════════
// Helpers
// ══════════════════════════════════════
const h = (tag, attrs={}, ...children) => {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if(k === "className") el.className = v;
    else if(k === "style") Object.assign(el.style, v);
    else if(k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  });
  children.forEach(c => {
    if(c == null) return;
    if(typeof c === "string" || typeof c === "number") el.appendChild(document.createTextNode(String(c)));
    else if(c instanceof Element) el.appendChild(c);
  });
  return el;
};

const div = (cls, ...ch) => h("div", {className: cls}, ...ch);
const span = (cls, txt) => h("span", {className: cls}, txt);
const btn = (txt, cls, onClick) => h("button", {className:"btn "+cls, onClick}, txt);

function badge(text, bg, color) {
  const el = h("span", {className:"badge"}, text);
  el.style.background = bg; el.style.color = color;
  return el;
}

function getStock(id) {
  return STATE.stocks.find(s => s.id === id) || mkStock(id);
}

function setStock(id, field, li, key, val) {
  const idx = STATE.stocks.findIndex(s => s.id === id);
  if(idx < 0) { STATE.stocks.push(mkStock(id)); return setStock(id,field,li,key,val); }
  STATE.stocks[idx][field][li][key] = val;
  saveAndSync();
}
function addLine(id, field) {
  const idx = STATE.stocks.findIndex(s => s.id === id);
  if(idx < 0) { STATE.stocks.push(mkStock(id)); return addLine(id,field); }
  if(!STATE.stocks[idx][field]) STATE.stocks[idx][field] = [];
  STATE.stocks[idx][field].push({size:"4",count:0});
  saveAndSync();
}
function removeLine(id, field, li) {
  const idx = STATE.stocks.findIndex(s => s.id === id);
  if(idx < 0) return;
  STATE.stocks[idx][field].splice(li, 1);
  saveAndSync();
}

function makeLinesEditor(id, field, label, accentColor, extraClass="") {
  const st = getStock(id);
  const lines = st[field] || [{size:"4",count:0}];
  const box = div("lines-box " + extraClass);

  const title = div("lines-title");
  title.style.color = accentColor;
  title.textContent = label;
  box.appendChild(title);

  lines.forEach((ln, li) => {
    const row = div("line-row");

    const sel = h("select", {className:"sel"});
    SIZES.forEach(s => {
      const opt = h("option", {value:s}, s+"号");
      if(s === ln.size) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => { setStock(id,field,li,"size",sel.value); });

    const inp = h("input", {type:"text", className:"inp inp-num", value: ln.count===0?"":String(ln.count), placeholder:"台数", inputMode:"numeric"});
    inp.addEventListener("focus", () => { if(inp.value==="0") inp.value=""; inp.select(); });
    inp.addEventListener("blur", () => {
      const n = parseInt(inp.value)||0;
      inp.value = n===0 ? "" : String(n);
      setStock(id,field,li,"count",n);
    });
    inp.addEventListener("input", () => {
      inp.value = inp.value.replace(/[^0-9]/g,"");
    });

    row.appendChild(sel);
    row.appendChild(inp);
    row.appendChild(span("unit","台"));

    if(lines.length > 1) {
      const rm = h("button", {className:"rm-btn"}, "×");
      rm.addEventListener("click", () => removeLine(id,field,li));
      row.appendChild(rm);
    }
    box.appendChild(row);
  });

  const addBtn = h("button", {className:"add-line-btn"}, "＋ 号数を追加");
  addBtn.style.color = accentColor;
  addBtn.addEventListener("click", () => addLine(id,field));
  box.appendChild(addBtn);
  return box;
}

// ══════════════════════════════════════
// Panel 1: 教室・人数
// ══════════════════════════════════════
function makeRoomCard(r, idx) {
  const [fbg,fcol] = FLOOR_COLORS[r.floor] || ["#eee","#666"];
  const tm = TYPES[r.type] || TYPES.normal;

  const card = div("card");
  card.style.transition = "border 0.1s, background 0.1s";
  card.setAttribute("draggable","true");
  card.dataset.idx = idx;

  card.addEventListener("dragstart", e => {
    dragSrc = idx;
    card.classList.add("drag-ghost");
    e.dataTransfer.effectAllowed = "move";
  });
  card.addEventListener("dragover", e => {
    e.preventDefault();
    document.querySelectorAll(".card.drag-over").forEach(c => c.classList.remove("drag-over"));
    card.classList.add("drag-over");
  });
  card.addEventListener("drop", e => {
    e.preventDefault();
    card.classList.remove("drag-over");
    if(dragSrc === null || dragSrc === idx) return;
    const [moved] = STATE.rooms.splice(dragSrc,1);
    STATE.rooms.splice(idx,0,moved);
    dragSrc = null;
    saveAndSync();
  });
  card.addEventListener("dragend", () => {
    dragSrc = null;
    document.querySelectorAll(".card.drag-ghost,.card.drag-over").forEach(c => {
      c.classList.remove("drag-ghost","drag-over");
    });
  });

  // Header row
  const hdr = div("card-header");
  const dragHandle = span("","⠿"); dragHandle.style.cssText="font-size:18px;color:#ccc;cursor:grab";
  hdr.appendChild(dragHandle);
  hdr.appendChild(badge(r.floor, fbg, fcol));
  hdr.appendChild(badge(tm.label, tm.bg, tm.color));
  card.appendChild(hdr);

  // Floor + Type selects
  const row1 = div("grid2"); row1.style.marginBottom="8px";
  const d1=div(""); d1.appendChild(div("lbl")["textContent="+"校舎・階",d1]&&div("lbl"));

  // Floor select
  const flDiv = div(""); flDiv.appendChild(Object.assign(div("lbl"),{textContent:"校舎・階"}));
  const flSel = h("select",{className:"sel"});
  FLOORS.forEach(f => { const o=h("option",{value:f},f); if(f===r.floor)o.selected=true; flSel.appendChild(o); });
  flSel.addEventListener("change",()=>{ STATE.rooms[idx].floor=flSel.value; saveAndSync(); });
  flDiv.appendChild(flSel);

  // Type select
  const tyDiv = div(""); tyDiv.appendChild(Object.assign(div("lbl"),{textContent:"教室タイプ"}));
  const tySel = h("select",{className:"sel"});
  Object.entries(TYPES).forEach(([v,t]) => { const o=h("option",{value:v},t.label); if(v===r.type)o.selected=true; tySel.appendChild(o); });
  tySel.addEventListener("change",()=>{ STATE.rooms[idx].type=tySel.value; saveAndSync(); });
  tyDiv.appendChild(tySel);
  row1.appendChild(flDiv); row1.appendChild(tyDiv);
  card.appendChild(row1);

  // Old / New names
  const row2 = div("grid2"); row2.style.marginBottom="8px";
  const mkField = (labelTxt, val, color, onChange) => {
    const d = div("");
    const lbl = div("lbl"); lbl.textContent = labelTxt; if(color) lbl.style.color=color;
    const inp = h("input",{type:"text",className:"inp",value:val});
    inp.addEventListener("change",()=>onChange(inp.value));
    d.appendChild(lbl); d.appendChild(inp);
    return d;
  };
  row2.appendChild(mkField("旧教室名（現在）", r.old, null, v=>{ STATE.rooms[idx].old=v; saveAndSync(); }));
  row2.appendChild(mkField("新教室名（来年度）", r.nw, "#2980b9", v=>{ STATE.rooms[idx].nw=v; saveAndSync(); }));
  card.appendChild(row2);

  // Students + Teacher (normal only)
  if(r.type==="normal") {
    const row3 = div("grid2");
    const stuDiv = div("");
    stuDiv.appendChild(Object.assign(div("lbl"),{textContent:"来年度 人数"}));
    const stuInp = h("input",{type:"text",className:"inp",value:r.students===0?"":String(r.students),placeholder:"人数",inputMode:"numeric"});
    stuInp.addEventListener("focus",()=>{ if(stuInp.value==="0") stuInp.value=""; stuInp.select(); });
    stuInp.addEventListener("blur",()=>{ const n=parseInt(stuInp.value)||0; stuInp.value=n===0?"":String(n); STATE.rooms[idx].students=n; saveAndSync(); });
    stuInp.addEventListener("input",()=>{ stuInp.value=stuInp.value.replace(/[^0-9]/g,""); });
    stuDiv.appendChild(stuInp);

    row3.appendChild(stuDiv);
    row3.appendChild(mkField("担当教員", r.teacher, null, v=>{ STATE.rooms[idx].teacher=v; saveAndSync(); }));
    card.appendChild(row3);
  } else {
    const row3 = div("grid2");
    row3.appendChild(mkField("担当教員", r.teacher, null, v=>{ STATE.rooms[idx].teacher=v; saveAndSync(); }));
    const info = div("");
    const tag = div(""); tag.style.cssText=`background:${tm.bg};color:${tm.color};padding:8px;border-radius:6px;font-size:12px;text-align:center;margin-top:20px`;
    tag.textContent = r.type==="storage" ? "机・椅子を出し入れできる保管場所" : "在庫のみ入力";
    info.appendChild(tag);
    row3.appendChild(info);
    card.appendChild(row3);
  }
  return card;
}

function renderPanel1() {
  const p = document.getElementById("panel-1");
  p.innerHTML = "";

  // Toggle button
  const topRow = div(""); topRow.style.cssText="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px";
  const txt = div(""); txt.style.cssText="font-size:13px;color:#666"; txt.textContent="教室の来年度用途・人数を入力してください。";
  const groupState = { byFloor: true };
  const toggleBtn = h("button",{className:"btn ghost"},{style:{padding:"6px 12px",fontSize:12,border:"1.5px solid #2980b9",color:"#2980b9",background:"transparent"}});
  toggleBtn.textContent = "🏫 階別";
  toggleBtn.addEventListener("click",()=>{
    groupState.byFloor = !groupState.byFloor;
    toggleBtn.textContent = groupState.byFloor ? "🏫 階別" : "📋 一覧";
    renderRooms();
  });
  topRow.appendChild(txt); topRow.appendChild(toggleBtn);
  p.appendChild(topRow);

  // Legend
  const legend = div(""); legend.style.cssText="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px";
  Object.entries(TYPES).forEach(([,t])=>{
    const s=h("span",{}); s.style.cssText=`background:${t.bg};color:${t.color};font-size:10px;padding:3px 7px;border-radius:6px;font-weight:600`;
    s.textContent=t.label; legend.appendChild(s);
  });
  p.appendChild(legend);

  const hint = div(""); hint.style.cssText="font-size:11px;color:#aaa;text-align:center;margin-bottom:8px";
  hint.textContent="⠿ をドラッグして並び替え可能"; p.appendChild(hint);

  const roomsContainer = div(""); p.appendChild(roomsContainer);

  function renderRooms() {
    roomsContainer.innerHTML="";
    if(groupState.byFloor) {
      const activeFloors = FLOORS.filter(f=>STATE.rooms.some(r=>r.floor===f));
      activeFloors.forEach(floor=>{
        const [fbg,fcol]=FLOOR_COLORS[floor]||["#eee","#666"];
        const fr=STATE.rooms.filter(r=>r.floor===floor);
        const grp=div("floor-group");
        const hdr=div("floor-header"); hdr.style.cssText=`background:${fbg};color:${fcol};border-left-color:${fcol}`;
        hdr.innerHTML=`<span>${floor}</span><span style="font-size:12px;opacity:0.7">${fr.length}教室</span>`;
        const body=div("floor-body"); body.style.cssText=`border-color:${fcol}44`;
        fr.forEach(r=>{ const idx=STATE.rooms.findIndex(x=>x.id===r.id); body.appendChild(makeRoomCard(r,idx)); });
        grp.appendChild(hdr); grp.appendChild(body);
        roomsContainer.appendChild(grp);
      });
    } else {
      STATE.rooms.forEach((r,i)=>roomsContainer.appendChild(makeRoomCard(r,i)));
    }
  }
  renderRooms();

  const btnRow = div("btn-row");
  btnRow.appendChild(h("button",{className:"btn",style:{background:"#c0392b",color:"#fff"},onClick:()=>goTab(2)},"次へ：在庫入力 →"));
  btnRow.appendChild(h("button",{className:"btn ghost",onClick:()=>{
    const id=Date.now();
    STATE.rooms.push({id,floor:"本校1F",old:"新教室",nw:"新教室",students:0,teacher:"",type:"normal"});
    STATE.stocks.push(mkStock(id));
    saveAndSync();
  }},"＋ 教室追加"));
  p.appendChild(btnRow);
}

// ══════════════════════════════════════
// Panel 2: 在庫入力
// ══════════════════════════════════════
function renderPanel2() {
  const p = document.getElementById("panel-2");
  p.innerHTML="";

  const note=div("info-box yellow"); note.textContent="💡 号数の目安：1年＝6号、2年＝5号、3・4年＝新3.5・新4号、5・6年＝2・3号";
  p.appendChild(note);

  STATE.rooms.forEach((r,i)=>{
    const st=getStock(r.id);
    const [fbg,fcol]=FLOOR_COLORS[r.floor]||["#eee","#666"];
    const tm=TYPES[r.type]||TYPES.normal;
    const card=div("card");

    // Header
    const hdr=div("card-header");
    hdr.appendChild(badge(r.floor,fbg,fcol));
    hdr.appendChild(badge(tm.label,tm.bg,tm.color));
    const nameSpan=h("span",{}); nameSpan.style.fontWeight="700"; nameSpan.textContent=r.old;
    hdr.appendChild(nameSpan);
    hdr.appendChild(h("span",{style:{color:"#aaa",fontSize:"12px"}},"→"));
    const nwSpan=h("span",{style:{fontWeight:"700",color:"#2980b9"}}); nwSpan.textContent=r.nw;
    hdr.appendChild(nwSpan);
    if(r.students>0){
      const stu=badge(r.students+"人","#e8f0fd","#2980b9"); stu.style.marginLeft="auto";
      hdr.appendChild(stu);
    }
    card.appendChild(hdr);

    // 現在の在庫
    const sec1=div("lbl red"); sec1.textContent="📦 現在の在庫"; sec1.style.cssText="font-size:12px;font-weight:700;color:#666;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #eee";
    card.appendChild(sec1);
    const grid1=div("grid2"); grid1.style.marginBottom="12px";
    grid1.appendChild(makeLinesEditor(r.id,"deskLines","机","#c0392b"));
    grid1.appendChild(makeLinesEditor(r.id,"chairLines","椅子","#2980b9"));
    card.appendChild(grid1);

    // 廃棄予定
    const sec2=div(""); sec2.style.cssText="font-size:12px;font-weight:700;color:#c0392b;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #eee";
    sec2.textContent="🗑 廃棄予定";
    card.appendChild(sec2);
    const grid2=div("grid2"); grid2.style.marginBottom="12px";
    grid2.appendChild(makeLinesEditor(r.id,"discardDeskLines","机（廃棄）","#c0392b","discard"));
    grid2.appendChild(makeLinesEditor(r.id,"discardChairLines","椅子（廃棄）","#c0392b","discard"));
    card.appendChild(grid2);

    // 来年度の必要数（保管室・特別教室は不要）
    if(r.type==="normal"){
      const sec3=div(""); sec3.style.cssText="font-size:12px;font-weight:700;color:#27ae60;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #eee";
      sec3.textContent="✅ 来年度に必要な号数・台数";
      card.appendChild(sec3);
      const grid3=div("grid2");
      grid3.appendChild(makeLinesEditor(r.id,"needDeskLines","机（必要）","#27ae60","need"));
      grid3.appendChild(makeLinesEditor(r.id,"needChairLines","椅子（必要）","#27ae60","need"));
      card.appendChild(grid3);
    }
    if(r.type==="storage"){
      const note=div(""); note.style.cssText="margin-top:10px;background:#e8fde8;border-radius:6px;padding:8px 12px;font-size:12px;color:#27ae60;font-weight:600";
      note.textContent="📦 余った机・椅子を入れることも、在庫を取り出して補充することもできます。";
      card.appendChild(note);
    }
    p.appendChild(card);
  });

  const btnRow=div("btn-row");
  btnRow.appendChild(h("button",{className:"btn",style:{background:"#888",color:"#fff"},onClick:()=>goTab(1)},"← 戻る"));
  btnRow.appendChild(h("button",{className:"btn",style:{background:"#c0392b",color:"#fff"},onClick:()=>goTab(3)},"配置表を確認 →"));
  p.appendChild(btnRow);
}

// ══════════════════════════════════════
// Panel 3: 配置表
// ══════════════════════════════════════
function renderPanel3() {
  const p=document.getElementById("panel-3"); p.innerHTML="";

  const results=STATE.rooms.map(r=>{
    const st=getStock(r.id);
    const hd=st.deskLines.reduce((a,l)=>a+(l.count||0),0);
    const hc=st.chairLines.reduce((a,l)=>a+(l.count||0),0);
    const nd=r.type==="storage"?hd:(st.needDeskLines||[]).reduce((a,l)=>a+(l.count||0),0);
    const nc=r.type==="storage"?hc:(st.needChairLines||[]).reduce((a,l)=>a+(l.count||0),0);
    const dOut=Math.max(0,hd-nd),cOut=Math.max(0,hc-nc),dIn=Math.max(0,nd-hd),cIn=Math.max(0,nc-hc);
    const w=(r.type==="normal"&&(nd>0||nc>0))?Math.max(2,Math.ceil((dOut+cOut+dIn+cIn)/8)):0;
    return {r,dOut,cOut,dIn,cIn,w,nd,nc};
  });

  // Summary
  const sg=div("summary-grid");
  [{l:"机 搬出合計",v:results.reduce((a,x)=>a+x.dOut,0),u:"台",c:"#c0392b"},
   {l:"椅子 搬出合計",v:results.reduce((a,x)=>a+x.cOut,0),u:"台",c:"#2980b9"},
   {l:"延べ必要人数",v:results.reduce((a,x)=>a+x.w,0),u:"人",c:"#27ae60"},
   {l:"対象教室数",v:STATE.rooms.length,u:"室",c:"#1a1a2e"}].forEach(c=>{
    const sc=div("summary-card");
    const big=div("big"); big.style.color=c.c; big.innerHTML=`${c.v}<span style="font-size:14px">${c.u}</span>`;
    sc.appendChild(big); sc.appendChild(Object.assign(div("sub"),{textContent:c.l}));
    sg.appendChild(sc);
  });
  p.appendChild(sg);

  results.forEach(({r,dOut,cOut,dIn,cIn,w,nd,nc})=>{
    const [fbg,fcol]=FLOOR_COLORS[r.floor]||["#eee","#666"];
    const tm=TYPES[r.type]||TYPES.normal;
    const hasMove=dOut||cOut||dIn||cIn;
    let status="−",sc="#aaa";
    if(r.type==="storage"){status="📦 保管室";sc="#27ae60";}
    else if(r.type==="special"){status="🎵 特別";sc="#e67e22";}
    else if(nd>0||nc>0){
      if(!hasMove){status="✅ そのまま";sc="#27ae60";}
      else if(dIn>5||cIn>5){status="⚠ 大幅不足";sc="#c0392b";}
      else if(dIn||cIn){status="△ 一部不足";sc="#e67e22";}
      else{status="○ 余り搬出";sc="#2980b9";}
    }
    const card=div("card");
    const hdr=div("card-header");
    hdr.appendChild(badge(r.floor,fbg,fcol));
    hdr.appendChild(badge(tm.label,tm.bg,tm.color));
    const ns=h("span",{style:{fontWeight:"700",fontSize:"14px"}}); ns.textContent=r.old; hdr.appendChild(ns);
    hdr.appendChild(h("span",{style:{color:"#aaa",fontSize:"12px"}},"→"));
    const nws=h("span",{style:{fontWeight:"700",color:"#2980b9"}}); nws.textContent=r.nw; hdr.appendChild(nws);
    const statusEl=div(""); statusEl.style.cssText="display:flex;gap:6px;align-items:center;margin-left:auto";
    if(w>0){const wb=badge(w+"人","#1a1a2e","#fff");statusEl.appendChild(wb);}
    const sl=h("span",{style:{fontWeight:"700",fontSize:"13px",color:sc}}); sl.textContent=status; statusEl.appendChild(sl);
    hdr.appendChild(statusEl);
    card.appendChild(hdr);

    if(r.type==="normal"){
      const g=div("grid4");
      [{l:"机 搬出",v:dOut,c:"#c0392b"},{l:"椅子 搬出",v:cOut,c:"#c0392b"},{l:"机 不足",v:dIn,c:"#e67e22"},{l:"椅子 不足",v:cIn,c:"#e67e22"}].forEach(x=>{
        const box=div(""); box.style.cssText="background:#f5f3ef;border-radius:6px;padding:7px 4px;text-align:center";
        const lbl=div(""); lbl.style.cssText="font-size:10px;color:#999;margin-bottom:2px"; lbl.textContent=x.l;
        const val=div(""); val.style.cssText=`font-size:15px;font-weight:700;color:${x.v>0?x.c:"#ccc"}`;
        val.textContent=x.v>0?x.v+"台":"−";
        box.appendChild(lbl); box.appendChild(val); g.appendChild(box);
      });
      card.appendChild(g);
    }
    if(r.teacher){const t=div(""); t.style.cssText="margin-top:8px;font-size:12px;color:#777"; t.textContent="👤 "+r.teacher; card.appendChild(t);}
    p.appendChild(card);
  });

  // AI section
  const aiBox=div("info-box purple");
  aiBox.innerHTML=`<h3 style="color:#8e44ad;margin-bottom:6px">🤖 AIが具体的な移動計画を立てます</h3>
    <p style="margin-bottom:6px">保管室・廃棄リストも含めて「どこから何台どこへ」まで自動で計算します</p>
    <p style="color:#16a085;font-size:11px;margin-bottom:12px">📝 配置メモの位置関係も考慮します</p>`;
  const aiErr=div(""); aiErr.id="ai-error-3"; aiErr.style.cssText="background:#fde8e8;border:1px solid #e0b0b0;border-radius:6px;padding:10px;color:#c0392b;font-size:13px;margin-bottom:10px;display:none";
  aiBox.appendChild(aiErr);
  const aiBtn=h("button",{className:"btn",style:{background:"#8e44ad",color:"#fff"}},"✨ AI移動計画を作成する");
  aiBtn.addEventListener("click",()=>runAI(aiBtn,aiErr));
  aiBox.appendChild(aiBtn);
  p.appendChild(aiBox);

  const btnRow=div("btn-row");
  btnRow.appendChild(h("button",{className:"btn",style:{background:"#888",color:"#fff"},onClick:()=>goTab(2)},"← 戻る"));
  p.appendChild(btnRow);
}

// ══════════════════════════════════════
// AI
// ══════════════════════════════════════
async function runAI(btn, errEl) {
  btn.disabled=true; btn.textContent="⏳ AI計画を作成中...";
  if(errEl){errEl.style.display="none";}

  const normalRooms=STATE.rooms.filter(r=>r.type==="normal");
  const storageRooms=STATE.rooms.filter(r=>r.type==="storage");
  const specialRooms=STATE.rooms.filter(r=>r.type==="special");

  const desc=r=>{
    const st=getStock(r.id);
    const f=(lines,field)=>(st[field]||[]).filter(l=>l.count>0).map(l=>`${l.size}号×${l.count}台`).join("、")||"なし";
    return `  現在の机：${f(st,"deskLines")}／椅子：${f(st,"chairLines")}\n  必要な机：${f(st,"needDeskLines")}／椅子：${f(st,"needChairLines")}\n  廃棄予定の机：${f(st,"discardDeskLines")}／椅子：${f(st,"discardChairLines")}`;
  };
  const descS=r=>{
    const st=getStock(r.id);
    const f=field=>(st[field]||[]).filter(l=>l.count>0).map(l=>`${l.size}号×${l.count}台`).join("、")||"なし";
    return `  現在の在庫　机：${f("deskLines")}／椅子：${f("chairLines")}`;
  };

  const layoutSection=(STATE.layoutOld||STATE.layoutNew)?
    `\n【校内の位置関係】\n${STATE.layoutOld?`■ 現在の配置\n${STATE.layoutOld}\n`:""} ${STATE.layoutNew?`■ 来年度の配置\n${STATE.layoutNew}\n`:""}\n※ 位置関係を考慮し、廊下でつながる隣接教室同士で移動を完結させること。\n`:"";

  const prompt=`あなたは小学校の机・椅子の移動計画を立てる専門家です。以下の情報をもとに、具体的な移動計画を立ててください。
${layoutSection}
【重要なルール】
- なるべく同じ階・近い校舎の教室同士で移動を完結させる（階またぎは最小限に）
- 各教室の指示は必ず以下の形式で書く（移動がない教室は省略）：
  ### 【旧教室名（校舎・階）】
  ・机 ○号 ○台 → 旧△△ へ
  ・椅子 ○号 ○台 → 旧△△ へ
- 教室名は必ず旧教室名（現在の名前）を使うこと。来年度の新教室名は絶対に使わない
- 廃棄予定の机・椅子は移動計画に含めず最後に廃棄リストとしてまとめる
- 保管室は出し入れ自由な在庫置き場。不足する教室には保管室から補充し、余りは保管室へ送る
- 保管室でも解決できない不足は「要手配」と明記する
- 最後に全体のポイント・注意事項と廃棄リストをまとめる

【通常教室】
${normalRooms.map(r=>`### 【${r.old}（${r.floor}）】\n${desc(r)}`).join("\n\n")}

【保管室（出し入れ自由な在庫置き場）】
${storageRooms.length>0?storageRooms.map(r=>`### 【${r.old}（${r.floor}）】\n${descS(r)}`).join("\n\n"):"（なし）"}

${specialRooms.length>0?`【特別教室（移動対象外）】\n${specialRooms.map(r=>`・${r.old}（${r.floor}）`).join("\n")}`:""}

移動計画を日本語で出力してください。`;

  try {
    const res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:prompt}]})
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data=await res.json();
    if(data.error) throw new Error(data.error.message);
    STATE.aiPlan=data.content.map(b=>b.text||"").join("");
    saveAndSync();
    goTab(4);
  } catch(e) {
    if(errEl){errEl.textContent="エラー："+e.message;errEl.style.display="block";}
    btn.disabled=false; btn.textContent="✨ AI移動計画を作成する";
  }
}

// ══════════════════════════════════════
// Panel 4: AI移動計画
// ══════════════════════════════════════
function renderPanel4() {
  const p=document.getElementById("panel-4"); p.innerHTML="";
  const box=div("info-box purple");
  box.innerHTML=`<h3 style="color:#8e44ad">🤖 AI 移動計画</h3><p style="color:#888;font-size:11px">※ AIの提案です。実際の状況に合わせてご確認ください。</p>`;
  p.appendChild(box);

  if(!STATE.aiPlan){
    const note=div("info-box yellow"); note.textContent="③の配置表画面からAI移動計画を作成してください。";
    p.appendChild(note);
  } else {
    const content=div(""); content.style.cssText="background:#fff;border:1px solid #ddd;border-radius:10px;padding:16px;margin-bottom:16px";
    STATE.aiPlan.split("\n").forEach(line=>{
      if(!line.trim()){const s=h("div",{}); s.style.height="8px"; content.appendChild(s); return;}
      const isH=/^(【|##|■|▼|●|###)/.test(line);
      const isB=/^[・•\-]/.test(line);
      const isN=line.includes("注意")||line.includes("ポイント")||line.startsWith("※");
      const el=div("ai-line"+(isH?" heading":isB?" bullet":isN?" note":" normal"));
      el.textContent=line;
      content.appendChild(el);
    });
    p.appendChild(content);
  }

  const errEl=div(""); errEl.style.cssText="background:#fde8e8;border:1px solid #e0b0b0;border-radius:6px;padding:10px;color:#c0392b;font-size:13px;margin-bottom:10px;display:none";
  p.appendChild(errEl);

  const btnRow=div("btn-row");
  btnRow.appendChild(h("button",{className:"btn",style:{background:"#888",color:"#fff"},onClick:()=>goTab(3)},"← 配置表に戻る"));
  if(STATE.aiPlan){
    const regenBtn=h("button",{className:"btn",style:{background:"#8e44ad",color:"#fff"}},"🔄 再生成する");
    regenBtn.addEventListener("click",()=>runAI(regenBtn,errEl));
    btnRow.appendChild(regenBtn);
    btnRow.appendChild(h("button",{className:"btn",style:{background:"#27ae60",color:"#fff"},onClick:()=>{makeSheets();goTab(5);}},"📄 掲示用紙を作成 →"));
  }
  p.appendChild(btnRow);
}

// ══════════════════════════════════════
// Panel 5: 掲示用紙
// ══════════════════════════════════════
function parseAIPlan(aiPlan){
  const lines=aiPlan.split("\n");
  const list=[];let cur=null;
  const cleanDest=s=>s.replace(/\s*(?:教室)?\s*へ\s*[。]?$/,"").replace(/教室$/,"").trim();
  lines.forEach(line=>{
    const stripped=line.replace(/^[#\s*\-]+/,"");
    const hm=stripped.match(/^【([^】（(→]+?)[（(]([^)）]+)[)）][^】]*】/);
    if(hm){if(cur)list.push(cur);cur={name:hm[1].trim(),floor:hm[2].trim(),moves:[],rawLines:[]};return;}
    if(!cur)return;
    const m1=line.match(/[・•\-]\s*(机|椅子)\s+([0-9新.]+号)\s+([0-9]+)台\s*[→]\s*(.+?)(?:\s*へ\s*[。]?)?$/);
    if(m1){cur.moves.push({item:m1[1],size:m1[2],count:m1[3],dest:cleanDest(m1[4])});return;}
    const m2=line.match(/[・•\-]\s*(机|椅子)\s*([0-9新.]+号)\s*([0-9]+)台\s*[→]\s*(.+?)(?:\s*へ\s*[。]?)?$/);
    if(m2){cur.moves.push({item:m2[1],size:m2[2],count:m2[3],dest:cleanDest(m2[4])});return;}
    if(line.trim())cur.rawLines.push(line.trim());
  });
  if(cur)list.push(cur);
  return list.filter(r=>r.moves.length>0||r.rawLines.some(l=>l.length>2));
}

function makeSheets(){ aiSheets=parseAIPlan(STATE.aiPlan); }

function renderPanel5(){
  const p=document.getElementById("panel-5"); p.innerHTML="";
  const box=div("info-box green");
  box.innerHTML=`<h3 style="color:#27ae60">📄 教室掲示用紙</h3><p>各教室のドアに貼る用紙のプレビューです。</p>`;
  p.appendChild(box);

  if(!aiSheets.length && STATE.aiPlan){ makeSheets(); }

  if(!aiSheets.length){
    const note=div("info-box yellow"); note.textContent="AI移動計画から教室ごとの指示を読み取れませんでした。④のAI移動計画を確認してください。";
    p.appendChild(note);
  } else {
    const countEl=div(""); countEl.style.cssText="font-size:13px;color:#555;margin-bottom:12px";
    countEl.textContent=`全${aiSheets.length}教室分を作成しました。`;
    p.appendChild(countEl);

    aiSheets.forEach(sh=>{
      const card=div("poster-card");
      const roomName=div("poster-room");
      roomName.innerHTML=sh.name+(sh.floor?`<span style="font-size:12px;font-weight:400;color:#888;margin-left:8px">(${sh.floor})</span>`:"");
      card.appendChild(roomName);

      if(sh.moves.length>0){
        sh.moves.forEach((mv,j)=>{
          const row=div("poster-move");
          if(j<sh.moves.length-1) row.style.borderBottom="1px dashed #eee";
          const item=div("poster-item"); item.style.color=mv.item==="机"?"#c0392b":"#2980b9"; item.textContent=mv.item;
          const sz=h("span",{style:{fontSize:"16px",fontWeight:"700"}}); sz.textContent=mv.size;
          const cnt=div("poster-count"); cnt.textContent=mv.count+"台";
          const dst=div("poster-dest"); dst.innerHTML=`→ <strong>${mv.dest}</strong> へ`;
          row.appendChild(item); row.appendChild(sz); row.appendChild(cnt); row.appendChild(dst);
          card.appendChild(row);
        });
      } else {
        sh.rawLines.filter(l=>!/現在|必要|在庫|ポイント|注意|※/.test(l)).forEach(l=>{
          const el=div(""); el.style.cssText="font-size:13px;color:#333;margin-bottom:4px;line-height:1.6";
          el.textContent=l; card.appendChild(el);
        });
      }
      p.appendChild(card);
    });
  }

  const btnRow=div("btn-row");
  btnRow.appendChild(h("button",{className:"btn",style:{background:"#888",color:"#fff"},onClick:()=>goTab(4)},"← AI計画に戻る"));
  btnRow.appendChild(h("button",{className:"btn ghost",onClick:()=>{makeSheets();renderPanel5();}},"🔄 再読み込み"));
  btnRow.appendChild(h("button",{className:"btn",style:{background:"#27ae60",color:"#fff"},onClick:()=>window.print()},"🖨 印刷・PDF保存"));
  p.appendChild(btnRow);

  const hint=div(""); hint.style.cssText="background:#f0f7f0;border-radius:8px;padding:10px 14px;font-size:12px;color:#555;margin-top:12px";
  hint.innerHTML="💡 「印刷・PDF保存」→ 印刷ダイアログで送信先を <strong>PDFに保存</strong> にするとPDFファイルになります。";
  p.appendChild(hint);
}

// ══════════════════════════════════════
// Panel 6: マップ
// ══════════════════════════════════════
function renderPanel6(){
  const p=document.getElementById("panel-6"); p.innerHTML="";
  const box=div("info-box orange");
  box.innerHTML=`<h3 style="color:#e67e22">🗺 教室配置マップ</h3>`;
  p.appendChild(box);

  const activeFloors=FLOORS.filter(f=>STATE.rooms.some(r=>r.floor===f));
  activeFloors.forEach(floor=>{
    const [fbg,fcol]=FLOOR_COLORS[floor]||["#eee","#666"];
    const fr=STATE.rooms.filter(r=>r.floor===floor);
    const grp=div("floor-group");
    const hdr=div("floor-header"); hdr.style.cssText=`background:${fbg};color:${fcol};border-left-color:${fcol}`;
    hdr.innerHTML=`<span>${floor}</span><span style="font-size:12px;opacity:0.7">${fr.length}教室</span>`;
    const body=div(""); body.style.cssText=`border:1px solid ${fcol}44;border-top:none;border-radius:0 0 8px 8px;padding:10px;display:flex;flex-wrap:wrap;gap:8px`;

    fr.forEach(r=>{
      const tm=TYPES[r.type]||TYPES.normal;
      const chip=div("map-room-chip");
      chip.style.cssText=`background:${tm.bg};border-color:${tm.color}44`;
      const name=div("name"); name.style.color=tm.color; name.textContent=r.old;
      chip.appendChild(name);
      if(r.old!==r.nw){const nw=div("nw"); nw.textContent="→"+r.nw; chip.appendChild(nw);}
      if(r.type==="normal"&&r.students>0){const sub=div("sub"); sub.textContent=r.students+"人"; chip.appendChild(sub);}
      if(r.type!=="normal"){const sub=div("sub"); sub.style.color=tm.color; sub.textContent=tm.label; chip.appendChild(sub);}
      body.appendChild(chip);
    });
    grp.appendChild(hdr); grp.appendChild(body);
    p.appendChild(grp);
  });
}

// ══════════════════════════════════════
// Panel 7: 配置メモ
// ══════════════════════════════════════
function renderPanel7(){
  const p=document.getElementById("panel-7"); p.innerHTML="";
  const box=div("info-box teal");
  box.innerHTML=`<h3 style="color:#16a085">📝 校内配置メモ</h3><p>教室の位置関係をAIに伝えるメモです。AI移動計画作成時に自動的に参照されます。</p>`;
  p.appendChild(box);

  const mk=(labelTxt,val,color,onChange)=>{
    const wrap=div(""); wrap.style.marginBottom="14px";
    const lbl=div("lbl"); lbl.textContent=labelTxt; lbl.style.color=color; lbl.style.fontSize="13px"; lbl.style.fontWeight="700"; lbl.style.marginBottom="6px";
    const ta=h("textarea",{className:"textarea",rows:"8"}); ta.value=val;
    ta.addEventListener("change",()=>onChange(ta.value));
    wrap.appendChild(lbl); wrap.appendChild(ta);
    return wrap;
  };

  p.appendChild(mk("■ 現在の教室配置（旧・令和7年度）",STATE.layoutOld,"#333",v=>{STATE.layoutOld=v;saveAndSync();}));
  p.appendChild(mk("■ 来年度の教室配置（新・令和8年度）",STATE.layoutNew,"#2980b9",v=>{STATE.layoutNew=v;saveAndSync();}));

  const hint=div(""); hint.style.cssText="background:#f0f7f0;border-radius:8px;padding:10px 14px;font-size:12px;color:#555;margin-bottom:16px";
  hint.textContent="💡 「西→東」「渡り廊下でつながる」など位置関係を入れるとAIの計画精度が上がります。";
  p.appendChild(hint);

  const btnRow=div("btn-row");
  btnRow.appendChild(h("button",{className:"btn ghost",onClick:()=>{STATE.layoutOld=INIT_LAYOUT_OLD;STATE.layoutNew=INIT_LAYOUT_NEW;saveAndSync();renderPanel7();showToast("デフォルトに戻しました");}},"デフォルトに戻す"));
  p.appendChild(btnRow);
}

// ══════════════════════════════════════
// Export / Import / Reset
// ══════════════════════════════════════
function exportJSON(){
  const data=JSON.stringify({...STATE,exportedAt:new Date().toISOString()},null,2);
  const blob=new Blob([data],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`机椅子計画_${new Date().toLocaleDateString("ja-JP").replace(/\//g,"-")}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast("💾 データを保存しました");
}

document.getElementById("fileInput").addEventListener("change",e=>{
  const file=e.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const d=JSON.parse(ev.target.result);
      if(d.rooms)    STATE.rooms    =d.rooms;
      if(d.stocks)   STATE.stocks   =d.stocks;
      if(d.aiPlan)   STATE.aiPlan   =d.aiPlan;
      if(d.layoutOld)STATE.layoutOld=d.layoutOld;
      if(d.layoutNew)STATE.layoutNew=d.layoutNew;
      saveAndSync();
      showToast("✅ データを読み込みました");
    }catch{showToast("❌ 読み込みに失敗しました");}
  };
  reader.readAsText(file); e.target.value="";
});

function resetAll(){
  if(!confirm("全データをリセットしますか？\n（この操作は取り消せません）"))return;
  STATE.rooms    =JSON.parse(JSON.stringify(INIT_ROOMS));
  STATE.stocks   =INIT_ROOMS.map(r=>mkStock(r.id));
  STATE.aiPlan   ="";
  STATE.layoutOld=INIT_LAYOUT_OLD;
  STATE.layoutNew=INIT_LAYOUT_NEW;
  aiSheets=[];
  saveAndSync();
  showToast("🗑 リセットしました");
}

// ══════════════════════════════════════
// Init
// ══════════════════════════════════════
renderPanel(1);