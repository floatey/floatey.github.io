// ════════════════════════════════════════════════════════════════
//  JDM RESTORATION GARAGE — Game Engine (Pure JS, no JSX)
//  Loaded as a regular <script> after data.js.
//  Everything attaches to window.GE (Game Engine namespace).
// ════════════════════════════════════════════════════════════════
(function() {
"use strict";

const GE = {};

// ── CONDITION HELPERS ──
GE.getConditionInfo = function(c) {
  if (c === null || c === undefined) return { label: "UNKNOWN", color: "#6b7280" };
  for (const [lo, hi, label, color] of GD.CONDITION_TABLE) {
    if (c >= lo && c <= hi) return { label, color };
  }
  return { label: "???", color: "#6b7280" };
};

GE.generateArrivalCondition = function(rarity) {
  const ranges = { 3: [0.20, 0.45], 4: [0.10, 0.35], 5: [0.05, 0.25] };
  const [min, max] = ranges[rarity] || [0.15, 0.40];
  let c = min + Math.random() * (max - min);
  c += (Math.random() - 0.5) * 0.30;
  c = Math.max(0.01, Math.min(0.60, c));
  if (Math.random() < 0.08) c = 0.70 + Math.random() * 0.25;
  return parseFloat(c.toFixed(2));
};

// ── PART TREE HELPERS ──
GE.getAllParts = function(partTree) {
  const parts = [];
  for (const sys of partTree.systems) {
    if (sys.type === "detailed" && sys.subsystems) {
      for (const sub of sys.subsystems)
        for (const p of sub.parts)
          parts.push({ ...p, systemId: sys.id, subsystemId: sub.id });
    } else if (sys.type === "bundle") {
      parts.push({
        id: sys.id + "_bundle", name: sys.name, repairType: sys.repairType || "wrench",
        difficulty: sys.difficulty, canRepair: true, replaceCost: sys.bundleCost,
        sourceRarity: "common", prerequisites: [], hiddenReveal: null,
        flavorText: sys.flavorText, systemId: sys.id, subsystemId: null,
        isBundle: true, gridSize: sys.gridSize || [2,3],
      });
    }
  }
  return parts;
};

GE.initializeVehicleParts = function(partTree) {
  const allParts = GE.getAllParts(partTree);
  const inst = {};
  for (const p of allParts) {
    const isHidden = allParts.some(op => op.hiddenReveal && op.hiddenReveal.targetPartId === p.id);
    inst[p.id] = {
      condition: isHidden ? null : GE.generateArrivalCondition(partTree.rarity),
      installed: true, revealed: !isHidden, repairProgress: 0,
    };
  }
  return inst;
};

GE.getSystemCompletion = function(partTree, vehicleParts) {
  const results = {};
  for (const sys of partTree.systems) {
    let partIds = [];
    if (sys.type === "detailed" && sys.subsystems) {
      for (const sub of sys.subsystems)
        for (const p of sub.parts) partIds.push(p.id);
    } else { partIds.push(sys.id + "_bundle"); }
    const revealed = partIds.filter(id => vehicleParts[id]?.revealed);
    const done = revealed.filter(id => (vehicleParts[id]?.condition || 0) >= 0.70);
    const total = revealed.length || 1;
    results[sys.id] = { done: done.length, total, pct: Math.round((done.length / total) * 100) };
  }
  return results;
};

GE.isReadyForFirstStart = function(partTree, vehicleParts) {
  const comp = GE.getSystemCompletion(partTree, vehicleParts);
  return GD.CRITICAL_SYSTEMS.every(s => comp[s] && comp[s].pct >= 100);
};

GE.getPartTree = function(modelId) {
  return GD.PART_TREES[modelId] || GD.PART_TREES.ae86;
};

GE.getSkillTier = function(level) {
  for (const t of GD.SKILL_TIERS) { if (level >= t.min && level <= t.max) return t; }
  return GD.SKILL_TIERS[0];
};

GE.xpForLevel = function(level) { return level * 100; };

// ── GACHA ──
GE.rollGacha = function(pity4, pity5) {
  let rarity;
  if (pity5 >= 49) { rarity = 5; }
  else if (pity4 >= 19) { rarity = 4; }
  else {
    const roll = Math.random();
    if (roll < 0.10) rarity = 5;
    else if (roll < 0.40) rarity = 4;
    else rarity = 3;
  }
  const pool = GD.VEHICLES.filter(v => v.rarity === rarity);
  const vehicle = pool[Math.floor(Math.random() * pool.length)];
  return { rarity, vehicle };
};

GE.rollDailyGacha = function() {
  const pool = GD.VEHICLES.filter(v => v.rarity === 3);
  return { rarity: 3, vehicle: pool[Math.floor(Math.random() * pool.length)] };
};

// ── AUDIO ENGINE (Web Audio API synthesized) ──
GE.Audio = {
  ctx: null, enabled: true,
  init() { if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} },
  play(freq, dur, type, vol) {
    if (!this.enabled || !this.ctx) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || "square"; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(); o.stop(this.ctx.currentTime + dur);
    } catch(e) {}
  },
  click()    { this.play(800 + Math.random()*400, 0.06, "square", 0.08); },
  critical() { this.play(1200, 0.04, "square", 0.12); setTimeout(() => this.play(1600, 0.08, "sine", 0.1), 30); },
  hazard()   { this.play(200, 0.3, "sawtooth", 0.1); },
  precisionHit()  { this.play(880, 0.1, "sine", 0.1); this.play(1320, 0.15, "sine", 0.08); },
  precisionMiss() { this.play(200, 0.15, "square", 0.1); },
  diagCorrect()   { [523,659,784].forEach((f,i) => setTimeout(() => this.play(f, 0.2, "sine", 0.1), i*100)); },
  diagWrong()     { this.play(200, 0.2, "sawtooth", 0.08); this.play(150, 0.2, "sawtooth", 0.06); },
  bodyworkTick()  { this.play(400 + Math.random()*200, 0.04, "triangle", 0.05); },
  complete()      { [523,659,784,1047].forEach((f,i) => setTimeout(() => this.play(f, 0.25, "sine", 0.12), i*120)); },
  error()         { this.play(200, 0.15, "square", 0.1); },
  uiClick()       { this.play(600, 0.03, "sine", 0.06); },
  gachaReveal(r)  {
    const freqs = { 3: [330,440], 4: [440,554,659], 5: [523,659,784,1047] };
    (freqs[r]||freqs[3]).forEach((f,i) => setTimeout(() => this.play(f, 0.3, "sine", 0.12), i*200));
  },
  engineStart() {
    for (let i=0; i<30; i++) setTimeout(() => this.play(80+Math.random()*60, 0.12, "sawtooth", 0.06+i*0.003), i*80);
    setTimeout(() => { [220,330,440,550].forEach((f,i) => setTimeout(() => this.play(f, 0.4, "sine", 0.08), i*200)); }, 2400);
  },
};

