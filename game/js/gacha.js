// ════════════════════════════════════════════════════════════
//  gacha.js — Junkyard Pull System
//  Exports: renderJunkyard()
// ════════════════════════════════════════════════════════════

import { getApp, navigate, refreshHeader } from './main.js';
import { postFeedEvent }                   from './social.js';
import { timeAgo }                         from './utils.js';

// ── Constants ────────────────────────────────────────────────

const COST_SINGLE      = 10;
const COST_TEN         = 90;
const DAILY_COOLDOWN   = 24 * 60 * 60 * 1000; // 24 hours in ms

// ── Part tree cache for gacha (so we can generate real parts on pull) ──
const _gachaPartTreeCache = {};

async function _loadPartTreeForGacha(modelId) {
  if (_gachaPartTreeCache[modelId]) return _gachaPartTreeCache[modelId];
  try {
    const resp = await fetch(`data/parts/${modelId}.json`);
    if (!resp.ok) return null;
    const tree = await resp.json();
    _gachaPartTreeCache[modelId] = tree;
    return tree;
  } catch (e) {
    console.warn(`[gacha] Could not load part tree for ${modelId}:`, e);
    return null;
  }
}

// ── Track which vehicles have available part trees (populated on first render) ──
let _availableModelIds = null;

async function _resolveAvailableModels() {
  if (_availableModelIds) return _availableModelIds;
  const roster = getVehicleRoster();
  const checks = await Promise.all(
    roster.map(async v => {
      try {
        const resp = await fetch(`data/parts/${v.modelId}.json`, { method: 'HEAD' });
        return resp.ok ? v.modelId : null;
      } catch { return null; }
    })
  );
  _availableModelIds = new Set(checks.filter(Boolean));
  return _availableModelIds;
}

const FLAVOR_TEXTS = [
  'Sitting under a tarp behind the shop. Hasn\'t run in years.',
  'Found it in a barn with flat tires and dead mice in the airbox.',
  'Previous owner swore it \'ran when parked.\' Sure it did.',
  'Half-finished project. Someone\'s dream, now yours.',
  'Dragged out of a field — still wearing its original plates.',
  'Listed as \'runs rough.\' That\'s one way to put it.',
  'Estate sale find. The family had no idea what they had.',
  'Last registered in 2003. Been asleep ever since.',
  'Pulled from a shipping container. Origin: unclear.',
  'The seller called it \'a solid project car.\' Bless his heart.',
];

const RARITY_STARS = { 3: '★★★', 4: '★★★★', 5: '★★★★★' };

const RARITY_COLORS = {
  3: { glow: '#9ca3af', pulse: '#9ca3af', label: 'Common',    cssVar: '--rarity-3' },
  4: { glow: '#a855f7', pulse: '#a855f7', label: 'Rare',      cssVar: '--rarity-4' },
  5: { glow: '#f59e0b', pulse: '#f59e0b', label: 'Legendary', cssVar: '--rarity-5' },
};

// Pull history stored in localStorage (separate from game state, persists across sessions)
const PULL_HISTORY_KEY = 'jdm_gacha_history';
const MAX_HISTORY      = 20;

// ── CSS injection (animations & junkyard-specific styles) ────

