// ════════════════════════════════════════════════════════════
//  mechanics/bodywork.js — Bodywork (Hold & Zone Coverage)
//
//  Usage:
//    startBodywork(partData, instanceState, container, onComplete,
//                  playerTools, skillLevel)
//
//  onComplete fires with: { newCondition, xpEarned, logEntries[] }
//
//  FILE LOCATION: game/js/mechanics/bodywork.js
// ════════════════════════════════════════════════════════════

import { randomInt, pickRandom, clamp } from '../utils.js';

// ── One-time CSS injection ────────────────────────────────────
let _cssInjected = false;

function _injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;

  const style = document.createElement('style');
  style.id = 'bodywork-mechanic-styles';
  style.textContent = `
    /* ── Zone grid ─────────────────────────────────────── */
    .bw-grid {
      display: grid;
      gap: 6px;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .bw-zone {
      position: relative;
      min-width: 60px;
      min-height: 60px;
      border-radius: 6px;
      border: 2px solid var(--border, #333);
      background: var(--bg-card, #1a1a1a);
      overflow: hidden;
      cursor: pointer;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      transition: border-color 180ms ease, opacity 180ms ease;
    }

    /* Fill layer — sits behind label text */
    .bw-zone-fill {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 0%;            /* driven by JS */
      bottom: 0;
      top: auto;
      transition: none;
      pointer-events: none;
      border-radius: 0;
    }

    .bw-zone-label {
      position: relative;   /* above fill layer */
      font-family: var(--font-ui, monospace);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--text-muted, #888);
      z-index: 1;
      pointer-events: none;
    }

    .bw-zone-icon {
      position: relative;
      font-size: 18px;
      z-index: 1;
      pointer-events: none;
    }

    /* ── Zone state variants ────────────────────────────── */
    .bw-zone--empty {
      border-color: var(--border, #333);
    }

    .bw-zone--rust {
      border-color: #7c3d0a;
      background: #2a1500;
    }
    .bw-zone--rust .bw-zone-fill {
      background: linear-gradient(to top, #7c3d0a88, #a0521544);
    }
    .bw-zone--rust .bw-zone-label {
      color: #c2672a;
    }

    .bw-zone--wip {
      border-color: var(--accent, #60a5fa);
    }
    .bw-zone--wip .bw-zone-fill {
      background: linear-gradient(to top, #3b82f666, #60a5fa33);
    }

    .bw-zone--rust-wip {
      border-color: #c2672a;
    }
    .bw-zone--rust-wip .bw-zone-fill {
      background: linear-gradient(to top, #a05215aa, #7c3d0a55);
    }

    .bw-zone--done {
      border-color: var(--condition-good, #22c55e);
      background: #0d2115;
    }
    .bw-zone--done .bw-zone-fill {
      height: 100% !important;
      background: linear-gradient(to top, #22c55e55, #15803d33);
    }
    .bw-zone--done .bw-zone-label {
      color: #22c55e;
    }

    /* ── Animations ─────────────────────────────────────── */
    @keyframes bw-zone-complete-flash {
      0%   { box-shadow: inset 0 0 0 rgba(34,197,94,0); }
      30%  { box-shadow: inset 0 0 20px rgba(34,197,94,0.55); }
      100% { box-shadow: inset 0 0 0 rgba(34,197,94,0); }
    }
    .bw-zone-complete-flash {
      animation: bw-zone-complete-flash 500ms ease !important;
    }

    @keyframes bw-rust-reveal-flash {
      0%, 100% { box-shadow: inset 0 0 0 rgba(239,68,68,0); }
      25%       { box-shadow: inset 0 0 24px rgba(239,68,68,0.7); border-color: #ef4444; }
      50%       { box-shadow: inset 0 0 10px rgba(239,68,68,0.4); }
      75%       { box-shadow: inset 0 0 24px rgba(239,68,68,0.7); border-color: #ef4444; }
    }
    .bw-rust-reveal-flash {
      animation: bw-rust-reveal-flash 900ms ease !important;
    }

    @keyframes bw-step-transition {
      0%   { opacity: 1; transform: scale(1); }
      40%  { opacity: 0; transform: scale(0.95); }
      60%  { opacity: 0; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1); }
    }
    .bw-grid-transitioning {
      animation: bw-step-transition 600ms ease forwards !important;
      pointer-events: none;
    }

    @keyframes bw-flavor-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .bw-flavor-in {
      animation: bw-flavor-in 200ms ease !important;
    }

    @keyframes bw-step-badge-pop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.15); color: #22c55e; }
      100% { transform: scale(1); }
    }
    .bw-step-badge-pop {
      animation: bw-step-badge-pop 400ms ease !important;
    }

    @keyframes bw-coverage-tick {
      0%   { transform: scaleX(1); }
      50%  { transform: scaleX(1.02); }
      100% { transform: scaleX(1); }
    }
    .bw-coverage-tick {
      animation: bw-coverage-tick 150ms ease !important;
    }

    /* ── Media Blaster instant-clear flash ─────────────────── */
    @keyframes bw-media-blast {
      0%   { box-shadow: inset 0 0  0   rgba(245,158,11,0);   border-color: #f59e0b; }
      20%  { box-shadow: inset 0 0 32px rgba(245,158,11,0.8); border-color: #fbbf24; filter: brightness(1.6); }
      70%  { box-shadow: inset 0 0 14px rgba(245,158,11,0.4); border-color: #f59e0b; filter: brightness(1.2); }
      100% { box-shadow: inset 0 0  0   rgba(245,158,11,0);   border-color: var(--condition-good, #22c55e); }
    }
    .bw-media-blast {
      animation: bw-media-blast 500ms ease forwards !important;
    }

    /* ── Perfect Repair gold flash ──────────────────────────── */
    @keyframes bw-perfect-repair {
      0%   { filter: brightness(1); }
      25%  { filter: brightness(2.2); box-shadow: 0 0 50px rgba(245,158,11,0.9); }
      70%  { filter: brightness(1.5); box-shadow: 0 0 24px rgba(245,158,11,0.5); }
      100% { filter: brightness(1); }
    }
    .bw-perfect-repair-flash {
      animation: bw-perfect-repair 900ms ease !important;
    }

    /* ── Stats sidebar ──────────────────────────────────── */
    .bw-stat-block {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 100px;
    }

    .bw-stat-row {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .bw-stat-label {
      font-family: var(--font-ui, monospace);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted, #888);
    }

    .bw-stat-value {
      font-family: var(--font-ui, monospace);
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #eee);
    }

    .bw-quality-poor    { color: #eab308; }
    .bw-quality-fair    { color: #84cc16; }
    .bw-quality-good    { color: #22c55e; }
    .bw-quality-great   { color: #10b981; }
    .bw-quality-perfect { color: #f59e0b; }

    /* ── Hint text ──────────────────────────────────────── */
    .bw-hint {
      font-family: var(--font-ui, monospace);
      font-size: 12px;
      color: var(--text-muted, #888);
      line-height: 1.5;
    }

    .bw-flavor {
      font-family: var(--font-ui, monospace);
      font-size: 12px;
      font-style: italic;
      color: var(--text-muted, #888);
      border-left: 2px solid var(--border, #333);
      padding-left: 10px;
      margin-top: 4px;
    }

    .bw-reveal-msg {
      font-family: var(--font-ui, monospace);
      font-size: 12px;
      color: #ef4444;
      font-weight: 600;
      min-height: 18px;
      transition: opacity 300ms;
    }

    /* ── Step indicator ─────────────────────────────────── */
    .bw-step-indicator {
      font-family: var(--font-ui, monospace);
      font-size: 13px;
      font-weight: 700;
      color: var(--accent, #60a5fa);
      letter-spacing: 0.04em;
    }

    .bw-step-chain {
      font-family: var(--font-ui, monospace);
      font-size: 11px;
      color: var(--text-muted, #888);
    }

    .bw-step-chain .bw-step-active {
      color: var(--accent, #60a5fa);
      font-weight: 700;
    }

    .bw-step-chain .bw-step-done {
      color: #22c55e;
      text-decoration: line-through;
    }
  `;
  document.head.appendChild(style);
}