// ── STATE MANAGEMENT ──
const STORAGE_KEY = "tmcc-game-state";

GE.loadLocal = function(profileId) {
  try { const r = localStorage.getItem(STORAGE_KEY + "-" + profileId); return r ? JSON.parse(r) : null; }
  catch { return null; }
};

GE.saveLocal = function(profileId, state) {
  try { localStorage.setItem(STORAGE_KEY + "-" + profileId, JSON.stringify(state)); } catch {}
};

GE.makeDefaultState = function(profileId) {
  const parts = GE.initializeVehicleParts(GD.PART_TREES.ae86);
  return {
    profileId, lastModified: Date.now(),
    currency: { yen: 1000, wrenchTokens: 20, donorParts: {} },
    garage: { vehicles: { ae86_starter: { modelId: "ae86", nickname: "", acquiredAt: Date.now(), status: "in_progress", parts } } },
    skills: { wrench: { level: 1, xp: 0 }, precision: { level: 1, xp: 0 }, diagnosis: { level: 1, xp: 0 }, bodywork: { level: 1, xp: 0 } },
    tools: {}, gacha: { pity4: 0, pity5: 0, totalPulls: 0 },
    stats: { carsCompleted: 0, totalRepairs: 0, totalYenEarned: 0 },
    repairLog: [], lastDailyPull: null,
  };
};