function injectGachaStyles() {
  if (document.getElementById('gacha-styles')) return;

  const style = document.createElement('style');
  style.id = 'gacha-styles';
  style.textContent = `

    /* ── Layout ───────────────────────────────────────────── */
    .pull-screen {
      max-width: 540px;
      margin: 0 auto;
      padding: var(--space-lg, 20px) var(--space-md, 12px);
      display: flex;
      flex-direction: column;
      gap: var(--space-lg, 20px);
    }

    .pull-screen__title {
      font-family: var(--font-display, monospace);
      font-size: clamp(1.4rem, 5vw, 2rem);
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-primary, #cdd1e8);
      text-align: center;
      margin: 0;
    }

    .pull-screen__title span {
      color: var(--rarity-5, #f59e0b);
    }

    /* ── Currency badge ───────────────────────────────────── */
    .currency-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm, 8px);
      font-family: var(--font-data, monospace);
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--rarity-5, #f59e0b);
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.25);
      border-radius: 8px;
      padding: 0.5rem 1rem;
      text-align: center;
    }

    .currency-display .wt-icon { font-size: 1.3rem; }

    /* ── Pull buttons card ────────────────────────────────── */
    .pull-options {
      background: var(--bg-card, #1a1d2e);
      border: 1px solid var(--border, #3a3f5c);
      border-radius: 12px;
      overflow: hidden;
    }

    .pull-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-subtle, #2a2d3e);
      gap: 1rem;
    }

    .pull-option:last-child { border-bottom: none; }

    .pull-option__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .pull-option__label {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--text-primary, #cdd1e8);
    }

    .pull-option__sub {
      font-size: 0.75rem;
      color: var(--text-muted, #6b7080);
    }

    .pull-option__need {
      font-size: 0.72rem;
      color: var(--rarity-4, #a855f7);
      margin-top: 2px;
    }

    /* ── Daily walk section ───────────────────────────────── */
    .daily-walk {
      background: var(--bg-card, #1a1d2e);
      border: 1px solid var(--border, #3a3f5c);
      border-radius: 12px;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .daily-walk__label {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-secondary, #9ca0b8);
      text-transform: uppercase;
      letter-spacing: 0.07em;
      margin-bottom: 3px;
    }

    .daily-walk__timer {
      font-family: var(--font-data, monospace);
      font-size: 0.88rem;
      color: var(--text-muted, #6b7080);
    }

    /* ── Pull history ─────────────────────────────────────── */
    .pull-history {
      background: var(--bg-card, #1a1d2e);
      border: 1px solid var(--border, #3a3f5c);
      border-radius: 12px;
      padding: 1rem 1.25rem;
    }

    .pull-history__title {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted, #6b7080);
      text-transform: uppercase;
      letter-spacing: 0.09em;
      margin: 0 0 0.75rem;
    }

    .pull-history__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .pull-history__item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.82rem;
    }

    .pull-history__stars { font-size: 0.75rem; flex-shrink: 0; }
    .pull-history__name  { flex: 1; color: var(--text-primary, #cdd1e8); }
    .pull-history__when  { font-size: 0.72rem; color: var(--text-muted, #6b7080); white-space: nowrap; }

    /* ── Pity tracker ─────────────────────────────────────── */
    .pity-tracker {
      display: flex;
      gap: var(--space-sm, 8px);
    }

    .pity-bar {
      flex: 1;
      background: var(--bg-card, #1a1d2e);
      border: 1px solid var(--border, #3a3f5c);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      font-size: 0.72rem;
    }

    .pity-bar__label {
      color: var(--text-muted, #6b7080);
      margin-bottom: 4px;
    }

    .pity-bar__track {
      height: 4px;
      background: var(--bg-base, #0f111a);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 3px;
    }

    .pity-bar__fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.5s ease;
    }

    .pity-bar__count {
      color: var(--text-secondary, #9ca0b8);
      font-family: var(--font-data, monospace);
    }

    /* ── Overlay / modal backdrop ─────────────────────────── */
    .gacha-overlay {
      position: fixed;
      inset: 0;
      z-index: 800;
      background: rgba(8, 9, 18, 0.96);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      overflow-y: auto;
    }

    /* ── Progress bar (loading reveal) ───────────────────── */
    .pull-progress {
      width: min(420px, 90vw);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      text-align: center;
    }

    .pull-progress__label {
      font-size: 1.1rem;
      color: var(--text-secondary, #9ca0b8);
      letter-spacing: 0.05em;
      font-style: italic;
      min-height: 1.6em;
    }

    .pull-progress__track {
      width: 100%;
      height: 3px;
      background: rgba(255,255,255,0.08);
      border-radius: 2px;
      overflow: hidden;
    }

    .pull-progress__bar {
      height: 100%;
      width: 0%;
      border-radius: 2px;
      background: var(--text-muted, #6b7080);
      transition: width 2s cubic-bezier(0.4, 0, 0.2, 1),
                  background 0.5s ease;
    }

    /* ── Rarity reveal card ───────────────────────────────── */
    .pull-reveal {
      width: min(420px, 90vw);
      background: var(--bg-card, #1a1d2e);
      border-radius: 16px;
      padding: 2rem 1.5rem 1.5rem;
      text-align: center;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      animation: reveal-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }

    @keyframes reveal-in {
      from { opacity: 0; transform: scale(0.88) translateY(16px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }

    /* Glow border */
    .pull-reveal::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 16px;
      padding: 2px;
      background: var(--reveal-glow, rgba(156,163,175,0.3));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }

    /* Radial glow behind card */
    .pull-rarity-glow {
      position: absolute;
      inset: -30%;
      border-radius: 50%;
      background: var(--reveal-glow, rgba(156,163,175,0.05));
      filter: blur(60px);
      z-index: -1;
      animation: glow-pulse 1.5s ease-in-out infinite alternate;
    }

    @keyframes glow-pulse {
      from { opacity: 0.4; transform: scale(0.95); }
      to   { opacity: 1;   transform: scale(1.05); }
    }

    /* ── Rarity color pulses ──────────────────────────────── */
    .rarity-bg-3 { --reveal-glow: rgba(156,163,175,0.15); }
    .rarity-bg-4 { --reveal-glow: rgba(168,85,247,0.25);  }
    .rarity-bg-5 { --reveal-glow: rgba(245,158,11,0.35);  }

    /* ── Stars (type-in) ──────────────────────────────────── */
    .pull-stars {
      font-size: 1.6rem;
      letter-spacing: 0.1em;
      min-height: 1.8em;
      color: #6b7280;
      font-family: var(--font-display, monospace);
    }

    .pull-stars.rarity-3 { color: #9ca3af; }
    .pull-stars.rarity-4 { color: #a855f7; text-shadow: 0 0 12px rgba(168,85,247,0.6); }
    .pull-stars.rarity-5 {
      color: #f59e0b;
      text-shadow: 0 0 16px rgba(245,158,11,0.8), 0 0 40px rgba(245,158,11,0.4);
      animation: star-shimmer 0.8s ease-in-out infinite alternate;
    }

    @keyframes star-shimmer {
      from { text-shadow: 0 0 12px rgba(245,158,11,0.6), 0 0 30px rgba(245,158,11,0.3); }
      to   { text-shadow: 0 0 24px rgba(245,158,11,1.0), 0 0 60px rgba(245,158,11,0.6); }
    }

    /* ── Rarity label badge ───────────────────────────────── */
    .pull-rarity-label {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      padding: 2px 10px;
      border-radius: 999px;
    }

    .pull-rarity-label.rarity-3 { background: rgba(156,163,175,0.15); color: #9ca3af; border: 1px solid rgba(156,163,175,0.3); }
    .pull-rarity-label.rarity-4 { background: rgba(168,85,247,0.15);  color: #a855f7; border: 1px solid rgba(168,85,247,0.4); }
    .pull-rarity-label.rarity-5 { background: rgba(245,158,11,0.15);  color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); }

    /* ── Vehicle name ─────────────────────────────────────── */
    .pull-vehicle-name {
      font-size: clamp(1.1rem, 4vw, 1.4rem);
      font-weight: 900;
      color: var(--text-primary, #cdd1e8);
      letter-spacing: 0.04em;
      line-height: 1.2;
      margin: 0;
    }

    .pull-engine-code {
      font-family: var(--font-data, monospace);
      font-size: 0.82rem;
      color: var(--text-muted, #6b7080);
      letter-spacing: 0.08em;
    }

    /* ── Flavor text ──────────────────────────────────────── */
    .pull-flavor {
      font-size: 0.85rem;
      color: var(--text-secondary, #9ca0b8);
      font-style: italic;
      line-height: 1.5;
      padding: 0.75rem 1rem;
      border-left: 2px solid var(--border, #3a3f5c);
      text-align: left;
      width: 100%;
      box-sizing: border-box;
    }

    /* ── Condition display ────────────────────────────────── */
    .pull-condition {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.82rem;
      width: 100%;
    }

    .pull-condition__label {
      color: var(--text-muted, #6b7080);
      white-space: nowrap;
    }

    .pull-condition__bar {
      flex: 1;
      height: 5px;
      background: rgba(255,255,255,0.06);
      border-radius: 3px;
      overflow: hidden;
    }

    .pull-condition__fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s ease 0.5s;
    }

    .pull-condition__pct {
      font-family: var(--font-data, monospace);
      font-weight: 700;
      font-size: 0.82rem;
      white-space: nowrap;
    }

    /* ── Duplicate badge ──────────────────────────────────── */
    .pull-duplicate {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: #dc2626;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
      animation: dup-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      animation-delay: 0.8s;
      opacity: 0;
    }

    @keyframes dup-pop {
      from { opacity: 0; transform: scale(0.5); }
      to   { opacity: 1; transform: scale(1); }
    }

    .pull-donor-notice {
      font-size: 0.78rem;
      color: #f87171;
      text-align: center;
    }

    /* ── Action buttons ───────────────────────────────────── */
    .pull-actions {
      display: flex;
      gap: 0.75rem;
      width: 100%;
      flex-wrap: wrap;
    }

    .pull-actions .btn {
      flex: 1;
      min-width: 120px;
    }

    /* ── 10-pull summary ──────────────────────────────────── */
    .batch-summary {
      width: min(500px, 92vw);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .batch-summary__title {
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-primary, #cdd1e8);
      text-align: center;
    }

    .batch-summary__list {
      list-style: none;
      margin: 0;
      padding: 0;
      background: var(--bg-card, #1a1d2e);
      border: 1px solid var(--border, #3a3f5c);
      border-radius: 12px;
      overflow: hidden;
    }

    .batch-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 1rem;
      border-bottom: 1px solid var(--border-subtle, #2a2d3e);
      animation: batch-slide 0.3s ease both;
    }

    .batch-item:last-child { border-bottom: none; }

    @keyframes batch-slide {
      from { opacity: 0; transform: translateX(-12px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .batch-item__stars {
      font-size: 0.78rem;
      min-width: 60px;
    }

    .batch-item__name {
      flex: 1;
      font-size: 0.88rem;
      color: var(--text-primary, #cdd1e8);
      font-weight: 600;
    }

    .batch-item__dup {
      font-size: 0.65rem;
      font-weight: 700;
      color: #f87171;
      background: rgba(220,38,38,0.12);
      border: 1px solid rgba(220,38,38,0.3);
      border-radius: 3px;
      padding: 1px 5px;
      letter-spacing: 0.08em;
    }

    .batch-stats {
      font-size: 0.82rem;
      color: var(--text-secondary, #9ca0b8);
      text-align: center;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      padding: 0.5rem;
    }

    /* ── Insufficient WT tip ──────────────────────────────── */
    .pull-earn-tip {
      font-size: 0.78rem;
      color: var(--text-muted, #6b7080);
      text-align: center;
      font-style: italic;
    }

    /* ── Button states ────────────────────────────────────── */
    .btn--large {
      padding: 0.75rem 1.25rem;
      font-size: 0.95rem;
    }

    /* ── Responsive ───────────────────────────────────────── */
    @media (max-width: 480px) {
      .pull-reveal  { padding: 1.5rem 1rem 1rem; }
      .batch-summary { gap: 0.75rem; }
      .pity-tracker { flex-direction: column; }
    }
  `;
  document.head.appendChild(style);
}