// ════════════════════════════════════════════════════════════
//  PROCESS CHAIN DEFINITIONS
// ════════════════════════════════════════════════════════════

const PROCESS_CHAINS = {
  exterior: ['Sand', 'Prime', 'Paint'],
  interior: ['Clean', 'Repair', 'Condition'],
  rust:     ['Grind', 'Treat', 'Seal'],
  simple:   ['Degrease', 'Clean'],
};

function _determineProcessChain(partData) {
  // Derive chain from partData context
  const name  = (partData.name  || '').toLowerCase();
  const id    = (partData.id    || '').toLowerCase();
  const type  = (partData.processChain || '').toLowerCase();

  if (type && PROCESS_CHAINS[type]) return PROCESS_CHAINS[type];

  // Heuristics from part name / id
  if (/interior|seat|dash|carpet|console|trim/i.test(name + id)) {
    return PROCESS_CHAINS.interior;
  }
  if (/rust|panel|quarter|fender|door|hood|trunk|roof|sill|rocker/i.test(name + id)) {
    return PROCESS_CHAINS.exterior;
  }
  if (/rust.*repair|grind|treat/i.test(name + id)) {
    return PROCESS_CHAINS.rust;
  }

  // Fallback: use difficulty to decide
  const diff = clamp(partData.difficulty ?? 0.5, 0, 1);
  return diff >= 0.4 ? PROCESS_CHAINS.exterior : PROCESS_CHAINS.simple;
}


