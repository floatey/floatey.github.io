// ════════════════════════════════════════════════════════════
//  mechanics/precision.js — Precision Work (Pendulum + Sequences + Torque Lock)
//
//  GDD v2.0 §5 MECHANIC 4 — PRECISION WORK
//  Inspiration: Rhythm Heaven (pendulum)
//  Feel: Tense, methodical, deeply satisfying when locked in
//
//  The pendulum swings. You tap when it crosses centre.
//  Complete N consecutive centre taps to finish one sequence.
//  Complete 3 sequences in a row to enter Torque Lock.
//  In Torque Lock, resonance notes accumulate into a full C major chord.
//
//  Usage:
//    startPrecisionWork(partData, instanceState, container,
//                       onComplete, playerTools, skillLevel)
//
//  onComplete fires with: { newCondition, xpEarned, logEntries }
//
//  FILE LOCATION: game/js/mechanics/precision.js
// ════════════════════════════════════════════════════════════

import { RhythmEngine } from '../audio.js';
import { clamp, pickRandom } from '../utils.js';

// ── One-time CSS injection ────────────────────────────────────
let _cssInjected = false;

function _injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;

  const style = document.createElement('style');
  style.id = 'precision-v2-styles';
  style.textContent = `

    /* ── Container ── */
    .prec-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-width: 540px;
      margin: 0 auto;
      font-family: var(--font-ui, sans-serif);
      user-select: none;
      -webkit-user-select: none;
      border-radius: 8px;
      transition: background 600ms ease, box-shadow 600ms ease;
    }

    /* Torque Lock amber glow on container */
    .mechanic-container--torque-lock {
      background: rgba(245, 158, 11, 0.04) !important;
    }

    @keyframes prec-torque-lock-pulse {
      0%, 100% { box-shadow: 0 0 0px rgba(245,158,11,0); }
      50%       { box-shadow: 0 0 24px rgba(245,158,11,0.18); }
    }
    .mechanic-container--torque-lock {
      animation: prec-torque-lock-pulse 2s ease infinite;
    }

    /* Resonance levels on container */
    .resonance-note--active-1 { --prec-resonance-opacity: 0.06; }
    .resonance-note--active-2 { --prec-resonance-opacity: 0.10; }
    .resonance-note--active-3 { --prec-resonance-opacity: 0.14; }
    .resonance-note--active-4 { --prec-resonance-opacity: 0.18; }
    .resonance-note--active-5 { --prec-resonance-opacity: 0.24; }

    /* ── Header ── */
    .prec-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .prec-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary, #fff);
    }
    .prec-meta {
      font-family: var(--font-data, monospace);
      font-size: 11px;
      color: var(--text-muted, #666);
    }

    /* ── Tool badges ── */
    .prec-badge {
      font-family: var(--font-data, monospace);
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .prec-badge--tool {
      background: rgba(78,127,255,0.12);
      color: #4e7fff;
      border: 1px solid rgba(78,127,255,0.3);
    }

    /* ── Pendulum area ── */
    .prec-pendulum-area {
      position: relative;
      height: 230px;
      width: 100%;
      border: 1px solid var(--border, #333);
      border-radius: 8px;
      background: var(--bg-elevated, #111);
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      overflow: hidden;
    }

    /* Centre guideline — thin vertical line at the tap zone */
    .prec-pendulum-area::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 1px;
      background: rgba(255,255,255,0.06);
      pointer-events: none;
    }

    /* ── Pivot point ── */
    .prec-pivot {
      position: absolute;
      top: 26px;
      left: 50%;
      width: 0;
      height: 0;
      /* The arm rotates from this exact point */
    }

    /* Visible pivot dot */
    .prec-pivot::before {
      content: '';
      position: absolute;
      top: -6px;
      left: -6px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--text-secondary, #aaa);
      border: 1px solid var(--border, #444);
      transition: border-color 150ms, box-shadow 150ms;
      z-index: 3;
    }
    .prec-pivot--in-window::before {
      border-color: var(--accent, #60a5fa);
      box-shadow: 0 0 8px var(--accent, #60a5fa);
    }

    /* ── Pendulum arm ── */
    .prec-arm {
      position: absolute;
      top: 0;
      left: -2px;
      width: 4px;
      height: 158px;
      background: linear-gradient(to bottom,
        var(--text-secondary, #666) 0%,
        var(--border, #444) 80%,
        transparent 100%);
      border-radius: 2px;
      transform-origin: top center;
      transform: rotate(0deg);
      z-index: 2;
    }

    /* ── Pendulum bob ── */
    .prec-bob {
      position: absolute;
      bottom: -16px;
      left: 50%;
      transform: translateX(-50%);
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--bg-card, #1c1c1c);
      border: 2px solid var(--text-secondary, #555);
      transition: border-color 100ms ease, box-shadow 100ms ease, background 100ms ease;
      z-index: 3;
    }
    .prec-bob--in-window {
      border-color: var(--accent, #60a5fa);
      box-shadow: 0 0 10px var(--accent, #60a5fa);
      background: rgba(96, 165, 250, 0.12);
    }

    /* ── Window label ── */
    .prec-window-indicator {
      position: absolute;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      font-family: var(--font-data, monospace);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: var(--text-muted, #444);
      pointer-events: none;
      transition: color 100ms ease;
      white-space: nowrap;
    }
    .prec-window--active {
      color: var(--accent, #60a5fa);
    }

    /* ── Sequence step row ── */
    .prec-seq-row {
      display: flex;
      gap: 6px;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
    }

    .prec-seq-step {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid var(--border, #444);
      background: var(--bg-elevated, #111);
      transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
      position: relative;
    }
    /* Already completed in this sequence */
    .prec-seq-step--filled {
      background: var(--accent, #60a5fa);
      border-color: var(--accent, #60a5fa);
      box-shadow: 0 0 6px rgba(96,165,250,0.4);
    }
    /* Current target step */
    .prec-seq-step--active {
      border-color: var(--accent, #60a5fa);
      animation: prec-step-pulse 900ms ease infinite;
    }
    @keyframes prec-step-pulse {
      0%, 100% { box-shadow: 0 0 0px rgba(96,165,250,0); }
      50%       { box-shadow: 0 0 10px rgba(96,165,250,0.5); }
    }
    /* Final (critical) step */
    .prec-seq-step--critical {
      border-color: #f59e0b !important;
      animation: prec-critical-pulse 500ms ease infinite !important;
    }
    @keyframes prec-critical-pulse {
      0%, 100% { box-shadow: 0 0 0px rgba(245,158,11,0); }
      50%       { box-shadow: 0 0 12px rgba(245,158,11,0.7); }
    }

    /* ── Torque Lock pips ── */
    .prec-lock-row {
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: center;
    }
    .prec-lock-pip {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1.5px solid var(--border, #333);
      background: var(--bg-elevated, #111);
      transition: background 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
    }
    .prec-lock-pip--amber {
      background: rgba(245, 158, 11, 0.25);
      border-color: #f59e0b;
    }
    .prec-lock-pip--gold {
      background: #f59e0b;
      border-color: #fbbf24;
      box-shadow: 0 0 6px rgba(245,158,11,0.5);
    }
    .prec-lock-label {
      font-family: var(--font-data, monospace);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: var(--text-muted, #555);
      text-transform: uppercase;
      transition: color 300ms ease;
      margin-left: 4px;
    }
    .prec-lock-label--active {
      color: #f59e0b;
    }

    /* ── Progress bar ── */
    .prec-progress-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prec-progress-labels {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-data, monospace);
      font-size: 11px;
      color: var(--text-secondary, #aaa);
    }
    .prec-progress-track {
      height: 10px;
      border-radius: 5px;
      background: var(--bg-elevated, #1a1a1a);
      border: 1px solid var(--border, #333);
      overflow: hidden;
    }
    .prec-progress-fill {
      height: 100%;
      border-radius: 5px;
      background: var(--condition-good, #22c55e);
      transition: width 300ms ease;
    }
    @keyframes prec-complete-sweep {
      0%   { background: var(--condition-good, #22c55e); }
      50%  { background: #10b981; filter: brightness(1.5); }
      100% { background: var(--condition-excellent, #10b981);
             box-shadow: 0 0 16px rgba(16,185,129,0.4); }
    }
    .prec-progress-fill--complete {
      animation: prec-complete-sweep 700ms ease forwards !important;
    }

    /* ── Flavor text ── */
    .prec-flavor {
      font-size: 12px;
      font-style: italic;
      color: var(--text-secondary, #aaa);
      text-align: center;
      min-height: 18px;
      transition: opacity 150ms ease;
    }

    /* ── Sequence break shake ── */
    @keyframes prec-shake {
      0%          { transform: translateX(0); }
      15%, 45%, 75% { transform: translateX(-7px); }
      30%, 60%, 90% { transform: translateX(7px); }
      100%        { transform: translateX(0); }
    }
    .prec-shake {
      animation: prec-shake 350ms ease !important;
    }

    /* ── Completion flash ── */
    @keyframes prec-done-flash {
      from { background: rgba(34,197,94,0.15); }
      to   { background: transparent; }
    }
    .prec-done { animation: prec-done-flash 800ms ease forwards; }
  `;
  document.head.appendChild(style);
}