// ── Gacha state helpers ──────────────────────────────────────

function getGachaState() {
  const { state } = getApp();
  const profile   = state.getProfile();
  if (!profile.gacha) {
    profile.gacha = { pity4: 0, pity5: 0, totalPulls: 0 };
  }
  return profile.gacha;
}

// ── Pull history ─────────────────────────────────────────────

function loadPullHistory() {
  try {
    return JSON.parse(localStorage.getItem(PULL_HISTORY_KEY) ?? '[]');
  } catch { return []; }
}

function savePullHistory(history) {
  localStorage.setItem(PULL_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function pushToHistory(vehicleName, rarity, timestamp = Date.now()) {
  const history = loadPullHistory();
  history.unshift({ vehicleName, rarity, timestamp });
  savePullHistory(history);
}

// ── Daily walk helpers ───────────────────────────────────────

// ── Daily walk helpers (per-profile via state) ──────────────

function getLastDailyWalkTs() {
  const { state } = getApp();
  return state?.getDailyWalkTs?.() ?? 0;
}

function setLastDailyWalkTs(ts) {
  const { state } = getApp();
  state?.setDailyWalkTs?.(ts);
}

function isDailyWalkAvailable() {
  return Date.now() - getLastDailyWalkTs() >= DAILY_COOLDOWN;
}

function dailyWalkCooldownStr() {
  const nextTs   = getLastDailyWalkTs() + DAILY_COOLDOWN;
  const diffMs   = Math.max(0, nextTs - Date.now());
  const h        = Math.floor(diffMs / 3_600_000);
  const m        = Math.floor((diffMs % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

// ── Vehicle roster from loaded data ─────────────────────────

function getVehicleRoster() {
  const { vehicleData } = getApp();
  return (vehicleData?.vehicles ?? []);
}

// ── Arrival condition estimate ───────────────────────────────

function estimateArrivalCondition(rarity) {
  const ranges = { 3: [0.20, 0.45], 4: [0.10, 0.35], 5: [0.05, 0.25] };
  const [min, max] = ranges[rarity] ?? ranges[3];
  return min + Math.random() * (max - min);
}

// ── Core pull logic ──────────────────────────────────────────

function resolvePull(gachaState, forcedRarityMin = 0, filteredRoster = null) {
  const roster = filteredRoster || getVehicleRoster();
  let rarity;

  if (gachaState.pity5 >= 49) {
    rarity = 5;
  } else if (gachaState.pity4 >= 19) {
    rarity = 4;
    if (Math.random() < 0.10) rarity = 5;
  } else {
    const roll = Math.random();
    if (roll < 0.10)      rarity = 5;
    else if (roll < 0.40) rarity = 4;
    else                  rarity = 3;
  }

  // Apply forced minimum (daily walk: common only, 10-pull guarantee)
  if (forcedRarityMin === 3 && rarity > 3) rarity = 3; // daily walk cap
  if (forcedRarityMin === 4 && rarity < 4) rarity = 4; // 10-pull guarantee

  // Graceful rarity fallback: if no vehicles exist at this rarity in the
  // filtered roster (e.g. no part trees for legendaries yet), step down
  // until we find a populated pool.
  let pool = roster.filter(v => v.rarity === rarity);
  let effectiveRarity = rarity;
  while (pool.length === 0 && effectiveRarity > 3) {
    effectiveRarity--;
    pool = roster.filter(v => v.rarity === effectiveRarity);
  }

  const vehicle = pool.length
    ? pool[Math.floor(Math.random() * pool.length)]
    : null;

  // Pity counters use the effective rarity (after fallback) so players
  // don't lose pity progress when a rarity tier has no available vehicles.
  if (effectiveRarity === 5) { gachaState.pity4 = 0; gachaState.pity5 = 0; }
  else if (effectiveRarity === 4) { gachaState.pity4 = 0; gachaState.pity5++; }
  else { gachaState.pity4++; gachaState.pity5++; }

  gachaState.totalPulls = (gachaState.totalPulls ?? 0) + 1;

  return { vehicle, rarity: effectiveRarity };
}

function resolveTenPull(gachaState, filteredRoster = null) {
  const results    = [];
  let hasRare      = false;

  for (let i = 0; i < 10; i++) {
    const r = resolvePull(gachaState, 0, filteredRoster);
    if (r.rarity >= 4) hasRare = true;
    results.push(r);
  }

  // Guarantee at least one ★★★★+
  if (!hasRare) {
    const last = results[results.length - 1];
    if (last.rarity === 3) {
      // Upgrade last pull to ★★★★
      gachaState.pity4 = 0; // Already incremented, reset
      const upgraded = resolvePull(gachaState, 4, filteredRoster);
      results[results.length - 1] = upgraded;
    }
  }

  return results;
}

// ── Duplicate check ──────────────────────────────────────────

function isDuplicate(modelId) {
  const { state } = getApp();
  const vehicles  = state.getProfile()?.garage?.vehicles ?? {};
  return Object.values(vehicles).some(v => v.modelId === modelId);
}

function handleDuplicate(modelId) {
  const { state } = getApp();
  state.updateCurrency(`donorParts.${modelId}`, 1);
}

// ── Send vehicle to garage ───────────────────────────────────

// ── Send vehicle to garage ───────────────────────────────

async function sendToGarage(vehicle, rarity, profileName) {
  const { state } = getApp();

  // Load the actual part tree so addVehicle can generate real part instances
  const template = await _loadPartTreeForGacha(vehicle.modelId);
  if (!template) {
    console.warn(`[gacha] No part tree for ${vehicle.modelId} — using empty template`);
  }

  const instanceId = state.addVehicle(template || { systems: [] }, rarity, vehicle.modelId);
  state.save();
  refreshHeader();

  const stars = RARITY_STARS[rarity] ?? '★★★';
  postFeedEvent('pulled_vehicle', `pulled a ${stars} ${vehicle.displayName}!`);

  return instanceId;
}

// ── Overlay helpers ──────────────────────────────────────────

function showOverlay() {
  removeOverlay();
  const overlay = document.createElement('div');
  overlay.id        = 'gacha-overlay';
  overlay.className = 'gacha-overlay';
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  return overlay;
}

function removeOverlay() {
  const existing = document.getElementById('gacha-overlay');
  if (existing) existing.remove();
  document.body.style.overflow = '';
}

// ── Single reveal animation ──────────────────────────────────

async function runRevealAnimation(overlay, pullResult, isDup) {
  const { vehicle, rarity } = pullResult;
  const rarityInfo          = RARITY_COLORS[rarity];
  const stars               = RARITY_STARS[rarity] ?? '★★★';
  const audioMgr            = window.audioManager;

  // ── Phase 1: Walking the yard... ────────────────────────
  const progressWrap = document.createElement('div');
  progressWrap.className = 'pull-progress';
  overlay.appendChild(progressWrap);

  const progressLabel = document.createElement('div');
  progressLabel.className = 'pull-progress__label';
  progressLabel.textContent = 'Walking the yard…';
  progressWrap.appendChild(progressLabel);

  const progressTrack = document.createElement('div');
  progressTrack.className = 'pull-progress__track';
  const progressBar = document.createElement('div');
  progressBar.className = 'pull-progress__bar';
  progressTrack.appendChild(progressBar);
  progressWrap.appendChild(progressTrack);

  // Animate bar fill over 2s
  await new Promise(res => {
    requestAnimationFrame(() => {
      progressBar.style.width = '100%';
      setTimeout(res, 2100);
    });
  });

  // ── Phase 2: Something catches your eye... ───────────────
  progressLabel.textContent = 'Something catches your eye…';
  progressBar.style.background = rarityInfo.glow;
  await delay(1000);

  // ── Phase 3: Rarity glow card appears ───────────────────
  overlay.innerHTML = '';

  const card = document.createElement('div');
  card.className = `pull-reveal rarity-bg-${rarity}`;

  const glowEl = document.createElement('div');
  glowEl.className = 'pull-rarity-glow';
  card.appendChild(glowEl);

  if (isDup) {
    const dupBadge = document.createElement('div');
    dupBadge.className = 'pull-duplicate';
    dupBadge.textContent = 'DUPLICATE';
    card.appendChild(dupBadge);
  }

  overlay.appendChild(card);

  // ── Phase 4: Stars type in one at a time ────────────────
  const starsEl = document.createElement('div');
  starsEl.className = `pull-stars rarity-${rarity}`;
  starsEl.textContent = '';
  card.appendChild(starsEl);

  // Brief pause before stars
  await delay(300);

  const starChar = '★';
  for (let i = 0; i < rarity; i++) {
    starsEl.textContent += starChar;
    await delay(rarity === 5 ? 200 : 150);
  }

  // Play sound on rarity reveal
  if (audioMgr) {
    try { audioMgr.play?.(`gacha_${rarity}`); } catch {}
  }

  // Rarity label
  const rarityLabel = document.createElement('div');
  rarityLabel.className = `pull-rarity-label rarity-${rarity}`;
  rarityLabel.textContent = rarityInfo.label;
  card.appendChild(rarityLabel);

  await delay(500);

  // ── Phase 5: Vehicle name ────────────────────────────────
  const nameEl = document.createElement('h2');
  nameEl.className = 'pull-vehicle-name';
  nameEl.textContent = vehicle ? vehicle.displayName : 'Unknown Vehicle';
  nameEl.style.animation = 'reveal-in 0.4s ease both';
  card.appendChild(nameEl);

  if (vehicle?.engineCode) {
    const engineEl = document.createElement('div');
    engineEl.className = 'pull-engine-code';
    engineEl.textContent = `${vehicle.engineCode} — ${vehicle.engineDescription ?? ''}`;
    card.appendChild(engineEl);
  }

  await delay(400);

  // ── Phase 6: Flavor text ─────────────────────────────────
  const flavorEl = document.createElement('div');
  flavorEl.className = 'pull-flavor';
  flavorEl.textContent = FLAVOR_TEXTS[Math.floor(Math.random() * FLAVOR_TEXTS.length)];
  flavorEl.style.animation = 'reveal-in 0.5s ease both';
  card.appendChild(flavorEl);

  // ── Phase 7: Arrival condition ───────────────────────────
  const arrivalCond = estimateArrivalCondition(rarity);
  const condPct     = Math.round(arrivalCond * 100);
  const condColor   = condPct >= 50 ? '#22c55e' : condPct >= 30 ? '#eab308' : '#f97316';

  const condWrap = document.createElement('div');
  condWrap.className = 'pull-condition';
  condWrap.innerHTML = `
    <span class="pull-condition__label">Arrival condition</span>
    <div class="pull-condition__bar">
      <div class="pull-condition__fill" style="width:0%; background:${condColor};"></div>
    </div>
    <span class="pull-condition__pct" style="color:${condColor};">${condPct}%</span>
  `;
  card.appendChild(condWrap);

  // Animate bar in after brief delay
  await delay(200);
  const condFill = condWrap.querySelector('.pull-condition__fill');
  if (condFill) condFill.style.width = `${condPct}%`;

  // Duplicate donor note
  if (isDup && vehicle) {
    const donorNote = document.createElement('div');
    donorNote.className = 'pull-donor-notice';
    donorNote.textContent = 'You already have one of these. Stripped for parts.';
    card.appendChild(donorNote);
  }

  await delay(600);

  // ── Phase 8: Action buttons ──────────────────────────────
  return new Promise(resolve => {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'pull-actions';

    const garageBtn = document.createElement('button');
    garageBtn.className = 'btn btn--primary btn--large';
    garageBtn.textContent = isDup ? '← Junkyard' : 'Send to Garage';

    const detailBtn = document.createElement('button');
    detailBtn.className = 'btn btn--large';
    detailBtn.textContent = isDup ? 'Continue' : 'Details';

    garageBtn.addEventListener('click', () => {
      resolve({ action: isDup ? 'junkyard' : 'garage' });
    });
    detailBtn.addEventListener('click', () => {
      resolve({ action: isDup ? 'junkyard' : 'details' });
    });

    actionsEl.append(garageBtn, detailBtn);
    card.appendChild(actionsEl);
  });
}

// ── Batch (10-pull) reveal ───────────────────────────────────

async function runBatchReveal(overlay, results, duplicateMap) {
  // Brief loading phase
  const progressWrap = document.createElement('div');
  progressWrap.className = 'pull-progress';
  overlay.appendChild(progressWrap);

  const progressLabel = document.createElement('div');
  progressLabel.className = 'pull-progress__label';
  progressLabel.textContent = 'Sweeping the yard…';
  progressWrap.appendChild(progressLabel);

  const progressTrack = document.createElement('div');
  progressTrack.className = 'pull-progress__track';
  const progressBar = document.createElement('div');
  progressBar.className = 'pull-progress__bar';
  progressBar.style.transition = 'width 1.8s cubic-bezier(0.4,0,0.2,1), background 0.5s';
  progressTrack.appendChild(progressBar);
  progressWrap.appendChild(progressTrack);

  await delay(100);
  progressBar.style.width   = '100%';
  progressBar.style.background = 'var(--rarity-5, #f59e0b)';

  // Play best rarity sound
  const bestRarity = Math.max(...results.map(r => r.rarity));
  const audioMgr   = window.audioManager;
  if (audioMgr) {
    try { audioMgr.play?.(`gacha_${bestRarity}`); } catch {}
  }

  await delay(2000);

  // Transition to summary
  overlay.innerHTML = '';

  const summaryWrap = document.createElement('div');
  summaryWrap.className = 'batch-summary';

  const titleEl = document.createElement('div');
  titleEl.className = 'batch-summary__title';
  titleEl.textContent = '10-Pull Results';
  summaryWrap.appendChild(titleEl);

  const list = document.createElement('ul');
  list.className = 'batch-summary__list';

  let newCount = 0;
  let dupCount = 0;

  results.forEach((r, i) => {
    const isDup   = duplicateMap[i];
    const vehicle = r.vehicle;
    if (isDup) dupCount++; else newCount++;

    const item = document.createElement('li');
    item.className = 'batch-item';
    item.style.animationDelay = `${i * 60}ms`;

    const starsSpan = document.createElement('span');
    starsSpan.className = 'batch-item__stars';
    starsSpan.style.color = RARITY_COLORS[r.rarity].glow;
    starsSpan.textContent = RARITY_STARS[r.rarity] ?? '★★★';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'batch-item__name';
    nameSpan.textContent = vehicle?.displayName ?? 'Unknown';

    item.append(starsSpan, nameSpan);

    if (isDup) {
      const dupTag = document.createElement('span');
      dupTag.className = 'batch-item__dup';
      dupTag.textContent = 'DUP';
      item.appendChild(dupTag);
    }

    list.appendChild(item);
  });

  summaryWrap.appendChild(list);

  const statsEl = document.createElement('div');
  statsEl.className = 'batch-stats';
  statsEl.textContent = `${newCount} new vehicle${newCount !== 1 ? 's' : ''}, ${dupCount} duplicate${dupCount !== 1 ? 's' : ''} → ${dupCount} donor part set${dupCount !== 1 ? 's' : ''}`;
  summaryWrap.appendChild(statsEl);

  overlay.appendChild(summaryWrap);

  await delay(400);

  return new Promise(resolve => {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'pull-actions';

    const sendAllBtn = document.createElement('button');
    sendAllBtn.className = 'btn btn--primary btn--large';
    sendAllBtn.textContent = `Send All to Garage (${newCount})`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn--large';
    closeBtn.textContent = 'Done';

    sendAllBtn.addEventListener('click', () => resolve({ action: 'garage_all' }));
    closeBtn.addEventListener('click',   () => resolve({ action: 'close' }));

    actionsEl.append(sendAllBtn, closeBtn);
    summaryWrap.appendChild(actionsEl);
  });
}

// ── Promise delay helper ─────────────────────────────────────

function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// ── Pull entry point (single or daily) ──────────────────────

async function executeSinglePull(isDailyWalk = false) {
  const { state }  = getApp();
  const gachaState = getGachaState();
  const fullRoster = getVehicleRoster();

  if (!fullRoster.length) {
    alert('Vehicle data not loaded. Please refresh.');
    return;
  }

  // Filter roster to only vehicles with available part tree files
  const availableIds = await _resolveAvailableModels();
  const roster = fullRoster.filter(v => availableIds.has(v.modelId));

  if (!roster.length) {
    alert('No vehicles with part data available yet. Check back after more part trees are added.');
    return;
  }

  // Resolve
  const pullResult = isDailyWalk
    ? (() => {
        // Daily walk: common-tier only
        const r    = 3;
        const pool = roster.filter(v => v.rarity === r);
        const v    = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
        // Pity counters still increment for daily walk
        gachaState.pity4 = (gachaState.pity4 ?? 0) + 1;
        gachaState.pity5 = (gachaState.pity5 ?? 0) + 1;
        gachaState.totalPulls = (gachaState.totalPulls ?? 0) + 1;
        return { vehicle: v, rarity: r };
      })()
    : resolvePull(gachaState, 0, roster);

  state.save();

  const vehicle = pullResult.vehicle;
  const isDup   = vehicle ? isDuplicate(vehicle.modelId) : false;

  // Handle duplicate → donor parts
  if (isDup && vehicle) {
    handleDuplicate(vehicle.modelId);
    state.save();
  }

  // Record daily walk timestamp
  if (isDailyWalk) {
    setLastDailyWalkTs(Date.now());
  }

  // Record pull history
  if (vehicle) {
    pushToHistory(vehicle.displayName, pullResult.rarity);
  }

  // Show overlay
  const overlay = showOverlay();
  const result  = await runRevealAnimation(overlay, pullResult, isDup);

  // Handle user action
  if (result.action === 'garage' && vehicle) {
    await sendToGarage(vehicle, pullResult.rarity, state.getCurrentProfileId());
    removeOverlay();
    navigate('#/garage');
  } else if (result.action === 'details' && vehicle) {
    removeOverlay();
    navigate('#/garage');
  } else {
    removeOverlay();
    renderJunkyard();
  }
}

// ── 10-pull entry point ──────────────────────────────────────

async function executeTenPull() {
  const { state }  = getApp();
  const gachaState = getGachaState();
  const fullRoster = getVehicleRoster();

  if (!fullRoster.length) {
    alert('Vehicle data not loaded. Please refresh.');
    return;
  }

  // Filter roster to only vehicles with available part tree files
  const availableIds = await _resolveAvailableModels();
  const roster = fullRoster.filter(v => availableIds.has(v.modelId));

  if (!roster.length) {
    alert('No vehicles with part data available yet.');
    return;
  }

  const results      = resolveTenPull(gachaState, roster);
  state.save();

  // Determine duplicates and handle them
  const duplicateMap = {};
  for (let i = 0; i < results.length; i++) {
    const { vehicle } = results[i];
    if (vehicle) {
      const dup = isDuplicate(vehicle.modelId);
      duplicateMap[i] = dup;
      if (dup) {
        handleDuplicate(vehicle.modelId);
      }
    }
  }
  state.save();

  // Record pull history for best pull
  const bestResult = [...results].sort((a, b) => b.rarity - a.rarity)[0];
  if (bestResult?.vehicle) {
    pushToHistory(bestResult.vehicle.displayName, bestResult.rarity);
  }

  // Show overlay
  const overlay = showOverlay();
  const result  = await runBatchReveal(overlay, results, duplicateMap);

  if (result.action === 'garage_all') {
    // Send all non-duplicate vehicles to garage
    const profileName = state.getCurrentProfileId();
    for (let i = 0; i < results.length; i++) {
      if (!duplicateMap[i] && results[i].vehicle) {
        await sendToGarage(results[i].vehicle, results[i].rarity, profileName);
      }
    }
    removeOverlay();
    navigate('#/garage');
  } else {
    removeOverlay();
    renderJunkyard();
  }
}

// ── Main render function ─────────────────────────────────────

export function renderJunkyard() {
  injectGachaStyles();

  const root = document.getElementById('game-root');
  if (!root) return;
  root.innerHTML = '';

  const { state } = getApp();
  if (!state) return;

  const profile     = state.getProfile();
  const wt          = profile?.currency?.wrenchTokens ?? 0;
  const gachaState  = getGachaState();
  const pullHistory = loadPullHistory();

  const screen = document.createElement('div');
  screen.className = 'pull-screen';

  // ── Title ───────────────────────────────────────────────
  const title = document.createElement('h1');
  title.className = 'pull-screen__title';
  title.innerHTML = 'The <span>Junkyard</span>';
  screen.appendChild(title);

  // ── WT balance ──────────────────────────────────────────
  const currencyEl = document.createElement('div');
  currencyEl.className = 'currency-display';
  currencyEl.innerHTML = `<span class="wt-icon">🔧</span> ${wt} Wrench Tokens`;
  screen.appendChild(currencyEl);

  // ── Insufficient WT tip ──────────────────────────────────
  if (wt < COST_SINGLE) {
    const tipEl = document.createElement('div');
    tipEl.className = 'pull-earn-tip';
    tipEl.textContent = 'Complete cars and challenges to earn Wrench Tokens.';
    screen.appendChild(tipEl);
  }

  // ── Pull options ─────────────────────────────────────────
  const optionsCard = document.createElement('div');
  optionsCard.className = 'pull-options';

  // Single pull
  const singleOpt = document.createElement('div');
  singleOpt.className = 'pull-option';

  const singleInfo = document.createElement('div');
  singleInfo.className = 'pull-option__info';
  singleInfo.innerHTML = `
    <div class="pull-option__label">Single Pull</div>
    <div class="pull-option__sub">★★★ 60% &nbsp;·&nbsp; ★★★★ 30% &nbsp;·&nbsp; ★★★★★ 10%</div>
    ${wt < COST_SINGLE ? `<div class="pull-option__need">Need ${COST_SINGLE - wt} more WT</div>` : ''}
  `;

  const singleBtn = document.createElement('button');
  singleBtn.className = 'btn btn--primary';
  singleBtn.textContent = `${COST_SINGLE} WT`;
  singleBtn.disabled    = wt < COST_SINGLE;
  if (!singleBtn.disabled) {
    singleBtn.addEventListener('click', async () => {
      state.updateCurrency('wrenchTokens', -COST_SINGLE);
      refreshHeader();
      await executeSinglePull(false);
    });
  }

  singleOpt.append(singleInfo, singleBtn);
  optionsCard.appendChild(singleOpt);

  // 10-pull
  const tenOpt = document.createElement('div');
  tenOpt.className = 'pull-option';

  const tenInfo = document.createElement('div');
  tenInfo.className = 'pull-option__info';
  tenInfo.innerHTML = `
    <div class="pull-option__label">10-Pull <span style="font-size:0.72rem; color:var(--rarity-5,#f59e0b); font-weight:600;">10% OFF</span></div>
    <div class="pull-option__sub">Guaranteed ★★★★+ · Pity carries over</div>
    ${wt < COST_TEN ? `<div class="pull-option__need">Need ${COST_TEN - wt} more WT</div>` : ''}
  `;

  const tenBtn = document.createElement('button');
  tenBtn.className = 'btn btn--primary';
  tenBtn.textContent = `${COST_TEN} WT`;
  tenBtn.disabled    = wt < COST_TEN;
  if (!tenBtn.disabled) {
    tenBtn.addEventListener('click', async () => {
      state.updateCurrency('wrenchTokens', -COST_TEN);
      refreshHeader();
      await executeTenPull();
    });
  }

  tenOpt.append(tenInfo, tenBtn);
  optionsCard.appendChild(tenOpt);

  screen.appendChild(optionsCard);

  // ── Daily Junkyard Walk ──────────────────────────────────
  const dailyEl    = document.createElement('div');
  dailyEl.className = 'daily-walk';

  const dailyTextWrap = document.createElement('div');
  const dailyTitle    = document.createElement('div');
  dailyTitle.className    = 'daily-walk__label';
  dailyTitle.textContent  = 'Daily Junkyard Walk';
  dailyTextWrap.appendChild(dailyTitle);

  const walkAvailable = isDailyWalkAvailable();

  if (!walkAvailable) {
    const timerEl        = document.createElement('div');
    timerEl.className    = 'daily-walk__timer';
    timerEl.textContent  = `Available in: ${dailyWalkCooldownStr()}`;
    dailyTextWrap.appendChild(timerEl);

    // Live countdown
    const countdownInterval = setInterval(() => {
      if (isDailyWalkAvailable()) {
        clearInterval(countdownInterval);
        renderJunkyard(); // Re-render when available
      } else {
        timerEl.textContent = `Available in: ${dailyWalkCooldownStr()}`;
      }
    }, 30_000); // Update every 30s
  }

  dailyEl.appendChild(dailyTextWrap);

  const freeBtn        = document.createElement('button');
  freeBtn.className    = 'btn btn--primary';
  freeBtn.textContent  = walkAvailable ? 'Free Pull' : 'Locked';
  freeBtn.disabled     = !walkAvailable;
  if (walkAvailable) {
    freeBtn.addEventListener('click', async () => {
      await executeSinglePull(true);
    });
  }
  dailyEl.appendChild(freeBtn);

  screen.appendChild(dailyEl);

  // ── Pity tracker ─────────────────────────────────────────
  const pityWrap = document.createElement('div');
  pityWrap.className = 'pity-tracker';

  const pity4Pct  = Math.round((Math.min(gachaState.pity4, 20) / 20) * 100);
  const pity5Pct  = Math.round((Math.min(gachaState.pity5, 50) / 50) * 100);

  const pity4Bar = document.createElement('div');
  pity4Bar.className = 'pity-bar';
  pity4Bar.innerHTML = `
    <div class="pity-bar__label">★★★★ Pity</div>
    <div class="pity-bar__track">
      <div class="pity-bar__fill" style="width:${pity4Pct}%; background:#a855f7;"></div>
    </div>
    <div class="pity-bar__count">${gachaState.pity4 ?? 0} / 20</div>
  `;

  const pity5Bar = document.createElement('div');
  pity5Bar.className = 'pity-bar';
  pity5Bar.innerHTML = `
    <div class="pity-bar__label">★★★★★ Pity</div>
    <div class="pity-bar__track">
      <div class="pity-bar__fill" style="width:${pity5Pct}%; background:#f59e0b;"></div>
    </div>
    <div class="pity-bar__count">${gachaState.pity5 ?? 0} / 50</div>
  `;

  pityWrap.append(pity4Bar, pity5Bar);
  screen.appendChild(pityWrap);

  // ── Pull history ─────────────────────────────────────────
  if (pullHistory.length > 0) {
    const historyWrap = document.createElement('div');
    historyWrap.className = 'pull-history';

    const histTitle     = document.createElement('p');
    histTitle.className = 'pull-history__title';
    histTitle.textContent = '── Pull History ──';
    historyWrap.appendChild(histTitle);

    const histList      = document.createElement('ul');
    histList.className  = 'pull-history__list';

    for (const entry of pullHistory.slice(0, 8)) {
      const li          = document.createElement('li');
      li.className      = 'pull-history__item';

      const starsSpan   = document.createElement('span');
      starsSpan.className = 'pull-history__stars';
      starsSpan.style.color = RARITY_COLORS[entry.rarity]?.glow ?? '#9ca3af';
      starsSpan.textContent = RARITY_STARS[entry.rarity] ?? '★★★';

      const nameSpan    = document.createElement('span');
      nameSpan.className  = 'pull-history__name';
      nameSpan.textContent = entry.vehicleName ?? 'Unknown';

      const whenSpan    = document.createElement('span');
      whenSpan.className  = 'pull-history__when';
      whenSpan.textContent = timeAgo(entry.timestamp);

      li.append(starsSpan, nameSpan, whenSpan);
      histList.appendChild(li);
    }

    historyWrap.appendChild(histList);
    screen.appendChild(historyWrap);
  }

  root.appendChild(screen);
}