// ════════════════════════════════════════════════════════════
//  GRID SIZE HELPER
// ════════════════════════════════════════════════════════════

function _gridDimensions(difficulty) {
  if (difficulty < 0.3) return { rows: 2, cols: 3 };  //  6 zones
  if (difficulty < 0.6) return { rows: 3, cols: 4 };  // 12 zones
  return                       { rows: 3, cols: 5 };  // 15 zones
}


// ════════════════════════════════════════════════════════════
//  FLAVOR TEXT
// ════════════════════════════════════════════════════════════

const FLAVOR_TEXT = [
  'Slow and steady. Let the sandpaper do the work.',
  "Don't skip the prep. Paint is only as good as the surface.",
  'Rust never sleeps. Get it all.',
  "That's a lot of Bondo... but it'll hold.",
  "Factory finish? No. But it's honest work.",
  'Even coverage. No drips, no runs.',
  'Work the whole panel — no spot-sanding.',
  'Patience. This is where the car remembers you.',
];

const RUST_REVEAL_FLAVOR = [
  "That's deeper than it looked.",
  'Rust never sleeps.',
  'Found more damage underneath the rust.',
  'Surface was hiding a nasty pocket.',
];


// ════════════════════════════════════════════════════════════
//  QUALITY HELPERS
// ════════════════════════════════════════════════════════════

function _qualityLabel(q) {
  if (q < 0.30) return { label: 'POOR',    cls: 'bw-quality-poor'    };
  if (q < 0.60) return { label: 'FAIR',    cls: 'bw-quality-fair'    };
  if (q < 0.80) return { label: 'GOOD',    cls: 'bw-quality-good'    };
  if (q < 0.95) return { label: 'GREAT',   cls: 'bw-quality-great'   };
  return               { label: 'PERFECT', cls: 'bw-quality-perfect' };
}


// ════════════════════════════════════════════════════════════
//  AUDIO HELPER
// ════════════════════════════════════════════════════════════

function _playAudio(name, opts = {}) {
  try {
    const am = window.audioManager;
    if (!am) return null;
    return am.play(name, opts) ?? null;
  } catch (_) { return null; }
}

function _stopAudioHandle(handle) {
  if (!handle) return;
  try {
    const am = window.audioManager;
    if (am) am.stop(handle);
  } catch (_) {}
}


// ════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ════════════════════════════════════════════════════════════

/**
 * Render the Bodywork mechanic into `container` and begin the interaction.
 *
 * @param {object}   partData       - Part definition (name, difficulty, …)
 * @param {object}   instanceState  - Part instance state (condition, …)
 * @param {Element}  container      - DOM element to render into
 * @param {Function} onComplete     - Called with { newCondition, xpEarned, logEntries[] }
 * @param {object}   playerTools    - { daPolisher: bool, mediaBlaster: bool, … }
 * @param {number}   skillLevel     - Bodywork skill level (1–20)
 */