// ── Flavor text pools ─────────────────────────────────────────
const GENERIC_FLAVOR = [
  'Smooth and steady.',
  'Right on the money.',
  'Spec is spec.',
  'Feel the centre.',
  'Wait for the window.',
  'Patience. Then commit.',
  'The pendulum doesn\'t lie.',
  'Each click builds the chord.',
];

const COMPLETE_FLAVOR = [
  'Sequence complete. Keep going.',
  'Clean work. One more.',
  'That\'s torqued to spec.',
  'Locked in.',
];

const BREAK_FLAVOR = [
  'Sequence broken. Start again.',
  'Too early. Wait for centre.',
  'Off beat. Reset.',
  'The window was closed.',
  'Don\'t rush the pendulum.',
];


// ════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ════════════════════════════════════════════════════════════

/**
 * Render the Precision Work mechanic into `container` and begin the interaction.
 *
 * @param {object}   partData       – Part definition (name, difficulty, flavorText, id, …)
 * @param {object}   instanceState  – Part instance state (condition, …)
 * @param {Element}  container      – DOM element to render into
 * @param {Function} onComplete     – Called with { newCondition, xpEarned, logEntries }
 * @param {object}   playerTools    – Map of owned tool IDs (torque_wrench, angle_gauge)
 * @param {number}   skillLevel     – Player's precision skill level (1–20)
 */