// ── FIREBASE SYNC ──
GE.syncToFirebase = async function(profileId, state) {
  if (!window._firebaseReady || !window._gameDoc) return false;
  try { await window._setDoc(window._gameDoc(profileId), { payload: state, lastModified: Date.now() }); return true; }
  catch (e) { console.error("Game sync fail:", e); return false; }
};

GE.loadFromFirebase = async function(profileId) {
  if (!window._firebaseReady || !window._gameDoc || !window._getDoc) return null;
  try {
    const snap = await window._getDoc(window._gameDoc(profileId));
    return snap.exists() ? snap.data().payload : null;
  } catch { return null; }
};

GE.postFeed = async function(entry) {
  if (!window._firebaseReady || !window._gameFeedDoc || !window._getDoc) return;
  try {
    const snap = await window._getDoc(window._gameFeedDoc);
    let entries = snap.exists() ? (snap.data().entries || []) : [];
    entries.unshift({ ...entry, when: Date.now() });
    if (entries.length > 50) entries = entries.slice(0, 50);
    await window._setDoc(window._gameFeedDoc, { entries });
  } catch {}
};

GE.loadFeed = async function() {
  if (!window._firebaseReady || !window._gameFeedDoc || !window._getDoc) return [];
  try { const snap = await window._getDoc(window._gameFeedDoc); return snap.exists() ? (snap.data().entries || []) : []; }
  catch { return []; }
};

// ── SELLING & SHOWCASE ──
GE.SELL_PRICES  = { 3: 5000,  4: 15000, 5: 50000 };
GE.SELL_WT      = { 3: 15,    4: 30,    5: 60 };
GE.SHOWCASE_DAILY = 50; // ¥ per kept car per day

GE.calculateQualityMultiplier = function(partTree, vehicleParts) {
  const allParts = GE.getAllParts(partTree);
  const revealed = allParts.filter(p => vehicleParts[p.id]?.revealed);
  if (revealed.length === 0) return 1.0;
  const avg = revealed.reduce((s, p) => s + (vehicleParts[p.id]?.condition || 0), 0) / revealed.length;
  if (avg <= 0.70) return 1.0;
  const rarity = partTree.rarity;
  const maxMult = rarity === 5 ? 2.0 : 1.5;
  return 1.0 + (avg - 0.70) / 0.30 * (maxMult - 1.0);
};

GE.calculateSaleValue = function(partTree, vehicleParts) {
  const base = GE.SELL_PRICES[partTree.rarity] || 5000;
  const mult = GE.calculateQualityMultiplier(partTree, vehicleParts);
  return { yen: Math.round(base * mult), wt: GE.SELL_WT[partTree.rarity] || 15, multiplier: mult };
};

GE.getShowcaseIncome = function(state) {
  const showcased = Object.values(state.garage?.vehicles || {}).filter(v => v.status === "showcase");
  return showcased.length * GE.SHOWCASE_DAILY;
};

// ── PERFECT REPAIR PROC (skill 16+) ──
GE.rollPerfectRepair = function(skillLevel) {
  if (skillLevel < 16) return false;
  return Math.random() < 0.05; // 5% chance
};

// ── MECHANIC'S INTUITION (diagnosis skill 10+) ──
GE.hasIntuition = function(diagLevel) { return diagLevel >= 10; };

// ── COMPLETION CHECK (all systems 100%) ──
GE.isCarFullyComplete = function(partTree, vehicleParts) {
  const comp = GE.getSystemCompletion(partTree, vehicleParts);
  return Object.values(comp).every(c => c.pct >= 100);
};

// Export
window.GE = GE;
})();