export function startBodywork(
  partData,
  instanceState,
  container,
  onComplete,
  playerTools = {},
  skillLevel  = 1,
) {
  _injectCSS();

  // ── Derived constants ─────────────────────────────────────
  const difficulty   = clamp(partData.difficulty ?? 0.5, 0, 1);
  const startCond    = instanceState.condition ?? 0.20;
  const processChain = _determineProcessChain(partData);
  const totalSteps   = processChain.length;
  const { rows, cols } = _gridDimensions(difficulty);
  const totalZones   = rows * cols;

  // Tool flags
  const hasDAPolisher   = !!(playerTools.daPolisher   ?? playerTools.da_polisher);
  const hasMediaBlaster = !!(playerTools.mediaBlaster ?? playerTools.media_blaster);

  // Fill durations (ms) — skill gives -3% per level (clamped: max -57% at level 20)
  const skillReduction = clamp((skillLevel - 1) * 0.03, 0, 0.57);
  const speedMult      = hasDAPolisher ? 0.5 : 1.0;            // DA Polisher: ½ time
  const BASE_FILL_MS   = 1500 * speedMult * (1 - skillReduction);
  const RUST_FILL_MS   = 3000 * speedMult * (1 - skillReduction);

  // XP
  const baseXP = 12 + difficulty * 35;

  // ── Rust zone indices (random, 20–35% of zones) ───────────
  const rustCount  = Math.round(totalZones * (0.20 + Math.random() * 0.15));
  const rustIndices = new Set();
  while (rustIndices.size < rustCount) {
    rustIndices.add(randomInt(0, totalZones - 1));
  }

  // ── Mutable state ──────────────────────────────────────────
  // zoneQuality[stepIdx][zoneIdx] = 0.0–1.0
  const zoneQuality = Array.from({ length: totalSteps }, () =>
    new Array(totalZones).fill(0)
  );
  // zoneFill[zoneIdx] = current fill % (0–1) in active step
  const zoneFill = new Array(totalZones).fill(0);

  let currentStep         = 0;
  let isComplete          = false;
  let rustDamagePenalty   = 0;      // cumulative from rust reveals
  let continuousCoverage  = true;   // tracks if any zone was abandoned mid-fill
  let rustZonesCleared    = 0;      // for XP bonus

  let activeZoneIdx       = -1;     // zone currently being held
  let holdStartTime       = 0;      // performance.now() when hold began
  let holdRAF             = null;   // requestAnimationFrame id for fill loop
  let fillAtHoldStart     = 0;      // fill % when hold started (for partial progress)
  let _sandLoopHandle     = null;   // { stop() } handle returned by audio.play('sand_loop')

  let timerStart          = performance.now();
  let timerRAF            = null;


  // ════════════════════════════════════════════════════════════
  //  BUILD UI
  // ════════════════════════════════════════════════════════════

  container.innerHTML = '';
  container.style.cssText = [
    'padding: 16px',
    'display: flex',
    'flex-direction: column',
    'gap: 14px',
    'max-width: 620px',
    'margin: 0 auto',
    'font-family: var(--font-ui, monospace)',
  ].join(';');
  container.style.userSelect = 'none';

  // ── Header ────────────────────────────────────────────────
  const headerEl = _el('div', {
    style: 'display:flex; flex-direction:column; gap:4px;',
  });

  const stepEl = _el('div', { className: 'bw-step-indicator' });
  const chainEl = _el('div', { className: 'bw-step-chain' });
  const partNameEl = _el('div', {
    style: 'font-size:13px; color:var(--text-muted,#888); font-family:var(--font-ui,monospace);',
    textContent: `Part: ${partData.name || 'Unknown'}`,
  });

  headerEl.appendChild(stepEl);
  headerEl.appendChild(chainEl);
  headerEl.appendChild(partNameEl);
  container.appendChild(headerEl);

  // ── Main area: grid + stats sidebar ───────────────────────
  const mainRow = _el('div', {
    style: 'display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;',
  });

  // Grid wrapper (for transition animation target)
  const gridWrapper = _el('div', { style: 'flex:1; min-width:0;' });
  const gridEl = _el('div', { className: 'bw-grid' });
  gridEl.style.gridTemplateColumns = `repeat(${cols}, minmax(60px, 1fr))`;
  gridEl.style.gridTemplateRows    = `repeat(${rows}, minmax(60px, auto))`;
  gridWrapper.appendChild(gridEl);

  // Stats column
  const statsEl = _el('div', { className: 'bw-stat-block' });

  const coverageLabelEl = _el('div', { className: 'bw-stat-label', textContent: 'Coverage' });
  const coverageValEl   = _el('div', { className: 'bw-stat-value', textContent: '0%' });
  const qualityLabelEl  = _el('div', { className: 'bw-stat-label', textContent: 'Quality' });
  const qualityValEl    = _el('div', { className: 'bw-stat-value bw-quality-poor', textContent: 'POOR' });
  const timeLabelEl     = _el('div', { className: 'bw-stat-label', textContent: 'Time' });
  const timeValEl       = _el('div', { className: 'bw-stat-value', textContent: '0:00' });

  [
    coverageLabelEl, coverageValEl,
    qualityLabelEl, qualityValEl,
    timeLabelEl, timeValEl,
  ].forEach(el => statsEl.appendChild(el));

  mainRow.appendChild(gridWrapper);
  mainRow.appendChild(statsEl);
  container.appendChild(mainRow);

  // ── Hint + reveal msg ─────────────────────────────────────
  const hintEl = _el('div', {
    className: 'bw-hint',
    innerHTML: 'Hold on each zone to work it. Rust zones take 2× time.',
  });
  container.appendChild(hintEl);

  const revealMsgEl = _el('div', { className: 'bw-reveal-msg', textContent: '' });
  container.appendChild(revealMsgEl);

  // ── Flavor text ───────────────────────────────────────────
  const flavorEl = _el('div', { className: 'bw-flavor' });
  container.appendChild(flavorEl);

  // ── Zone elements array ───────────────────────────────────
  const zoneEls   = [];  // DOM elements
  const fillEls   = [];  // fill layer elements

  function _buildGrid() {
    gridEl.innerHTML = '';
    zoneEls.length = 0;
    fillEls.length = 0;

    for (let i = 0; i < totalZones; i++) {
      const isRust = rustIndices.has(i);

      const zoneEl  = _el('div', { className: 'bw-zone' });
      const fillEl  = _el('div', { className: 'bw-zone-fill' });
      const iconEl  = _el('div', { className: 'bw-zone-icon' });
      const labelEl = _el('div', { className: 'bw-zone-label' });

      zoneEl.appendChild(fillEl);
      zoneEl.appendChild(iconEl);
      zoneEl.appendChild(labelEl);
      gridEl.appendChild(zoneEl);

      zoneEls.push(zoneEl);
      fillEls.push(fillEl);

      _applyZoneState(i, isRust ? 'rust' : 'empty', 0);

      // Event listeners
      zoneEl.addEventListener('mousedown',  (e) => { e.preventDefault(); _startHold(i); });
      zoneEl.addEventListener('touchstart', (e) => { e.preventDefault(); _startHold(i); }, { passive: false });
      zoneEl.addEventListener('mouseup',    (e) => { e.preventDefault(); _endHold(i); });
      zoneEl.addEventListener('mouseleave', (e) => { if (activeZoneIdx === i) _endHold(i); });
      zoneEl.addEventListener('touchend',   (e) => { e.preventDefault(); _endHold(i); });
      zoneEl.addEventListener('touchcancel',(e) => { e.preventDefault(); _endHold(i); });
    }
  }


  // ════════════════════════════════════════════════════════════
  //  ZONE STATE RENDERING
  // ════════════════════════════════════════════════════════════

  function _applyZoneState(idx, state, fillPct) {
    const zoneEl  = zoneEls[idx];
    const fillEl  = fillEls[idx];
    const iconEl  = zoneEl.querySelector('.bw-zone-icon');
    const labelEl = zoneEl.querySelector('.bw-zone-label');

    // Remove all state classes
    zoneEl.classList.remove(
      'bw-zone--empty', 'bw-zone--rust', 'bw-zone--wip',
      'bw-zone--rust-wip', 'bw-zone--done',
    );

    switch (state) {
      case 'empty':
        zoneEl.classList.add('bw-zone--empty');
        iconEl.textContent  = '';
        labelEl.textContent = '';
        fillEl.style.height = '0%';
        break;

      case 'rust':
        zoneEl.classList.add('bw-zone--rust');
        iconEl.textContent  = '🟫';
        labelEl.textContent = 'RUST';
        fillEl.style.height = '0%';
        break;

      case 'wip': {
        zoneEl.classList.add('bw-zone--wip');
        const pct = Math.round(fillPct * 100);
        iconEl.textContent  = '';
        labelEl.textContent = `${pct}%`;
        fillEl.style.height = `${pct}%`;
        break;
      }

      case 'rust-wip': {
        zoneEl.classList.add('bw-zone--rust-wip');
        const pct = Math.round(fillPct * 100);
        iconEl.textContent  = '🟫';
        labelEl.textContent = `${pct}%`;
        fillEl.style.height = `${pct}%`;
        break;
      }

      case 'done':
        zoneEl.classList.add('bw-zone--done');
        iconEl.textContent  = '✓';
        labelEl.textContent = 'DONE';
        fillEl.style.height = '100%';
        break;
    }
  }

  function _refreshZoneVisual(idx) {
    const isRust  = rustIndices.has(idx);
    const fill    = zoneFill[idx];
    const isDone  = fill >= 1.0;

    if (isDone) {
      _applyZoneState(idx, 'done', 1.0);
    } else if (fill > 0) {
      _applyZoneState(idx, isRust ? 'rust-wip' : 'wip', fill);
    } else {
      _applyZoneState(idx, isRust ? 'rust' : 'empty', 0);
    }
  }


  // ════════════════════════════════════════════════════════════
  //  HOLD MECHANICS
  // ════════════════════════════════════════════════════════════

  function _startHold(idx) {
    if (isComplete) return;

    // If already holding a different zone, release it first
    if (activeZoneIdx !== -1 && activeZoneIdx !== idx) {
      _endHold(activeZoneIdx);
    }

    // If zone is already done, nothing to do
    if (zoneFill[idx] >= 1.0) return;

    const isRust = rustIndices.has(idx);

    // Media Blaster: instantly complete rust zones
    if (isRust && hasMediaBlaster) {
      _completeZone(idx, true /* instant */);
      return;
    }

    activeZoneIdx    = idx;
    fillAtHoldStart  = zoneFill[idx];
    holdStartTime    = performance.now();

    // Stop any loop that might still be running (safety guard against double-start)
    _stopAudioHandle(_sandLoopHandle);
    _sandLoopHandle = _playAudio('sand_loop', { loop: true });
    _tickFill();
  }

  function _endHold(idx) {
    if (activeZoneIdx !== idx) return;

    _stopAudioHandle(_sandLoopHandle);
    _sandLoopHandle = null;
    cancelAnimationFrame(holdRAF);
    holdRAF = null;

    // Commit current fill into quality (partial = partial quality)
    const currentFill = zoneFill[idx];
    if (currentFill > 0 && currentFill < 1.0) {
      // Partial release — zone retains progress but we flag coverage was broken
      continuousCoverage = false;
    }

    // Persist fill into zone quality for this step
    zoneQuality[currentStep][idx] = Math.max(zoneQuality[currentStep][idx], currentFill);

    activeZoneIdx = -1;
    _refreshZoneVisual(idx);
    _updateStats();
  }

  function _tickFill() {
    if (activeZoneIdx === -1 || isComplete) return;

    const idx    = activeZoneIdx;
    const isRust = rustIndices.has(idx);
    const fillMs = isRust ? RUST_FILL_MS : BASE_FILL_MS;

    const elapsed = performance.now() - holdStartTime;
    const delta   = elapsed / fillMs;             // 0→1 over fillMs
    const newFill = clamp(fillAtHoldStart + delta, 0, 1.0);

    zoneFill[idx] = newFill;
    _refreshZoneVisual(idx);
    _updateStats();

    if (newFill >= 1.0) {
      _completeZone(idx, false);
      return;
    }

    holdRAF = requestAnimationFrame(_tickFill);
  }

  function _completeZone(idx, instant) {
    const isRust = rustIndices.has(idx);

    cancelAnimationFrame(holdRAF);
    holdRAF       = null;
    activeZoneIdx = -1;

    _stopAudioHandle(_sandLoopHandle);
    _sandLoopHandle = null;

    zoneFill[idx] = 1.0;
    zoneQuality[currentStep][idx] = 1.0;

    _applyZoneState(idx, 'done', 1.0);
    // Media Blaster instant-clear gets a distinct gold blast animation
    _triggerAnimation(zoneEls[idx], instant ? 'bw-media-blast' : 'bw-zone-complete-flash');
    _playAudio(instant ? 'impact' : 'ui_click');

    if (isRust) {
      rustZonesCleared++;
      // 25% chance to reveal hidden damage
      if (Math.random() < 0.25) {
        _rustReveal(idx);
      }
    }

    _updateStats();
    _checkStepComplete();
  }

  function _rustReveal(idx) {
    rustDamagePenalty += 0.05;

    _triggerAnimation(zoneEls[idx], 'bw-rust-reveal-flash');
    revealMsgEl.textContent = pickRandom(RUST_REVEAL_FLAVOR);

    setTimeout(() => {
      revealMsgEl.textContent = '';
    }, 3500);

    _setFlavor(pickRandom([
      "That's deeper than it looked.",
      'Rust never sleeps.',
      'Found a pocket underneath. More work to do.',
    ]));
  }


  // ════════════════════════════════════════════════════════════
  //  STEP MANAGEMENT
  // ════════════════════════════════════════════════════════════

  function _checkStepComplete() {
    // All zones in current step must be fully filled
    const allDone = zoneFill.every(f => f >= 1.0);
    if (!allDone) return;

    _playAudio('system_complete');

    if (currentStep < totalSteps - 1) {
      // Advance to next step
      _advanceStep();
    } else {
      // All steps done — finish the mechanic
      _finishBodywork();
    }
  }

  function _advanceStep() {
    // Animate grid out and back in
    gridEl.classList.add('bw-grid-transitioning');

    setTimeout(() => {
      currentStep++;

      // Reset fills for new step — rust zones persist as rust (not done)
      for (let i = 0; i < totalZones; i++) {
        zoneFill[i] = 0;
        const isRust = rustIndices.has(i);
        _applyZoneState(i, isRust ? 'rust' : 'empty', 0);
      }

      _updateStepIndicator();
      _setFlavor(pickRandom(FLAVOR_TEXT));
      gridEl.classList.remove('bw-grid-transitioning');
      _updateStats();
    }, 300);   // halfway through the animation
  }


  // ════════════════════════════════════════════════════════════
  //  STATS & DISPLAY
  // ════════════════════════════════════════════════════════════

  function _countCompletedZones() {
    return zoneFill.filter(f => f >= 1.0).length;
  }

  function _overallQuality() {
    let total = 0;
    let count = 0;
    for (let s = 0; s < totalSteps; s++) {
      for (let z = 0; z < totalZones; z++) {
        total += zoneQuality[s][z];
        count++;
      }
    }
    const raw = count > 0 ? total / count : 0;
    return clamp(raw - rustDamagePenalty, 0, 1.0);
  }

  function _updateStats() {
    const completed  = _countCompletedZones();
    const coverage   = Math.round((completed / totalZones) * 100);
    const quality    = _overallQuality();
    const { label, cls } = _qualityLabel(quality);

    // Coverage bar with pulse
    coverageValEl.textContent = `${coverage}%`;
    _triggerAnimation(coverageValEl, 'bw-coverage-tick');

    // Quality
    qualityValEl.textContent  = label;
    qualityValEl.className    = `bw-stat-value ${cls}`;
  }

  function _updateStepIndicator() {
    const stepName = processChain[currentStep];
    stepEl.textContent = `Process: ${stepName} (Step ${currentStep + 1}/${totalSteps})`;
    _triggerAnimation(stepEl, 'bw-step-badge-pop');

    // Render chain with done/active/pending styling
    chainEl.innerHTML = processChain.map((name, i) => {
      if (i < currentStep)      return `<span class="bw-step-done">${name}</span>`;
      if (i === currentStep)    return `<span class="bw-step-active">${name}</span>`;
      return `<span>${name}</span>`;
    }).join(' → ');
  }

  function _updateTimer() {
    const elapsed  = Math.floor((performance.now() - timerStart) / 1000);
    const mins     = Math.floor(elapsed / 60);
    const secs     = elapsed % 60;
    timeValEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    timerRAF = requestAnimationFrame(_updateTimer);
  }

  function _setFlavor(text, animate = true) {
    flavorEl.textContent = `"${text}"`;
    if (animate) {
      flavorEl.classList.remove('bw-flavor-in');
      void flavorEl.offsetWidth;
      flavorEl.classList.add('bw-flavor-in');
      flavorEl.addEventListener('animationend',
        () => flavorEl.classList.remove('bw-flavor-in'), { once: true });
    }
  }


  // ════════════════════════════════════════════════════════════
  //  COMPLETION
  // ════════════════════════════════════════════════════════════

  function _finishBodywork() {
    isComplete = true;

    cancelAnimationFrame(timerRAF);
    cancelAnimationFrame(holdRAF);
    _stopAudioHandle(_sandLoopHandle);
    _sandLoopHandle = null;

    const qualityScore = _overallQuality();

    // Condition improvement: finalCondition = current + quality * (0.85 - current)
    const gap = 0.85 - startCond;
    let newCondition = parseFloat(
      clamp(startCond + qualityScore * gap, startCond, 0.85).toFixed(2),
    );

    // XP
    const continuousBonus = continuousCoverage ? 1.10 : 1.0;
    let xpEarned = Math.round(
      baseXP * qualityScore * (1 + rustZonesCleared * 0.05) * continuousBonus,
    );

    // ── Perfect Repair proc (skill level 16+, 5% chance) ──────
    let perfectRepair = false;
    if (skillLevel >= 16 && Math.random() < 0.05) {
      perfectRepair = true;
      newCondition  = 1.00;
      xpEarned      = xpEarned * 2;
    }

    const { label: qualLabel } = _qualityLabel(qualityScore);

    const logEntries = [
      `Bodywork complete — ${processChain.join(' → ')}`,
      `Coverage quality: ${qualLabel} (${Math.round(qualityScore * 100)}%)`,
      `Rust zones cleared: ${rustZonesCleared}`,
      `Condition: ${Math.round(startCond * 100)}% → ${Math.round(newCondition * 100)}%`,
      `Bodywork XP earned: +${xpEarned}`,
    ];

    if (continuousCoverage && rustZonesCleared === 0) {
      logEntries.push('Continuous Coverage bonus applied (+10% XP).');
    }
    if (rustDamagePenalty > 0) {
      logEntries.push(
        `Hidden rust damage found — quality reduced by ${Math.round(rustDamagePenalty * 100)}%.`,
      );
    }
    if (perfectRepair) {
      logEntries.push('⚡ PERFECT REPAIR proc! Panel restored to factory spec! (2× XP)');
    }

    if (perfectRepair) {
      _setFlavor('⚡ PERFECT REPAIR — Factory spec. No blemishes, no excuses.');
      _triggerAnimation(gridEl, 'bw-perfect-repair-flash');
    } else {
      _setFlavor("Factory finish? No. But it's honest work.");
    }

    // Mark all zones done visually if they weren't already
    for (let i = 0; i < totalZones; i++) {
      _applyZoneState(i, 'done', 1.0);
    }

    hintEl.textContent = perfectRepair
      ? '⚡ Perfect Repair! All steps complete.'
      : 'All steps complete. Good work.';

    setTimeout(() => {
      onComplete({ newCondition, xpEarned, logEntries, perfectRepair });
    }, 1000);
  }


  // ════════════════════════════════════════════════════════════
  //  GLOBAL MOUSE/TOUCH RELEASE (catches release outside zone)
  // ════════════════════════════════════════════════════════════

  function _onGlobalRelease(e) {
    if (activeZoneIdx !== -1) {
      _endHold(activeZoneIdx);
    }
  }

  document.addEventListener('mouseup',    _onGlobalRelease);
  document.addEventListener('touchend',   _onGlobalRelease);
  document.addEventListener('touchcancel', _onGlobalRelease);

  // Clean up global listeners when container is removed or re-used
  // (workbench.js should call cleanup if it replaces the mechanic view)
  container._bwCleanup = function () {
    document.removeEventListener('mouseup',     _onGlobalRelease);
    document.removeEventListener('touchend',    _onGlobalRelease);
    document.removeEventListener('touchcancel', _onGlobalRelease);
    cancelAnimationFrame(holdRAF);
    cancelAnimationFrame(timerRAF);
    _stopAudioHandle(_sandLoopHandle);
    _sandLoopHandle = null;
  };


  // ════════════════════════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════════════════════════

  _buildGrid();
  _updateStepIndicator();
  _updateStats();
  _setFlavor(pickRandom(FLAVOR_TEXT), false);
  _updateTimer();
}


// ════════════════════════════════════════════════════════════
//  LOCAL HELPERS
// ════════════════════════════════════════════════════════════

function _el(tag, props = {}) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if      (k === 'style')       node.style.cssText = v;
    else if (k === 'className')   node.className = v;
    else if (k === 'textContent') node.textContent = v;
    else if (k === 'innerHTML')   node.innerHTML = v;
    else                          node.setAttribute(k, v);
  }
  return node;
}

function _triggerAnimation(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;   // force reflow
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}