export function startPrecisionWork(
  partData,
  instanceState,
  container,
  onComplete,
  playerTools = {},
  skillLevel  = 1
) {
  _injectCSS();

  // ── Constants ────────────────────────────────────────────────
  const difficulty      = clamp(partData.difficulty ?? 0.5, 0, 1);
  const hasTorqueWrench = !!playerTools.torque_wrench;
  const hasAngleGauge   = !!playerTools.angle_gauge;

  // Use RhythmEngine to derive BPM — same part always gets the same BPM
  const map = RhythmEngine.generateMap(partData.id ?? 'unknown', difficulty, 'precision');
  const bpm = map.bpm;

  // Pendulum physics
  const MAX_ANGLE = 55;                    // degrees, peak swing
  const period    = (60 / bpm) * 2;       // seconds per full pendulum cycle

  // Timing window: 12° (easy diff 0) → 4° (hard diff 1)
  let timingWindowDeg = 12 - (difficulty * 8);
  if (hasAngleGauge) timingWindowDeg += 3;
  // Skill 6–10: +1°, 11–15: +2°, 16–20: +3°
  if (skillLevel >= 16) timingWindowDeg += 3;
  else if (skillLevel >= 11) timingWindowDeg += 2;
  else if (skillLevel >= 6)  timingWindowDeg += 1;
  timingWindowDeg = clamp(timingWindowDeg, 3, 15);

  // Torque wrench: pendulum period is 12% slower (easier to time)
  const effectivePeriod = hasTorqueWrench ? period * 1.12 : period;

  // Sequence length: 3–8 beats
  const seqLength = 3 + Math.round(difficulty * 5);

  // Progress: how many sequences needed
  const startCondition    = clamp(instanceState.condition ?? 0.2, 0, 1);
  const sequencesRequired = Math.max(3, Math.round((1 - startCondition) * 8));

  // XP per sequence
  const baseXP = 15 + difficulty * 50;

  // ── Mutable state ────────────────────────────────────────────
  let elapsed         = 0;
  let lastTs          = null;
  let rafId           = null;
  let isComplete      = false;
  let inputBlocked    = false;

  // Pendulum
  let pendulumAngle   = 0;
  let prevAngle       = 0;
  let wasInWindow     = false;
  let wasAtExtreme    = false;

  // Sequences
  let currentStep     = 0;          // 0 … seqLength-1
  let consecutiveSeqs = 0;          // consecutive complete sequences (for Torque Lock)
  let seqsCompleted   = 0;          // total across the whole job
  let seqsBroken      = 0;

  // Torque Lock
  let inTorqueLock    = false;
  let lockSeqCount    = 0;          // sequences in current Torque Lock run
  let resonanceHandles = [];

  // XP
  let totalXP         = 0;

  // ── Audio helper ─────────────────────────────────────────────
  function playA(method, ...args) {
    try { window.audioManager?.[method]?.(...args); } catch (_) {}
  }

  // ── DOM helpers ──────────────────────────────────────────────
  function _el(tag, props = {}) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if      (k === 'style')       n.style.cssText = v;
      else if (k === 'className')   n.className = v;
      else if (k === 'textContent') n.textContent = v;
      else if (k === 'innerHTML')   n.innerHTML = v;
      else                          n.setAttribute(k, v);
    }
    return n;
  }

  // ── Build UI ─────────────────────────────────────────────────
  container.innerHTML = '';
  container.className = 'prec-container';

  // Header
  const headerEl = _el('div', { className: 'prec-header' });
  headerEl.appendChild(_el('div', { className: 'prec-title',
    textContent: `Precision: ${partData.name ?? 'Component'}` }));
  const metaEl = _el('div', { className: 'prec-meta',
    textContent: `BPM ${bpm}  ·  ${seqLength}-step sequence  ·  ${sequencesRequired} required` });
  headerEl.appendChild(metaEl);
  container.appendChild(headerEl);

  // Tool badges
  if (hasTorqueWrench || hasAngleGauge) {
    const badges = _el('div', { style: 'display:flex; gap:6px; flex-wrap:wrap;' });
    if (hasTorqueWrench) badges.appendChild(_el('span', {
      className: 'prec-badge prec-badge--tool',
      textContent: '🔩 Torque Wrench: slower pendulum',
    }));
    if (hasAngleGauge) badges.appendChild(_el('span', {
      className: 'prec-badge prec-badge--tool',
      textContent: '📐 Angle Gauge: +3° window',
    }));
    container.appendChild(badges);
  }

  // ── Pendulum area ────────────────────────────────────────────
  const pendulumArea = _el('div', { className: 'prec-pendulum-area' });

  //  Pivot → arm (rotates) → bob
  const pivotEl = _el('div', { className: 'prec-pivot' });
  const armEl   = _el('div', { className: 'prec-arm' });
  const bobEl   = _el('div', { className: 'prec-bob' });
  armEl.appendChild(bobEl);
  pivotEl.appendChild(armEl);
  pendulumArea.appendChild(pivotEl);

  // Window label at centre bottom
  const windowLabelEl = _el('div', {
    className: 'prec-window-indicator',
    textContent: '[ TAP HERE ]',
  });
  pendulumArea.appendChild(windowLabelEl);

  container.appendChild(pendulumArea);

  // ── Sequence indicators ──────────────────────────────────────
  const seqRowEl   = _el('div', { className: 'prec-seq-row' });
  const seqStepEls = [];
  for (let i = 0; i < seqLength; i++) {
    const stepEl = _el('div', { className: 'prec-seq-step' });
    stepEl.title = i === seqLength - 1 ? 'CRITICAL — smaller window' : `Beat ${i + 1}`;
    seqStepEls.push(stepEl);
    seqRowEl.appendChild(stepEl);
  }
  container.appendChild(seqRowEl);

  // ── Torque Lock pips ─────────────────────────────────────────
  const lockRowEl  = _el('div', { className: 'prec-lock-row' });
  const lockPipEls = [];
  for (let i = 0; i < 3; i++) {
    const pip = _el('div', { className: 'prec-lock-pip' });
    lockPipEls.push(pip);
    lockRowEl.appendChild(pip);
  }
  const lockLabelEl = _el('span', { className: 'prec-lock-label', textContent: 'TORQUE LOCK' });
  lockRowEl.appendChild(lockLabelEl);
  container.appendChild(lockRowEl);

  // ── Progress bar ─────────────────────────────────────────────
  const progressWrap = _el('div', { className: 'prec-progress-wrap' });
  const progressLabels = _el('div', { className: 'prec-progress-labels' });
  progressLabels.appendChild(_el('span', { textContent: 'Progress' }));
  const progressPctEl = _el('span', { textContent: '0%' });
  progressLabels.appendChild(progressPctEl);
  const progressTrack = _el('div', { className: 'prec-progress-track' });
  const progressFill  = _el('div', { className: 'prec-progress-fill', style: 'width:0%' });
  progressTrack.appendChild(progressFill);
  progressWrap.appendChild(progressLabels);
  progressWrap.appendChild(progressTrack);
  container.appendChild(progressWrap);

  // ── Flavor text ──────────────────────────────────────────────
  const flavorEl = _el('div', {
    className: 'prec-flavor',
    textContent: `"${pickRandom([...GENERIC_FLAVOR, ...(Array.isArray(partData.flavorText) ? partData.flavorText : [])])}"`,
  });
  container.appendChild(flavorEl);


  // ════════════════════════════════════════════════════════════
  //  UI UPDATE HELPERS
  // ════════════════════════════════════════════════════════════

  function updateSeqIndicators() {
    for (let i = 0; i < seqLength; i++) {
      const el = seqStepEls[i];
      el.className = 'prec-seq-step';

      if (i < currentStep) {
        el.classList.add('prec-seq-step--filled');
      } else if (i === currentStep) {
        el.classList.add('prec-seq-step--active');
        if (i === seqLength - 1) el.classList.add('prec-seq-step--critical');
      } else if (i === seqLength - 1 && currentStep >= seqLength - 2) {
        // Upcoming critical beat — warn one step early
        el.classList.add('prec-seq-step--critical');
      }
    }
  }

  function updateLockPips() {
    for (let i = 0; i < 3; i++) {
      lockPipEls[i].className = 'prec-lock-pip';
      if (inTorqueLock) {
        // Show how deep we are in the current lock
        lockPipEls[i].classList.add(i < lockSeqCount ? 'prec-lock-pip--gold' : 'prec-lock-pip--amber');
      } else {
        if (i < consecutiveSeqs) lockPipEls[i].classList.add('prec-lock-pip--amber');
      }
    }
    lockLabelEl.className = 'prec-lock-label' + (inTorqueLock ? ' prec-lock-label--active' : '');
  }

  function updateProgress() {
    const pct = Math.min(100, Math.round((seqsCompleted / sequencesRequired) * 100));
    progressFill.style.width  = `${pct}%`;
    progressPctEl.textContent = `${pct}%`;
  }

  function setFlavor(text) {
    flavorEl.textContent = `"${text}"`;
  }


  // ════════════════════════════════════════════════════════════
  //  RAF LOOP — pendulum physics
  // ════════════════════════════════════════════════════════════

  function tick(ts) {
    if (isComplete) return;

    if (lastTs === null) lastTs = ts;
    // Cap delta to 50ms to avoid jumps after tab blur/resume
    const delta = Math.min((ts - lastTs) / 1000, 0.05);
    elapsed += delta;
    lastTs   = ts;

    prevAngle    = pendulumAngle;
    pendulumAngle = MAX_ANGLE * Math.sin((elapsed / effectivePeriod) * Math.PI * 2);

    // ── Visual update ──────────────────────────────────────────
    armEl.style.transform = `rotate(${pendulumAngle}deg)`;

    // ── Centre crossing (sign change) → on-beat tick ──────────
    const crossedCenter = (prevAngle > 0 && pendulumAngle <= 0) ||
                          (prevAngle < 0 && pendulumAngle >= 0);
    if (crossedCenter && elapsed > 0.1) { // skip very start
      playA('playPrecisionTick', true);
    }

    // ── Turning point (near ±MAX, direction reversal) → quieter tick ──
    const nearExtreme = Math.abs(pendulumAngle) > MAX_ANGLE * 0.88;
    if (nearExtreme && !wasAtExtreme) {
      playA('playPrecisionTick', false);
    }
    wasAtExtreme = nearExtreme;

    // ── Window detection ───────────────────────────────────────
    const isCritical   = currentStep === seqLength - 1;
    const activeWindow = isCritical ? timingWindowDeg * 0.5 : timingWindowDeg;
    const inWindow     = Math.abs(pendulumAngle) < activeWindow;

    if (inWindow && !wasInWindow) {
      playA('playPrecisionWindowChime');
    }
    wasInWindow = inWindow;

    // Update visual feedback on bob and pivot
    bobEl.classList.toggle('prec-bob--in-window', inWindow);
    pivotEl.classList.toggle('prec-pivot--in-window', inWindow);
    windowLabelEl.classList.toggle('prec-window--active', inWindow);

    rafId = requestAnimationFrame(tick);
  }


  // ════════════════════════════════════════════════════════════
  //  HIT RESOLUTION
  // ════════════════════════════════════════════════════════════

  function resolveHit() {
    if (isComplete || inputBlocked) return;

    const isCritical   = currentStep === seqLength - 1;
    const activeWindow = isCritical ? timingWindowDeg * 0.5 : timingWindowDeg;
    const inWindow     = Math.abs(pendulumAngle) < activeWindow;

    if (!inWindow) {
      handleBreak();
      return;
    }

    // Brief cooldown so double-taps don't double-register
    inputBlocked = true;
    setTimeout(() => { inputBlocked = false; }, 90);

    // Correct hit audio
    if (isCritical) {
      playA('playPrecisionCriticalSnap');
    } else {
      playA('playPrecisionBeatSnap', currentStep, seqLength);
    }

    currentStep++;
    updateSeqIndicators();

    if (currentStep >= seqLength) {
      handleSequenceComplete();
    } else {
      const upcoming = seqLength - currentStep;
      if (upcoming === 1) {
        setFlavor('⚡ CRITICAL — tighter window!');
      } else {
        setFlavor(pickRandom(GENERIC_FLAVOR));
      }
    }
  }

  function handleBreak() {
    playA('playPrecisionSequenceBreak', inTorqueLock);

    if (inTorqueLock) exitTorqueLock();

    consecutiveSeqs = 0;
    currentStep     = 0;
    seqsBroken++;

    updateSeqIndicators();
    updateLockPips();
    setFlavor(pickRandom(BREAK_FLAVOR));

    // Shake the seq row
    seqRowEl.classList.remove('prec-shake');
    void seqRowEl.offsetWidth; // force reflow
    seqRowEl.classList.add('prec-shake');
    setTimeout(() => seqRowEl.classList.remove('prec-shake'), 400);
  }

  function handleSequenceComplete() {
    currentStep = 0;
    consecutiveSeqs++;
    seqsCompleted++;

    const seqXP = Math.round((baseXP / sequencesRequired) * (inTorqueLock ? 2.0 : 1.0));
    totalXP += seqXP;

    if (inTorqueLock) {
      lockSeqCount++;

      playA('playPrecisionSequenceComplete', true);

      // Add one resonance note (sustaining chord tone)
      const handle = window.audioManager?.playPrecisionResonance?.(lockSeqCount);
      if (handle) resonanceHandles.push(handle);

      // Update resonance visual on container
      // Remove previous resonance classes and apply current level
      for (let r = 1; r <= 5; r++) container.classList.remove(`resonance-note--active-${r}`);
      container.classList.add(`resonance-note--active-${Math.min(5, lockSeqCount)}`);

      if (lockSeqCount >= 5) setFlavor('⚡ FULL TORQUE LOCK — Maximum resonance!');
      else setFlavor(`Torque Lock ×${lockSeqCount} — keep going!`);
    } else {
      playA('playPrecisionSequenceComplete', false);
      setFlavor(pickRandom(COMPLETE_FLAVOR));

      // Enter Torque Lock if 3 consecutive sequences completed
      if (consecutiveSeqs >= 3) {
        enterTorqueLock();
      }
    }

    updateSeqIndicators();
    updateLockPips();
    updateProgress();

    if (seqsCompleted >= sequencesRequired) {
      setTimeout(completeWork, 700);
    }
  }


  // ════════════════════════════════════════════════════════════
  //  TORQUE LOCK
  // ════════════════════════════════════════════════════════════

  function enterTorqueLock() {
    inTorqueLock = true;
    lockSeqCount = 0;
    container.classList.add('mechanic-container--torque-lock');
    updateLockPips();
    setFlavor('TORQUE LOCK — You\'re locked in!');
  }

  function exitTorqueLock() {
    inTorqueLock = false;
    lockSeqCount = 0;

    // Stop all resonance notes
    resonanceHandles.forEach(h => h?.stop?.());
    resonanceHandles = [];

    // Remove resonance visual classes
    for (let r = 1; r <= 5; r++) container.classList.remove(`resonance-note--active-${r}`);
    container.classList.remove('mechanic-container--torque-lock');
    updateLockPips();
  }


  // ════════════════════════════════════════════════════════════
  //  COMPLETION
  // ════════════════════════════════════════════════════════════

  function completeWork() {
    if (isComplete) return;
    isComplete = true;

    cancelAnimationFrame(rafId);
    detachInput();
    exitTorqueLock();

    // Condition improvement — scales with hit rate across all sequences
    const totalAttempts = seqsCompleted + seqsBroken;
    const hitRate       = seqsCompleted / Math.max(1, totalAttempts);
    const condDelta     = clamp((1 - startCondition) * 0.65 * hitRate, 0.05, 0.30);
    let   newCondition  = parseFloat(clamp(startCondition + condDelta, 0.01, 0.95).toFixed(2));

    // Perfect Repair proc: skill 16+, 5% chance
    let perfectRepair = false;
    if (skillLevel >= 16 && Math.random() < 0.05) {
      perfectRepair  = true;
      newCondition   = 1.00;
      totalXP        = Math.round(totalXP * 2);
    }

    // Final flavor
    if (perfectRepair) {
      setFlavor('⚡ PERFECT REPAIR — Restored to factory spec!');
    } else if (hitRate >= 0.9) {
      setFlavor('Precision work. Torqued to spec.');
    } else if (hitRate >= 0.6) {
      setFlavor('Good enough. It\'ll hold.');
    } else {
      setFlavor('Rough. Should have waited for the window.');
    }

    // Visual completion
    progressFill.style.width = '100%';
    progressPctEl.textContent = '100%';
    progressFill.classList.add('prec-progress-fill--complete');
    container.classList.add('prec-done');

    const logEntries = [
      `Precision torque: ${partData.name} — ${seqsCompleted}/${sequencesRequired} sequences (${seqsBroken} broken)`,
      `Condition: ${Math.round(startCondition * 100)}% → ${Math.round(newCondition * 100)}%`,
      `Precision XP: +${totalXP}`,
    ];
    if (perfectRepair) logEntries.push('⚡ PERFECT REPAIR proc! Part restored to factory spec (2× XP)');

    setTimeout(() => {
      onComplete({ newCondition, xpEarned: totalXP, logEntries });
    }, 1200);
  }


  // ════════════════════════════════════════════════════════════
  //  INPUT
  // ════════════════════════════════════════════════════════════

  function onKeydown(e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      resolveHit();
    }
  }

  function onClick(e) {
    e.preventDefault();
    resolveHit();
  }

  function onTouch(e) {
    e.preventDefault();
    resolveHit();
  }

  function detachInput() {
    document.removeEventListener('keydown', onKeydown);
    container.removeEventListener('click', onClick);
    container.removeEventListener('touchstart', onTouch);
  }

  container.addEventListener('click', onClick);
  container.addEventListener('touchstart', onTouch, { passive: false });
  document.addEventListener('keydown', onKeydown);

  // Register cleanup hook so _teardownMechanic() in workbench.js
  // can cancel the rAF loop and stop audio when navigating away.
  container._bwCleanup = () => {
    isComplete = true;
    cancelAnimationFrame(rafId);
    detachInput();
    resonanceHandles.forEach(h => h?.stop?.());
    resonanceHandles = [];
    container.classList.remove('mechanic-container--torque-lock');
    for (let r = 1; r <= 5; r++) container.classList.remove(`resonance-note--active-${r}`);
    container._bwCleanup = null;
  };


  // ════════════════════════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════════════════════════

  updateSeqIndicators();
  updateLockPips();
  updateProgress();
  rafId = requestAnimationFrame(tick);
}
