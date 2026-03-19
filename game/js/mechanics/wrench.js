// ════════════════════════════════════════════════════════════
//  mechanics/wrench.js — Wrench Work (Call / Response Grid)
//
//  GDD v2.0 §5 MECHANIC 1 — WRENCH WORK
//  Inspiration: Rhythm Heaven
//  Feel: Rhythmic, pattern-seeking, surprises you
//
//  Changelog v2.1:
//    • 4-beat count-in before the first pattern
//    • Hold inputs: press-and-hold notes with connected visuals
//    • Phase sync fix: response starts exactly on engine step 8
//    • "GET READY" signal on step 7 (one beat of warning)
//    • Per-cell EARLY / LATE / PERFECT timing feedback
//    • Response row pre-lights active beats before they arrive
//
//  Usage:
//    const mechanic = new WrenchMechanic({
//      part, skillLevel, tools, audioManager,
//      rhythmEngine, container, onComplete, onBeat
//    });
//    mechanic.start();
//    mechanic.destroy();
//
//  onComplete fires with:
//    { conditionImprovement, xpEarned, qualityMultiplier,
//      completedPerfect, rhythmStats: { bestCombo, totalPatterns } }
// ════════════════════════════════════════════════════════════

import { RhythmEngine } from '../audio.js';
import { composeWrenchSession } from '../rhythm-composer.js';
import { pickRandom, clamp } from '../utils.js';

// ── One-time CSS injection ────────────────────────────────────
let _cssInjected = false;

function _injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.id = 'wrench-v2-styles';
  s.textContent = `
    .wv2-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 580px;
      margin: 0 auto;
      font-family: var(--font-ui, monospace);
      user-select: none;
      -webkit-user-select: none;
    }

    .wv2-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .wv2-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary, #fff);
    }

    .wv2-bpm {
      font-family: var(--font-data, monospace);
      font-size: 11px;
      color: var(--text-muted, #888);
    }

    /* ── Phase banner ── */
    .wv2-phase-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 5px;
      border: 1px solid var(--border, #333);
      background: var(--bg-elevated, #111);
      min-height: 32px;
      transition: background 200ms ease, border-color 200ms ease;
    }

    .wv2-phase-label {
      font-family: var(--font-data, monospace);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted, #666);
      transition: color 200ms ease;
    }

    /* Phase-specific banner states */
    .wv2-phase-banner--countin {
      border-color: #f59e0b66;
      background: rgba(245, 158, 11, 0.06);
    }
    .wv2-phase-banner--countin .wv2-phase-label { color: #f59e0b88; }

    .wv2-phase-banner--call {
      border-color: #4e7fff55;
      background: rgba(78, 127, 255, 0.06);
    }
    .wv2-phase-banner--call .wv2-phase-label { color: #6d9bff; }

    .wv2-phase-banner--ready {
      border-color: #f59e0baa;
      background: rgba(245, 158, 11, 0.12);
      animation: wv2-ready-pulse 300ms ease-in-out 4;
    }
    .wv2-phase-banner--ready .wv2-phase-label { color: #f59e0b; }

    .wv2-phase-banner--response {
      border-color: #22c55e55;
      background: rgba(34, 197, 94, 0.06);
    }
    .wv2-phase-banner--response .wv2-phase-label { color: #22c55e; }

    @keyframes wv2-ready-pulse {
      0%, 100% { background: rgba(245, 158, 11, 0.06); }
      50%       { background: rgba(245, 158, 11, 0.24); }
    }

    /* ── Countdown / count-in pips ── */
    .wv2-countdown {
      display: flex;
      gap: 5px;
      align-items: center;
    }
    .wv2-countdown-pip {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b33;
      border: 1px solid #f59e0b66;
      transition: background 80ms ease, transform 80ms ease, border-color 80ms ease;
    }
    .wv2-countdown-pip--active {
      background: #f59e0b;
      border-color: #fbbf24;
      transform: scale(1.4);
      box-shadow: 0 0 6px #f59e0b88;
    }
    .wv2-countdown-pip--done {
      background: #f59e0b55;
      border-color: #f59e0b88;
      transform: scale(1.0);
    }

    /* ── Call / Response grid ── */
    .wv2-grid-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .wv2-row-label {
      font-family: var(--font-data, monospace);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--text-muted, #666);
      text-transform: uppercase;
    }

    .wv2-beat-row {
      display: flex;
      gap: 4px;
    }

    .wv2-cell {
      flex: 1;
      height: 44px;
      border-radius: 5px;
      border: 1.5px solid var(--border, #333);
      background: var(--bg-elevated, #111);
      transition: background 60ms ease, border-color 120ms ease, transform 60ms ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-family: var(--font-data, monospace);
      font-weight: 700;
      color: transparent;
      position: relative;
      overflow: visible;
    }

    /* ── Call row states ── */
    .wv2-cell--call-preview {
      background: rgba(78, 127, 255, 0.08);
      border-color: #4e7fff44;
    }
    .wv2-cell--call-active {
      background: rgba(78, 127, 255, 0.30);
      border-color: #4e7fff;
      transform: scale(1.04);
    }
    .wv2-cell--call-played {
      background: rgba(78, 127, 255, 0.10);
      border-color: #4e7fff44;
    }

    /* ── Hold cells — call row ── */
    /* The box-shadow bridges the 4px flex gap between cells */
    .wv2-cell--hold-start {
      background: rgba(78, 127, 255, 0.22);
      border-color: #4e7fff99;
      border-radius: 5px 2px 2px 5px;
      box-shadow: 4px 0 0 0 #4e7fff66;
      z-index: 1;
    }
    .wv2-cell--hold-start::after {
      content: '▶';
      color: #4e7fff88;
      font-size: 8px;
      position: absolute;
      right: 5px;
    }
    .wv2-cell--hold-body {
      background: rgba(78, 127, 255, 0.15);
      border-color: #4e7fff66;
      border-radius: 2px;
      box-shadow: -4px 0 0 0 #4e7fff66, 4px 0 0 0 #4e7fff66;
      z-index: 1;
    }
    .wv2-cell--hold-end {
      background: rgba(78, 127, 255, 0.22);
      border-color: #4e7fff99;
      border-radius: 2px 5px 5px 2px;
      box-shadow: -4px 0 0 0 #4e7fff66;
      z-index: 1;
    }
    .wv2-cell--hold-end::before {
      content: '◀';
      color: #4e7fff88;
      font-size: 8px;
      position: absolute;
      left: 5px;
    }

    /* Hold cells while actively playing (call row) */
    .wv2-cell--hold-start.wv2-cell--call-active,
    .wv2-cell--hold-body.wv2-cell--call-active,
    .wv2-cell--hold-end.wv2-cell--call-active {
      background: rgba(78, 127, 255, 0.42);
      border-color: #4e7fff;
      box-shadow: -4px 0 0 0 #4e7fff, 4px 0 0 0 #4e7fff;
    }
    .wv2-cell--hold-start.wv2-cell--call-active { box-shadow: 4px 0 0 0 #4e7fff; }
    .wv2-cell--hold-end.wv2-cell--call-active   { box-shadow: -4px 0 0 0 #4e7fff; }

    /* ── Response row: cursor (current step) ── */
    .wv2-cell--cursor {
      border-color: var(--text-muted, #555);
      border-top-width: 3px;
    }
    .wv2-cell--cursor-active {
      border-color: #f59e0b;
      border-top-width: 3px;
      animation: wv2-cursor-tap-hint 250ms ease-in-out infinite alternate;
    }
    @keyframes wv2-cursor-tap-hint {
      from { background: rgba(245, 158, 11, 0.05); }
      to   { background: rgba(245, 158, 11, 0.18); }
    }

    /* ── Response row: hold cue (press and hold this) ── */
    .wv2-cell--hold-cue {
      background: rgba(245, 158, 11, 0.10);
      border-color: #f59e0b88;
      border-radius: 5px 2px 2px 5px;
      box-shadow: 4px 0 0 0 #f59e0b44;
    }
    .wv2-cell--hold-cue-body {
      background: rgba(245, 158, 11, 0.06);
      border-color: #f59e0b55;
      border-radius: 2px;
      box-shadow: -4px 0 0 0 #f59e0b44, 4px 0 0 0 #f59e0b44;
    }
    .wv2-cell--hold-cue-end {
      background: rgba(245, 158, 11, 0.10);
      border-color: #f59e0b88;
      border-radius: 2px 5px 5px 2px;
      box-shadow: -4px 0 0 0 #f59e0b44;
    }

    /* ── Response row: active hold (player pressing) ── */
    .wv2-cell--holding {
      background: rgba(34, 197, 94, 0.22);
      border-color: #22c55eaa;
      animation: wv2-holding-pulse 200ms ease-in-out infinite alternate;
    }
    .wv2-cell--holding-body {
      background: rgba(34, 197, 94, 0.15);
      border-color: #22c55e66;
      box-shadow: -4px 0 0 0 #22c55e44, 4px 0 0 0 #22c55e44;
      animation: wv2-holding-pulse 200ms ease-in-out infinite alternate;
    }
    .wv2-cell--holding-end {
      background: rgba(34, 197, 94, 0.22);
      border-color: #22c55eaa;
      box-shadow: -4px 0 0 0 #22c55e44;
      animation: wv2-release-hint 400ms ease-in-out infinite alternate;
    }
    @keyframes wv2-holding-pulse {
      from { background: rgba(34, 197, 94, 0.15); }
      to   { background: rgba(34, 197, 94, 0.28); }
    }
    @keyframes wv2-release-hint {
      from { background: rgba(34, 197, 94, 0.20); border-color: #22c55eaa; }
      to   { background: rgba(34, 197, 94, 0.40); border-color: #22c55e; }
    }

    /* ── Response row: correct tap ── */
    .wv2-cell--hit {
      background: rgba(34, 197, 94, 0.30);
      border-color: #22c55e;
      transform: scale(1.05);
    }
    @keyframes wv2-hit-pop {
      0%   { transform: scale(1.05); }
      60%  { transform: scale(1.08); }
      100% { transform: scale(1.0);  background: rgba(34,197,94,0.12); }
    }
    .wv2-cell--hit-anim { animation: wv2-hit-pop 300ms ease forwards; }

    /* ── Hold result states — response row ── */
    .wv2-cell--hold-correct {
      background: rgba(34, 197, 94, 0.25);
      border-color: #22c55eaa;
    }
    .wv2-cell--hold-correct-start {
      border-radius: 5px 2px 2px 5px;
      box-shadow: 4px 0 0 0 #22c55e66;
    }
    .wv2-cell--hold-correct-body {
      border-radius: 2px;
      box-shadow: -4px 0 0 0 #22c55e66, 4px 0 0 0 #22c55e66;
    }
    .wv2-cell--hold-correct-end {
      border-radius: 2px 5px 5px 2px;
      box-shadow: -4px 0 0 0 #22c55e66;
    }
    @keyframes wv2-hold-complete {
      0%   { background: rgba(34, 197, 94, 0.45); }
      100% { background: rgba(34, 197, 94, 0.18); }
    }
    .wv2-cell--hold-complete-anim { animation: wv2-hold-complete 400ms ease forwards; }

    /* ── Response row: missed active beat ── */
    .wv2-cell--miss {
      background: rgba(249, 115, 22, 0.18);
      border-color: #f97316;
    }

    /* ── Response row: tapped on a rest (STRIPPED) ── */
    .wv2-cell--stripped {
      background: rgba(239, 68, 68, 0.22);
      border-color: #ef4444;
    }

    /* ── Response row: rest correctly ignored ── */
    .wv2-cell--ok {
      background: transparent;
      border-color: var(--border, #333);
    }

    /* ── Hold early / late release ── */
    .wv2-cell--hold-early {
      background: rgba(239, 68, 68, 0.18);
      border-color: #ef4444aa;
    }
    .wv2-cell--hold-late {
      background: rgba(239, 68, 68, 0.22);
      border-color: #ef4444;
    }

    /* ── Timing feedback label (floats on a cell, fades out) ── */
    .wv2-timing-label {
      position: absolute;
      bottom: 2px;
      left: 0; right: 0;
      text-align: center;
      font-family: var(--font-data, monospace);
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.06em;
      pointer-events: none;
      z-index: 10;
      opacity: 0;
    }
    .wv2-timing-label--show {
      animation: wv2-timing-fade 700ms ease forwards;
    }
    @keyframes wv2-timing-fade {
      0%   { opacity: 1;   transform: translateY(0); }
      60%  { opacity: 0.9; transform: translateY(-2px); }
      100% { opacity: 0;   transform: translateY(-5px); }
    }
    .wv2-timing-label--perfect { color: #22c55e; }
    .wv2-timing-label--early   { color: #f59e0b; }
    .wv2-timing-label--late    { color: #f97316; }

    /* ── Combo & bolt ── */
    .wv2-combo-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .wv2-combo-label {
      font-family: var(--font-data, monospace);
      font-size: 14px;
      font-weight: 700;
      color: var(--text-muted, #888);
      transition: color 200ms ease;
      min-width: 80px;
    }
    .wv2-bolt {
      width: 32px;
      height: 32px;
      position: relative;
      transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .wv2-bolt-inner {
      width: 32px;
      height: 32px;
      background: var(--border, #333);
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
      transition: background 200ms ease;
    }

    /* ── Progress bar ── */
    .wv2-progress-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .wv2-progress-labels {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-data, monospace);
      font-size: 11px;
      color: var(--text-secondary, #aaa);
    }
    .wv2-progress-track {
      height: 12px;
      border-radius: 6px;
      background: var(--bg-elevated, #1a1a1a);
      border: 1px solid var(--border, #333);
      overflow: hidden;
    }
    .wv2-progress-fill {
      height: 100%;
      border-radius: 6px;
      background: var(--condition-good, #22c55e);
      transition: width 120ms linear;
    }

    /* ── Status / flavor text ── */
    .wv2-status {
      font-family: var(--font-data, monospace);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-align: center;
      color: var(--text-secondary, #aaa);
      min-height: 18px;
      transition: color 200ms ease;
    }
    .wv2-flavor {
      font-style: italic;
      font-size: 12px;
      color: var(--text-muted, #777);
      text-align: center;
      min-height: 1.4em;
    }

    /* ── Play area (tap target) ── */
    .wv2-play-area {
      background: var(--bg-card, #141414);
      border: 1px solid var(--border, #333);
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: border-color 150ms ease;
    }
    .wv2-play-area:active { border-color: var(--accent, #60a5fa); }

    @keyframes wv2-complete-flash {
      from { background: rgba(34,197,94,0.15); }
      to   { background: transparent; }
    }
    .wv2-complete { animation: wv2-complete-flash 600ms ease forwards; }

    /* ── Stripped grid flash ── */
    @keyframes wv2-stripped-flash {
      0%   { border-color: #ef4444; }
      50%  { border-color: #ef4444aa; }
      100% { border-color: var(--border, #333); }
    }
    .wv2-play-area--stripped { animation: wv2-stripped-flash 400ms ease forwards; }

    /* ── "GET READY" / "YOUR TURN" transition label ── */
    .wv2-ready-label {
      font-family: var(--font-data, monospace);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #f59e0b;
    }

    /* ── Response-row "pre-light" (shows upcoming active beats) ── */
    .wv2-cell--resp-preview {
      background: rgba(34, 197, 94, 0.04);
      border-color: #22c55e22;
    }
    .wv2-cell--resp-preview-hold {
      background: rgba(245, 158, 11, 0.05);
      border-color: #f59e0b22;
    }

    /* ── Trap beats: call row (↺ signals back-off required in response) ── */
    .wv2-cell--trap-call {
      position: relative;
      border-color: #f59e0b66;
    }
    .wv2-cell--trap-call::after {
      content: '↺';
      position: absolute;
      top: 1px;
      right: 3px;
      font-size: 9px;
      line-height: 1;
      color: #f59e0baa;
      pointer-events: none;
    }

    /* ── Trap beats: response row (right-click / F to back the bolt off) ── */
    .wv2-cell--trap-resp {
      background: rgba(245, 158, 11, 0.07);
      border: 1.5px dashed #f59e0b66;
      position: relative;
    }
    .wv2-cell--trap-resp::after {
      content: '↺';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 15px;
      font-weight: 700;
      color: #f59e0b55;
      pointer-events: none;
    }
    /* Amber pulse when cursor arrives — signals action required */
    .wv2-cell--trap-resp.wv2-cell--cursor-active {
      animation: wv2-trap-cursor-pulse 250ms ease-in-out infinite alternate;
    }
    @keyframes wv2-trap-cursor-pulse {
      from { background: rgba(245, 158, 11, 0.08); border-color: #f59e0b66; }
      to   { background: rgba(245, 158, 11, 0.26); border-color: #f59e0b; }
    }

    /* ── Trap beat: correctly right-clicked (bolt backed off) ── */
    .wv2-cell--trap-hit {
      background: rgba(245, 158, 11, 0.30);
      border-color: #f59e0b;
      transform: scale(1.05);
    }
    @keyframes wv2-trap-hit-pop {
      0%   { transform: scale(1.05); }
      60%  { transform: scale(1.08); }
      100% { transform: scale(1.0);  background: rgba(245, 158, 11, 0.12); }
    }
    .wv2-cell--trap-hit-anim { animation: wv2-trap-hit-pop 300ms ease forwards; }
  `;
  document.head.appendChild(s);
}


// ── Flavor text pools ─────────────────────────────────────────
const GENERIC_FLAVOR = [
  'Three uggas in — it\'s moving.',
  'Keep the rhythm. Don\'t rush it.',
  'Steady hands.',
  'Good torque.',
  'Feel the tool. Don\'t fight it.',
  'That one was moving.',
  'Lock it in.',
  'Almost there. Stay with it.',
];

const STRIPPED_FLAVOR = [
  'Backed off the ratchet — don\'t rush.',
  'Easy. Let the pattern do the work.',
  'You broke the rhythm.',
  'Too eager. Settle back in.',
  'Wrong tool — right-click the marked beats to back them off.',
];

const TRAP_BACKED_FLAVOR = [
  'Nice. Backed that one off clean.',
  'Right call. Strip it and you lose ground.',
  'Good instincts — reverse before you seize it.',
  'Felt the resistance. Smart.',
];


// ════════════════════════════════════════════════════════════
//  WrenchMechanic
// ════════════════════════════════════════════════════════════

export class WrenchMechanic {
  /**
   * @param {object} opts
   * @param {object}   opts.part          – { id, name, difficulty, condition, flavorText }
   * @param {number}   opts.skillLevel    – 1–20
   * @param {object}   opts.tools         – { impact_wrench, penetrating_oil, ... }
   * @param {object}   opts.audioManager  – AudioManager instance
   * @param {object}   opts.rhythmEngine  – RhythmEngine instance
   * @param {Element}  opts.container     – DOM element to render into
   * @param {Function} opts.onComplete    – called with result when repair finishes
   * @param {Function} [opts.onBeat]      – optional: (step, time, isActive) => void
   */
  constructor(opts) {
    this.part        = opts.part        ?? {};
    this.skillLevel  = opts.skillLevel  ?? 1;
    this.tools       = opts.tools       ?? {};
    this.audio       = opts.audioManager;
    this.engine      = opts.rhythmEngine;
    this.container   = opts.container;
    this.onComplete  = opts.onComplete  ?? (() => {});
    this._extBeat    = opts.onBeat      ?? (() => {});

    // Derived constants (set in start())
    this._map            = null;
    this._timingWindow   = 0;   // seconds
    this._totalCycles    = 4;
    this._baseStepVal    = 0;
    this._stepDuration   = 0;   // ms per beat step
    this._stepDurSec     = 0;   // seconds per beat step
    this._partHash       = 0;   // deterministic seed for hold generation

    // Tool flags
    this._hasImpact  = !!(this.tools.impact_wrench);
    this._oilCharges = typeof this.tools.penetrating_oil === 'number'
      ? this.tools.penetrating_oil : (this.tools.penetrating_oil ? 10 : 0);

    // Runtime state
    this._phase          = 'idle';  // 'countin'|'call'|'ready'|'response'|'done'
    this._cycleIndex     = 0;
    this._progress       = 0;
    this._combo          = 0;
    this._bestCombo      = 0;
    this._totalPatterns  = 0;

    // Per-cycle pattern (typed: null | {t:'tap'} | {t:'hold',len,endStep} | {t:'held',start} | {t:'hold-end',start})
    this._typedPattern    = [];
    this._callPattern     = [];  // raw bools for backwards compat
    this._responsePattern = [];

    // Per-cycle response tracking
    this._responseTaps       = [];   // result per step: 'correct'|'stripped'|'miss'|'ok'|'hold-correct'|etc.
    this._responseStep       = -1;
    this._responseStepTime   = 0;    // audio clock time for current response step
    this._responseStepRealTime = 0;  // actual callback fire time (jitter-compensated)
    this._responseStepActive = false;
    this._responseStepEval   = false;

    // ── Hold-input state ──────────────────────────────────────
    this._isHolding       = false;   // player is currently pressing
    this._holdStartStep   = -1;      // response step where hold started
    this._holdEndStep     = -1;      // response step where hold should end
    this._holdEndTime     = 0;       // audio clock time when hold-end beat fires (0 = not yet)
    this._holdEndRealTime = 0;       // actual callback fire time (jitter-compensated)
    this._holdPressEval   = false;   // press timing was already evaluated
    this._holdResultSet   = false;   // final hold result was already written

    // Hazard system removed — replaced by trap beats embedded in
    // normal cycles (see rhythm-composer.js). Trap positions per cycle:
    this._trapPositions  = new Set();  // indices of trap beats this cycle
    this._oilBPMReduced  = false;

    // Count-in (driven by engine beats, not setTimeout)
    this._countInDone     = false;  // true after first full engine cycle

    // Intro double-call
    this._introCallsDone  = 0;

    // DOM refs
    this._callCells      = [];
    this._responseCells  = [];
    this._comboEl        = null;
    this._progressFill   = null;
    this._progressPctEl  = null;
    this._statusEl       = null;
    this._flavorEl       = null;
    this._boltEl         = null;
    this._phaseBanner    = null;
    this._phaseLabel     = null;
    this._phaseRight     = null;
    this._countdownPips  = [];
    this._countdownEl    = null;
    this._playArea       = null;

    this._destroyed      = false;

    this._holdSustainHandle = null;  // { stop() } handle for looping hold-tension hum

    // Input handlers (bound once)
    // Only pointer events — touch fires pointer+touch+click causing triple-fire.
    // isPrimary guard ensures only the first finger counts on multi-touch.
    this._handleKeyDown     = (e) => this._onKeyDown(e);
    this._handleKeyUp       = (e) => this._onKeyUp(e);
    this._handlePointerDown = (e) => {
      if (e.isPrimary === false) return;
      e.preventDefault();
      if (e.button === 2) {
        this._onPlayerRightPress();
      } else {
        this._onPlayerPress();
      }
    };
    this._handlePointerUp   = (e) => { if (e.isPrimary !== false) { e.preventDefault(); this._onPlayerRelease(); } };
    this._handleContextMenu = (e) => e.preventDefault();
  }

  // ── Public API ──────────────────────────────────────────────

  start() {
    _injectCSS();

    const difficulty = clamp(this.part.difficulty ?? 0.5, 0, 1);
    const condition  = clamp(this.part.condition  ?? 0.3, 0, 1);

    this._map = RhythmEngine.generateMap(
      this.part.id ?? 'unknown',
      difficulty,
      'wrench'
    );

    // Apply penetrating oil
    if (this._oilCharges > 0 && !this._oilBPMReduced) {
      this._map = { ...this._map, bpm: Math.max(60, this._map.bpm - 8) };
      this._oilBPMReduced = true;
    }

    // Cache derived values
    this._timingWindow  = RhythmEngine.getTimingWindow('wrench', this.skillLevel, this._map.bpm) * 1.4;
    this._totalCycles   = Math.max(4, Math.round((1 - condition) * 10));
    this._baseStepVal   = 1.0 / (this._totalCycles * 8);
    // One 16th-note step — matches the engine _advance() formula (60/bpm/4).
    this._stepDuration  = (60 / this._map.bpm / 4) * 1000;  // ms  per 16th-note
    this._stepDurSec    = 60 / this._map.bpm / 4;            // sec per 16th-note

    // ── Pre-compose entire session (motif-centric) ──────────────
    //
    // Generates all cycle patterns up front as a single composition[].
    // The audio scheduler looks up patterns by engine cycle index
    // directly via applyVariation (no mutable _currentPattern, no
    // setTimeout race condition). See rhythm-composer.js.

    this._composition = composeWrenchSession(
      this.part.id ?? 'unknown',
      difficulty,
      this._totalCycles
    );

    // Attach composition to the map — the scheduler reads it directly.
    // _countInCycles tells the scheduler that engine cycle 0 is the
    // count-in (returns silence), and cycle N (N≥1) = composition[N-1].
    this._map.composition        = this._composition.composition;
    this._map._countInCycles      = 1;    // audio silence during literal count-in
    // _compositionOffset controls the composition array index offset for the
    // audio scheduler AND trap detection.  Set here, before the engine starts,
    // so it is never mutated at runtime and never races with the scheduler.
    //   offset 1 = normal: cycle N maps to composition[N-1]
    //   offset 2 = intro double-call: cycles 1 AND 2 both map to composition[0]
    //              (clamped via Math.max(0,...) so negative indices hit [0] too)
    this._map._compositionOffset  = this.skillLevel <= 5 ? 2 : 1;

    this._introCallsDone = 0;
    this._countInDone    = false;
    this._phase          = 'countin';

    this._buildUI();
    this._attachInput();

    // Show count-in UI immediately so player sees it from the first beat
    this._setBannerState('countin', '1 — 2 — 3 — 4');
    this._countdownEl.style.display = 'flex';
    this._countdownPips.forEach(p => { p.className = 'wv2-countdown-pip'; });
    this._setFlavor('Count yourself in…');

    // Engine starts immediately — first cycle is the count-in (see _onBeat).
    // Audio is muted during count-in via _countInCycles on the map.
    this.engine.start(this._map, (step, time, isActive) => {
      if (!this._destroyed) this._onBeat(step, time, isActive);
      this._extBeat(step, time, isActive);
    });
  }

  destroy() {
    this._destroyed = true;
    this.engine.stop();
    this._detachInput();
    if (this._holdSustainHandle) {
      this._holdSustainHandle.stop?.();
      this._holdSustainHandle = null;
    }
  }

  // ── Pattern upgrade: booleans → typed tap/hold steps ────────
  //
  // Rules:
  //  • difficulty < 0.35 or first cycle → only taps
  //  • consecutive true values may become holds (probabilistic, seeded)
  //  • hold lengths capped at 3 steps
  //  • position 0 (downbeat) always stays a tap if it's isolated
  //
  _upgradePattern(boolArr, cycleIdx) {
    const diff  = clamp(this.part.difficulty ?? 0.5, 0, 1);
    const typed = boolArr.map(v => (v ? { t: 'tap' } : null));

    if (diff < 0.35 || cycleIdx === 0) return typed;

    // Seed against floor(cycleIdx/2) so the same hold layout repeats for
    // two cycles before varying — mirrors Rhythm Heaven's "learn then tweak" feel.
    const seedCycle = Math.floor(cycleIdx / 2);
    let seed = (Math.abs(this._partHash) + seedCycle * 37 + 0xdeadbeef) | 0;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      return (seed >>> 0) / 0xffffffff;
    };

    const holdChance = diff < 0.55 ? 0.22 : diff < 0.75 ? 0.38 : 0.52;
    const maxHoldLen = diff < 0.55 ? 2    : 3;

    let i = 0;
    while (i < typed.length) {
      if (typed[i]?.t !== 'tap') { i++; continue; }

      let runLen = 1;
      while (i + runLen < typed.length && typed[i + runLen]?.t === 'tap') runLen++;

      if (runLen >= 2 && rand() < holdChance) {
        const hLen   = Math.min(runLen, maxHoldLen, 2 + Math.floor(rand() * 2));
        const endIdx = i + hLen - 1;

        typed[i] = { t: 'hold', len: hLen, endStep: endIdx };
        for (let j = i + 1; j < endIdx; j++) typed[j] = { t: 'held', start: i };
        if (hLen > 1) typed[endIdx] = { t: 'hold-end', start: i };

        i += hLen;
        continue;
      }
      i++;
    }

    return typed;
  }

  // ── UI Build ────────────────────────────────────────────────

  _buildUI() {
    const c = this.container;
    c.innerHTML = '';
    c.className = 'wv2-container';

    // Header
    const hdr = _el('div', { className: 'wv2-header' });
    hdr.appendChild(_el('div', { className: 'wv2-title',
      textContent: `Removing: ${this.part.name ?? 'Component'}` }));
    hdr.appendChild(_el('div', { className: 'wv2-bpm',
      textContent: `BPM: ${this._map.bpm}` }));
    c.appendChild(hdr);

    // Phase banner
    this._phaseBanner = _el('div', { className: 'wv2-phase-banner' });
    this._phaseLabel  = _el('div', { className: 'wv2-phase-label', textContent: '—' });
    this._phaseRight  = _el('div', { style: 'display:flex;align-items:center;gap:6px;' });

    // 4 countdown pips (used for count-in and GET READY)
    const countdownEl = _el('div', { className: 'wv2-countdown' });
    this._countdownPips = [];
    for (let i = 0; i < 4; i++) {
      const pip = _el('div', { className: 'wv2-countdown-pip' });
      countdownEl.appendChild(pip);
      this._countdownPips.push(pip);
    }
    countdownEl.style.display = 'none';
    this._phaseRight.appendChild(countdownEl);
    this._countdownEl = countdownEl;

    this._phaseBanner.appendChild(this._phaseLabel);
    this._phaseBanner.appendChild(this._phaseRight);
    c.appendChild(this._phaseBanner);

    // Play area wrapper
    this._playArea = _el('div', { className: 'wv2-play-area' });
    c.appendChild(this._playArea);

    // Grid section
    const gridSection = _el('div', { className: 'wv2-grid-section' });

    // CALL row
    gridSection.appendChild(_el('div', { className: 'wv2-row-label', textContent: 'CALL  (listen)' }));
    const callRow = _el('div', { className: 'wv2-beat-row' });
    this._callCells = [];
    for (let i = 0; i < 8; i++) {
      const cell = _el('div', { className: 'wv2-cell' });
      callRow.appendChild(cell);
      this._callCells.push(cell);
    }
    gridSection.appendChild(callRow);

    // RESPONSE row
    gridSection.appendChild(_el('div', { className: 'wv2-row-label',
      textContent: 'RESPONSE  (match · right-click ↺ to back off)' }));
    const respRow = _el('div', { className: 'wv2-beat-row' });
    this._responseCells = [];
    for (let i = 0; i < 8; i++) {
      const cell = _el('div', { className: 'wv2-cell' });
      // Each cell gets a timing label div
      const timingLabel = _el('div', { className: 'wv2-timing-label' });
      cell.appendChild(timingLabel);
      respRow.appendChild(cell);
      this._responseCells.push(cell);
    }
    gridSection.appendChild(respRow);
    this._playArea.appendChild(gridSection);

    // Combo row
    const comboRow = _el('div', { className: 'wv2-combo-row' });
    this._comboEl  = _el('div', { className: 'wv2-combo-label', textContent: 'COMBO ×1.0' });
    this._boltEl   = _el('div', { className: 'wv2-bolt' });
    this._boltEl.appendChild(_el('div', { className: 'wv2-bolt-inner' }));
    comboRow.appendChild(this._comboEl);
    comboRow.appendChild(this._boltEl);
    c.appendChild(comboRow);

    // Progress bar
    const progWrap   = _el('div', { className: 'wv2-progress-wrap' });
    const progLabels = _el('div', { className: 'wv2-progress-labels' });
    progLabels.appendChild(_el('span', { textContent: 'Progress' }));
    this._progressPctEl = _el('span', { textContent: '0%' });
    progLabels.appendChild(this._progressPctEl);
    progWrap.appendChild(progLabels);
    const track = _el('div', { className: 'wv2-progress-track' });
    this._progressFill = _el('div', { className: 'wv2-progress-fill' });
    this._progressFill.style.width = '0%';
    track.appendChild(this._progressFill);
    progWrap.appendChild(track);
    c.appendChild(progWrap);

    // Status & flavor
    this._statusEl = _el('div', { className: 'wv2-status' });
    c.appendChild(this._statusEl);
    this._flavorEl = _el('div', { className: 'wv2-flavor' });
    this._setFlavor(pickRandom([...GENERIC_FLAVOR, ...(this.part.flavorText ?? [])]));
    c.appendChild(this._flavorEl);

    // Tool badges
    if (this._hasImpact || this._oilCharges > 0) {
      const badges = _el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;' });
      if (this._hasImpact) {
        badges.appendChild(_el('span', {
          style: 'font-family:var(--font-data);font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(245,158,11,0.12);color:#f59e0b;border:1px solid #f59e0b44;',
          textContent: '⚡ Impact Wrench',
        }));
      }
      if (this._oilCharges > 0) {
        badges.appendChild(_el('span', {
          style: 'font-family:var(--font-data);font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(163,230,53,0.1);color:#a3e635;border:1px solid #a3e63544;',
          textContent: `🫗 Penetrating Oil (BPM −8)`,
        }));
      }
      c.appendChild(badges);
    }
  }

  _attachInput() {
    document.addEventListener('keydown', this._handleKeyDown);
    document.addEventListener('keyup',   this._handleKeyUp);
    document.addEventListener('pointerdown',  this._handlePointerDown);
    document.addEventListener('pointerup',    this._handlePointerUp);
    document.addEventListener('pointercancel', this._handlePointerUp);
    document.addEventListener('contextmenu',  this._handleContextMenu);
  }

  _detachInput() {
    document.removeEventListener('keydown', this._handleKeyDown);
    document.removeEventListener('keyup',   this._handleKeyUp);
    document.removeEventListener('pointerdown',  this._handlePointerDown);
    document.removeEventListener('pointerup',    this._handlePointerUp);
    document.removeEventListener('pointercancel', this._handlePointerUp);
    document.removeEventListener('contextmenu',  this._handleContextMenu);
  }

  // ── Beat callback (from RhythmEngine) ───────────────────────

  _onBeat(step, time, isActive) {
    if (this._phase === 'done') return;

    // ── Count-in phase (first engine cycle, steps 0–15) ──────
    // Quarter-note beats fall at steps 0, 4, 8, 12 of the 16th-note grid.
    // This gives 4 perfectly audio-clock-synced ticks before the game starts.
    if (!this._countInDone) {
      if (step % 4 === 0) {
        const pipIdx   = step / 4;          // 0 1 2 3
        const isAccent = pipIdx === 3;       // accent on last beat ("1 is next")
        this.audio?.playMetronomeTick?.(isAccent);
        this._countdownPips.forEach((p, i) => {
          p.className = i < pipIdx   ? 'wv2-countdown-pip wv2-countdown-pip--done'
                      : i === pipIdx ? 'wv2-countdown-pip wv2-countdown-pip--active'
                      : 'wv2-countdown-pip';
        });
      }
      if (step === 15) {
        // Last count-in step — next beat (step 0) is the real "1"
        this._countInDone = true;
        this._countdownEl.style.display = 'none';
      }
      return;  // skip all call/response logic during count-in
    }

    // ── Cycle start (step 0) ──────────────────────────────
    if (step === 0) {
      if (this._phase === 'response') {
        this._evaluateMissedLastStep();
        if (this._isHolding && !this._holdResultSet) this._resolveHold('late');
        this._endResponsePhase();
      }

      this._startCallPhase();
    }

    // ── Call phase (steps 0–7) ───────────────────────────
    if (this._phase === 'call' && step < 8) {
      if (step > 0) this._callCells[step - 1]?.classList.remove('wv2-cell--call-active');

      if (isActive) {
        this._callCells[step]?.classList.add('wv2-cell--call-active');
        setTimeout(() => {
          const cell = this._callCells[step];
          if (cell && this._phase === 'call') {
            cell.classList.remove('wv2-cell--call-active');
            cell.classList.add('wv2-cell--call-played');
          }
        }, this._stepDuration * 0.55);
      }

      // Steps 4-7: BPM-locked GET READY — one pip per step, no setTimeout.
      if (step === 4) {
        this._setBannerState('ready', 'GET READY');
        this._countdownEl.style.display = 'flex';
        this._countdownPips.forEach(p => { p.className = 'wv2-countdown-pip'; });
      }
      if (step >= 4 && step <= 7) {
        const pipIdx = step - 4;  // 0 1 2 3
        this._countdownPips.forEach((p, i) => {
          p.className = i < pipIdx   ? 'wv2-countdown-pip wv2-countdown-pip--done'
                      : i === pipIdx ? 'wv2-countdown-pip wv2-countdown-pip--active'
                      :               'wv2-countdown-pip';
        });
      }
    }

    // ── Transition to response (step 8) ──────────────────
    if (step === 8) {
      this._callCells[7]?.classList.remove('wv2-cell--call-active');
      this._startResponsePhase(time);
    }

    // ── Response phase (steps 8–15) ──────────────────────
    if (this._phase === 'response' && step >= 8) {
      const rStep = step - 8;  // 0–7

      if (rStep > 0) {
        this._evaluatePreviousResponseStep(rStep - 1, time);
        if (this._isHolding && !this._holdResultSet && rStep === this._holdEndStep + 1) {
          this._resolveHold('late');
        }
      }

      this._responseStep        = rStep;
      this._responseStepTime    = time;
      // Traps require right-click — treat as active so cursor pulses amber
      this._responseStepActive  = !!this._typedPattern[rStep] || this._trapPositions.has(rStep);
      this._responseStepEval    = false;

      // ── JITTER COMPENSATION ─────────────────────────────────────
      // Record when this callback actually fires (setTimeout is imprecise).
      // During response phase, the player reacts to the VISUAL cursor
      // (the only cue — no audio plays during response). If setTimeout
      // fires 30ms late, the player sees the cursor 30ms late and taps
      // 30ms late, but without this correction their tap would be judged
      // against the originally scheduled `time` — penalising them for
      // unavoidable browser jitter.
      //
      // _responseStepRealTime is used by _onPlayerPress instead of
      // _responseStepTime when available.
      const ctx = this.audio?._ctx;
      this._responseStepRealTime = ctx ? ctx.currentTime : performance.now() / 1000;

      if (rStep === this._holdEndStep && this._isHolding && !this._holdEndTime) {
        this._holdEndTime = time;
        // Also store actual callback fire time for jitter-compensated hold release
        this._holdEndRealTime = ctx ? ctx.currentTime : performance.now() / 1000;
      }

      this._responseCells.forEach((cell, i) => {
        cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active');
        if (i === rStep && (!this._isHolding || this._holdStartStep === rStep)) {
          cell.classList.add(this._responseStepActive
            ? 'wv2-cell--cursor-active' : 'wv2-cell--cursor');
        }
      });
    }
  }

  // ── Phase management ─────────────────────────────────────────

  _startCallPhase() {
    this._phase = 'call';

    // Stop any hold sustain that leaked past a cycle boundary
    if (this._holdSustainHandle) {
      this._holdSustainHandle.stop?.();
      this._holdSustainHandle = null;
    }

    // Reset hold state for new cycle
    this._isHolding     = false;
    this._holdStartStep = -1;
    this._holdEndStep   = -1;
    this._holdEndTime   = 0;
    this._holdEndRealTime = 0;
    this._holdPressEval = false;
    this._holdResultSet = false;

    // ── Read composition entry ──────────────────────────────────
    // The audio scheduler reads the same composition via applyVariation
    // indexed by engine cycleCount. No _currentPattern needed — both
    // UI and audio derive from the same static data.

    const comp = this._map.composition;
    const ci   = comp ? (this._cycleIndex % comp.length) : 0;
    const entry = comp?.[ci];

    if (entry) {
      this._callPattern     = [...entry.call];
      this._responsePattern = [...entry.response];
      this._typedPattern    = entry.typed;   // pre-composed with holds + trap nulls
      this._trapPositions   = new Set(entry.traps ?? []);
    } else {
      // Fallback to legacy generation if composition is missing
      const variedCall = RhythmEngine.applyVariation(this._map, this._cycleIndex);
      this._callPattern     = variedCall.slice(0, 8);
      this._responsePattern = [...this._callPattern];
      this._typedPattern    = this._upgradePattern(this._callPattern, this._cycleIndex);
      this._trapPositions   = new Set();
    }

    // Clear all cells
    this._callCells.forEach(c => { c.className = 'wv2-cell'; });
    this._responseCells.forEach(c => {
      const label = c.querySelector('.wv2-timing-label');
      c.className = 'wv2-cell';
      if (label) { label.className = 'wv2-timing-label'; c.appendChild(label); }
    });

    // Render call row with trap indicators
    this._renderCallRow(false);

    // Pre-light response row — traps show as "don't tap" zones
    this._renderResponsePreview();

    const isIntroDouble = this.skillLevel <= 5 && this._cycleIndex === 0;
    const hasTrap = this._trapPositions.size > 0;
    this._setBannerState('call',
      isIntroDouble && this._introCallsDone < 1 ? 'LISTEN ×2'
      : hasTrap ? 'LISTEN — ↺ BACK OFF MARKED'
      : 'LISTEN'
    );
    this._setStatus('');
    this._countdownEl.style.display = 'none';

    // Phase-aware flavor cue
    if (entry) {
      if (hasTrap) {
        this._setFlavor('Cross-threaded bolt. Right-click (or F) the marked beats to back it off.');
      } else {
        const phaseLabels = {
          exposition:  'Learn the rhythm. Lock it in.',
          development: 'Pattern\'s shifting. Stay with it.',
          variation:   'Hold notes now. Feel the change.',
          climax:      'Full send. Everything\'s moving.',
        };
        if (this._cycleIndex === 0 || (ci > 0 && comp[ci - 1]?.phase !== entry.phase)) {
          this._setFlavor(phaseLabels[entry.phase] ?? '');
        }
      }
    }
  }

  // Render the call row with preview (dim) or played state.
  // Trap beats render the same as normal call beats (the player hears them)
  // but get a danger CSS class so the ⚠ is visible during call phase.
  _renderCallRow(showPlayed = false) {
    for (let i = 0; i < 8; i++) {
      const cell   = this._callCells[i];
      cell.className = 'wv2-cell';

      // Traps are active in the CALL (the player hears them) even though
      // _typedPattern has them as null (rest in response). Check the raw
      // call pattern for whether this step has audio.
      const isActive = this._callPattern[i];
      const isTrap   = this._trapPositions.has(i);
      const step     = this._typedPattern[i]; // null for traps

      if (!isActive) continue;

      if (isTrap) {
        // Trap beat: show as active call beat + danger marker
        cell.classList.add(showPlayed ? 'wv2-cell--call-played' : 'wv2-cell--call-preview');
        cell.classList.add('wv2-cell--trap-call');
      } else if (!step) {
        continue; // natural rest
      } else if (step.t === 'tap') {
        cell.classList.add(showPlayed ? 'wv2-cell--call-played' : 'wv2-cell--call-preview');
      } else if (step.t === 'hold') {
        cell.classList.add('wv2-cell--hold-start');
        cell.classList.add(showPlayed ? 'wv2-cell--call-played' : 'wv2-cell--call-preview');
      } else if (step.t === 'held') {
        cell.classList.add('wv2-cell--hold-body');
        cell.classList.add(showPlayed ? 'wv2-cell--call-played' : 'wv2-cell--call-preview');
      } else if (step.t === 'hold-end') {
        cell.classList.add('wv2-cell--hold-end');
        cell.classList.add(showPlayed ? 'wv2-cell--call-played' : 'wv2-cell--call-preview');
      }
    }
  }

  // Pre-light response row so player can read the pattern before it arrives.
  // Trap positions show as "don't tap" danger zones.
  _renderResponsePreview() {
    for (let i = 0; i < 8; i++) {
      const cell = this._responseCells[i];
      const step = this._typedPattern[i];

      // Preserve timing label
      const label = cell.querySelector('.wv2-timing-label');
      cell.className = 'wv2-cell';
      if (label) cell.appendChild(label);

      const isTrap = this._trapPositions.has(i);

      if (isTrap) {
        // Trap position: danger zone — player must NOT tap here
        cell.classList.add('wv2-cell--trap-resp');
        continue;
      }

      if (!step) continue;

      if (step.t === 'tap') {
        cell.classList.add('wv2-cell--resp-preview');
      } else if (step.t === 'hold') {
        cell.classList.add('wv2-cell--hold-cue');
        cell.classList.add('wv2-cell--resp-preview-hold');
      } else if (step.t === 'held') {
        cell.classList.add('wv2-cell--hold-cue-body');
        cell.classList.add('wv2-cell--resp-preview-hold');
      } else if (step.t === 'hold-end') {
        cell.classList.add('wv2-cell--hold-cue-end');
        cell.classList.add('wv2-cell--resp-preview-hold');
      }
    }
  }

  _startResponsePhase(stepTime) {
    // Only if we actually came through the call phase
    if (this._phase !== 'call' && this._phase !== 'ready') return;

    // Intro double-call: replay call instead of starting response (skill 1–5, first cycle).
    // _compositionOffset was already set to 2 in start() so the scheduler maps
    // both engine cycle 1 and 2 to composition[0] without any runtime mutation.
    if (this.skillLevel <= 5 && this._cycleIndex === 0 && this._introCallsDone < 1) {
      this._introCallsDone++;
      this._setBannerState('call', 'LISTEN AGAIN');
      this._setStatus('Listen again — then echo it back');
      this._renderCallRow(false);
      return;
    }

    this._phase              = 'response';
    this._responseStep       = 0;
    this._responseStepTime   = stepTime;
    this._responseStepActive = !!this._typedPattern[0] || this._trapPositions.has(0);
    this._responseStepEval   = false;
    this._responseTaps       = new Array(8).fill(null);

    // Reset hold state for response phase
    this._isHolding     = false;
    this._holdStartStep = -1;
    this._holdEndStep   = -1;
    this._holdEndTime   = 0;
    this._holdEndRealTime = 0;
    this._holdPressEval = false;
    this._holdResultSet = false;

    // Render response row: clear old preview, set cursor on step 0
    this._responseCells.forEach((cell, i) => {
      // Preserve timing label child
      const label = cell.querySelector('.wv2-timing-label');
      cell.className = 'wv2-cell';
      if (label) cell.appendChild(label);
    });
    const firstCell = this._responseCells[0];
    if (firstCell) {
      firstCell.classList.add(this._responseStepActive
        ? 'wv2-cell--cursor-active' : 'wv2-cell--cursor');
    }

    // Flash call row to show pattern one last time
    this._renderCallRow(true);

    this._countdownEl.style.display = 'none';
    this._setBannerState('response', 'YOUR TURN');
    this._setStatus('');
  }

  _endResponsePhase() {
    this._evaluateCycle();
    this._cycleIndex++;
    this._totalPatterns++;
  }

  // ── Response evaluation ───────────────────────────────────────

  _evaluatePreviousResponseStep(prevStep, currentTime) {
    if (this._responseStep !== prevStep) return;
    if (this._responseStepEval) return;

    const stepData = this._typedPattern[prevStep];

    if (stepData?.t === 'held' || stepData?.t === 'hold-end') {
      // This is part of a hold — the hold result was already set by the press/release handlers.
      // Just mark as evaluated to prevent double-counting.
      this._responseStepEval = true;
      return;
    }

    if (stepData) {
      // Active beat was not tapped in time
      this._responseTaps[prevStep] = 'miss';
      const cell = this._responseCells[prevStep];
      if (cell) {
        cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active');
        cell.classList.add('wv2-cell--miss');
        this._showTimingLabel(prevStep, 'MISS', 'late');
      }
    } else {
      const isTrap = this._trapPositions.has(prevStep);
      if (isTrap) {
        // Trap beat passed without a right-click — missed back-off
        this._responseTaps[prevStep] = 'trap-miss';
        const cell = this._responseCells[prevStep];
        if (cell) {
          cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active', 'wv2-cell--trap-resp');
          cell.classList.add('wv2-cell--miss');
          this._showTimingLabel(prevStep, 'MISS', 'late');
        }
      } else {
        // Rest — correctly ignored
        this._responseTaps[prevStep] = 'ok';
        const cell = this._responseCells[prevStep];
        if (cell) cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active');
      }
    }
    this._responseStepEval = true;
  }

  _evaluateMissedLastStep() {
    if (this._responseStep === 7 && !this._responseStepEval) {
      const stepData = this._typedPattern[7];
      if (stepData?.t === 'held' || stepData?.t === 'hold-end') {
        this._responseStepEval = true;
        return;
      }
      if (stepData) {
        this._responseTaps[7] = 'miss';
        const cell = this._responseCells[7];
        if (cell) {
          cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active');
          cell.classList.add('wv2-cell--miss');
        }
      } else if (this._trapPositions.has(7)) {
        // Trap on step 7 — passed without a right-click
        this._responseTaps[7] = 'trap-miss';
        const cell = this._responseCells[7];
        if (cell) {
          cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active', 'wv2-cell--trap-resp');
          cell.classList.add('wv2-cell--miss');
        }
      } else {
        this._responseTaps[7] = 'ok';
      }
      this._responseStepEval = true;
    }
  }

  _evaluateCycle() {
    const taps = this._responseTaps;

    let correct  = 0;
    let stripped = 0;
    let missed   = 0;

    for (let i = 0; i < 8; i++) {
      const t    = taps[i];
      const step = this._typedPattern[i];
      if (!step) continue;  // rest or trap position — handled separately below

      if (t === 'correct' || t === 'hold-correct') {
        correct++;
        if (t === 'hold-correct') correct++;
      } else if (t === 'stripped') {
        stripped++;
      } else if (t === 'miss' || t === 'hold-miss' || t === 'hold-early' || t === 'hold-late') {
        missed++;
      }
    }

    // Score trap positions (null in typedPattern, require right-click)
    for (const ti of this._trapPositions) {
      const t = taps[ti];
      if (t === 'trap-correct') {
        correct++;
      } else if (t === 'trap-stripped') {
        stripped++;
      } else {
        // trap-miss or untouched
        missed++;
      }
    }

    // Traps count as required inputs toward activeCount
    const activeCount = this._typedPattern.filter(s => s && s.t !== 'held' && s.t !== 'hold-end').length
                      + this._trapPositions.size;
    const isPerfect   = stripped === 0 && missed === 0 && correct > 0;

    if (isPerfect) {
      this._combo++;
      this._bestCombo = Math.max(this._bestCombo, this._combo);
      if (this._hasImpact && this._combo % 4 === 0) {
        correct = Math.min(activeCount * 2, correct + 1);
      }
    } else {
      this._combo = 0;
    }

    const mult         = _comboMultiplier(this._combo);
    const contribution = (correct / Math.max(activeCount * 2, 1)) * mult * (1.0 / this._totalCycles);
    this._progress     = Math.min(1.0, this._progress + contribution);

    this._updateComboDisplay();
    this._updateProgress();

    if (this._progress >= 1.0) {
      this._complete();
      return;
    }

    const trapsBacked = [...this._trapPositions].filter(ti => taps[ti] === 'trap-correct').length;

    if (isPerfect && this._combo >= 3) {
      this._setFlavor(`Locked in. ×${mult.toFixed(1)} momentum.`);
    } else if (stripped > 0) {
      this._setFlavor(pickRandom(STRIPPED_FLAVOR));
      if (this._playArea) {
        this._playArea.classList.add('wv2-play-area--stripped');
        setTimeout(() => this._playArea?.classList.remove('wv2-play-area--stripped'), 420);
      }
    } else if (isPerfect && trapsBacked > 0) {
      this._setFlavor(pickRandom(TRAP_BACKED_FLAVOR));
    } else if (missed > 0) {
      this._setFlavor('Missed one. Stay with the pattern.');
    } else if (correct > 0) {
      this._setFlavor(pickRandom([...GENERIC_FLAVOR, ...(this.part.flavorText ?? [])]));
    }
  }

  // ── Player input ─────────────────────────────────────────────

  _onKeyDown(e) {
    if (e.key === ' ') {
      e.preventDefault();
      this._onPlayerPress();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      this._onPlayerRightPress();
    }
  }

  _onKeyUp(e) {
    if (e.key !== ' ') return;
    e.preventDefault();
    this._onPlayerRelease();
  }

  _onPlayerPress() {
    if (this._destroyed) return;

    if (this._phase === 'countin' || this._phase === 'ready') return;
    if (this._phase !== 'response') return;
    if (this._responseStepEval) return;

    const ctx         = this.audio?._ctx;
    const tapTime     = ctx ? ctx.currentTime : performance.now() / 1000;

    // ── JITTER-COMPENSATED INPUT JUDGMENT ─────────────────────────
    //
    // During response phase the player's only cue is the visual cursor,
    // which appears when the _onBeat setTimeout fires (imprecise).
    // Use _responseStepRealTime (actual fire time) as the reference so
    // the judgment window is centred on when the player SAW the cue,
    // not when it was scheduled.
    //
    // Audio latency compensation is still applied because the call-phase
    // audio (sample-accurate after Bug A fix) trained the player's
    // internal tempo at scheduledTime + outputLatency. The real-time
    // reference captures setTimeout jitter; the latency offset captures
    // audio pipeline delay.
    const latency     = (ctx?.outputLatency ?? 0) + (ctx?.baseLatency ?? 0.01);
    const expected    = (this._responseStepRealTime || this._responseStepTime) + latency;
    const delta       = tapTime - expected;     // negative = early, positive = late
    const inTime      = Math.abs(delta) <= this._timingWindow;

    const rStep    = this._responseStep;
    const cell     = this._responseCells[rStep];
    const stepData = this._typedPattern[rStep];

    if (!stepData) {
      const isTrap = this._trapPositions.has(rStep);

      if (isTrap) {
        // ── TRAP BEAT: left-clicked instead of right-clicking ────────
        // Player used the wrong input. Penalty: progress loss + combo break.
        this._responseTaps[rStep] = 'trap-stripped';
        this._progress = Math.max(0, this._progress - 0.06);
        this._combo = 0;
        this._updateComboDisplay();
        this._updateProgress();
        if (cell) {
          cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active',
            'wv2-cell--trap-resp', 'wv2-cell--resp-preview');
          cell.classList.add('wv2-cell--stripped');
        }
        this.audio?.playWrenchSequenceBreak?.();
        this._setStatus('⚠ STRIPPED — right-click to back off');
        this._setFlavor(pickRandom(STRIPPED_FLAVOR));
        if (this._playArea) {
          this._playArea.classList.add('wv2-play-area--stripped');
          setTimeout(() => this._playArea?.classList.remove('wv2-play-area--stripped'), 420);
        }
      } else {
        // ── Normal rest: tapped where you shouldn't ──────────────
        this._responseTaps[rStep] = 'stripped';
        if (cell) {
          cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active', 'wv2-cell--resp-preview');
          cell.classList.add('wv2-cell--stripped');
        }
        this.audio?.playWrenchSequenceBreak?.();
        this._setStatus('STRIPPED');
      }
      this._responseStepEval = true;
      return;
    }

    if (stepData.t === 'tap') {
      if (inTime) {
        this._responseTaps[rStep] = 'correct';
        if (cell) {
          cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active', 'wv2-cell--resp-preview');
          cell.classList.add('wv2-cell--hit', 'wv2-cell--hit-anim');
          setTimeout(() => {
            cell?.classList.remove('wv2-cell--hit-anim');
            cell?.classList.add('wv2-cell--hit');
          }, 320);
        }
        this.audio?.playRatchet?.();
      } else {
        this._responseTaps[rStep] = 'miss';
        if (cell) {
          cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active', 'wv2-cell--resp-preview');
          cell.classList.add('wv2-cell--miss');
        }
      }
      this._responseStepEval = true;

    } else if (stepData.t === 'hold') {
      // Start of a hold
      this._holdStartStep   = rStep;
      this._holdEndStep     = stepData.endStep;
      this._holdEndTime     = 0;  // will be set when hold-end beat fires
      this._holdEndRealTime = 0;
      this._holdPressEval   = true;
      this._holdResultSet   = false;
      this._isHolding       = true;

      if (inTime) {
        // Good press — wait for release
        this._responseTaps[rStep] = 'hold-pressing';  // placeholder
        if (cell) {
          cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active',
            'wv2-cell--hold-cue', 'wv2-cell--resp-preview-hold');
          cell.classList.add('wv2-cell--holding', 'wv2-cell--hold-start');
        }
        // Pre-light held cells as "holding"
        for (let j = rStep + 1; j <= this._holdEndStep; j++) {
          const c = this._responseCells[j];
          if (c) {
            const isEnd = j === this._holdEndStep;
            c.classList.remove('wv2-cell--hold-cue-body', 'wv2-cell--hold-cue-end',
              'wv2-cell--resp-preview-hold');
            c.classList.add(isEnd ? 'wv2-cell--holding-end' : 'wv2-cell--holding-body');
          }
        }
        // Weighted press click + looping hum — distinct from a plain tap
        this.audio?.playWrenchHoldPress?.();
        this._holdSustainHandle = this.audio?.playWrenchHoldSustain?.() ?? null;
      } else {
        // Press was out of window — hold miss
        this._responseTaps[rStep] = 'hold-miss';
        this._isHolding   = false;
        this._holdResultSet = true;
        if (cell) {
          cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active',
            'wv2-cell--hold-cue', 'wv2-cell--resp-preview-hold');
          cell.classList.add('wv2-cell--miss');
        }
        // Mark all hold continuation cells as missed
        for (let j = rStep + 1; j <= this._holdEndStep; j++) {
          const c = this._responseCells[j];
          if (c) c.classList.add('wv2-cell--miss');
        }
        this._showTimingLabel(rStep, delta < 0 ? 'EARLY' : 'LATE', delta < 0 ? 'early' : 'late');
      }
      this._responseStepEval = true;

    } else if (stepData.t === 'held' || stepData.t === 'hold-end') {
      // Player pressed on a continuation/end step without having pressed the start
      // This is a mess — mark it as a miss for this step, don't disturb hold state
      this._responseStepEval = true;
    }
  }

  _onPlayerRelease() {
    if (this._destroyed) return;
    if (!this._isHolding) return;
    if (this._holdResultSet) { this._isHolding = false; return; }

    const ctx         = this.audio?._ctx;
    const releaseTime = ctx ? ctx.currentTime : performance.now() / 1000;
    const latency     = (ctx?.outputLatency ?? 0) + (ctx?.baseLatency ?? 0.01);

    this._resolveHold(null, releaseTime, latency);
  }

  // ── Right-click / F key: "back the bolt off" ─────────────────
  //
  // Trap beats require this input. Right-clicking on time = correct back-off.
  // Right-clicking a normal beat = miss. Right-clicking a rest = stripped.

  _onPlayerRightPress() {
    if (this._destroyed) return;
    if (this._phase === 'countin' || this._phase === 'ready') return;
    if (this._phase !== 'response') return;
    if (this._responseStepEval) return;

    const ctx      = this.audio?._ctx;
    const tapTime  = ctx ? ctx.currentTime : performance.now() / 1000;
    const latency  = (ctx?.outputLatency ?? 0) + (ctx?.baseLatency ?? 0.01);
    const expected = (this._responseStepRealTime || this._responseStepTime) + latency;
    const delta    = tapTime - expected;
    const inTime   = Math.abs(delta) <= this._timingWindow;

    const rStep  = this._responseStep;
    const cell   = this._responseCells[rStep];
    const isTrap = this._trapPositions.has(rStep);

    if (isTrap) {
      // ── TRAP BEAT: right-click = "back the bolt off" ──────────
      if (inTime) {
        this._responseTaps[rStep] = 'trap-correct';
        if (cell) {
          cell.classList.remove(
            'wv2-cell--cursor', 'wv2-cell--cursor-active', 'wv2-cell--trap-resp'
          );
          cell.classList.add('wv2-cell--trap-hit', 'wv2-cell--trap-hit-anim');
          setTimeout(() => {
            cell?.classList.remove('wv2-cell--trap-hit-anim');
            cell?.classList.add('wv2-cell--trap-hit');
          }, 320);
        }
        this.audio?.playWrenchTrapBeat?.();
        this._showTimingLabel(rStep, 'BACKED', 'perfect');
        this._setFlavor(pickRandom(TRAP_BACKED_FLAVOR));
      } else {
        this._responseTaps[rStep] = 'trap-miss';
        if (cell) {
          cell.classList.remove(
            'wv2-cell--cursor', 'wv2-cell--cursor-active', 'wv2-cell--trap-resp'
          );
          cell.classList.add('wv2-cell--miss');
          this._showTimingLabel(rStep, delta < 0 ? 'EARLY' : 'LATE',
            delta < 0 ? 'early' : 'late');
        }
      }
      this._responseStepEval = true;

    } else {
      // ── Non-trap beat: wrong input ────────────────────────────
      const stepData = this._typedPattern[rStep];
      if (stepData) {
        // Active normal beat — right-clicking it is just a miss
        this._responseTaps[rStep] = 'miss';
        if (cell) {
          cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active',
            'wv2-cell--resp-preview');
          cell.classList.add('wv2-cell--miss');
        }
      } else {
        // Rest — right-clicking a rest gets a small penalty
        this._responseTaps[rStep] = 'stripped';
        this._progress = Math.max(0, this._progress - 0.04);
        this._combo = 0;
        this._updateComboDisplay();
        this._updateProgress();
        if (cell) {
          cell.classList.remove('wv2-cell--cursor', 'wv2-cell--cursor-active');
          cell.classList.add('wv2-cell--stripped');
        }
        this.audio?.playWrenchSequenceBreak?.();
        this._setStatus('WRONG — don\'t reverse here');
      }
      this._responseStepEval = true;
    }
  }

  // Central hold resolution.
  // reason: null = player released, 'late' = overshot into next beat
  _resolveHold(reason, releaseTime, latency = 0) {
    if (this._holdResultSet) return;
    this._holdResultSet = true;
    this._isHolding     = false;

    const startStep = this._holdStartStep;
    const endStep   = this._holdEndStep;

    let result;
    if (reason === 'late') {
      result = 'hold-late';
    } else {
      if (this._holdEndTime === 0) {
        result = 'hold-early';
      } else {
        // Use jitter-compensated real time if available (same rationale
        // as _responseStepRealTime — player reacts to visual cursor,
        // not the scheduled audio timestamp)
        const expectedRelease = (this._holdEndRealTime || this._holdEndTime) + latency;
        const delta = releaseTime - expectedRelease;
        if (Math.abs(delta) <= this._timingWindow) {
          result = 'hold-correct';
        } else if (delta < 0) {
          result = 'hold-early';
        } else {
          result = 'hold-late';
        }
      }
    }

    this._responseTaps[startStep] = result;

    // Mark continuation cells' entries for scoring (just for completeness)
    for (let j = startStep + 1; j <= endStep; j++) {
      this._responseTaps[j] = result === 'hold-correct' ? 'held-ok' : 'held-broken';
    }

    // Visual feedback
    const isCorrect = result === 'hold-correct';

    for (let j = startStep; j <= endStep; j++) {
      const cell = this._responseCells[j];
      if (!cell) continue;

      cell.classList.remove(
        'wv2-cell--holding', 'wv2-cell--holding-body', 'wv2-cell--holding-end',
        'wv2-cell--hold-start', 'wv2-cell--hold-body', 'wv2-cell--hold-end',
        'wv2-cell--cursor', 'wv2-cell--cursor-active'
      );

      if (isCorrect) {
        cell.classList.add('wv2-cell--hold-correct', 'wv2-cell--hold-complete-anim');
        if (j === startStep)    cell.classList.add('wv2-cell--hold-correct-start');
        else if (j === endStep) cell.classList.add('wv2-cell--hold-correct-end');
        else                    cell.classList.add('wv2-cell--hold-correct-body');
        setTimeout(() => cell?.classList.remove('wv2-cell--hold-complete-anim'), 420);
      } else {
        cell.classList.add(result === 'hold-early' ? 'wv2-cell--hold-early' : 'wv2-cell--hold-late');
      }
    }

    const labelText = result === 'hold-correct' ? 'PERFECT' :
                      result === 'hold-early'   ? 'EARLY'   : 'LATE';
    const labelKind = result === 'hold-correct' ? 'perfect' :
                      result === 'hold-early'   ? 'early'   : 'late';
    // (timing label display removed — too much visual noise)

    // Stop the hold sustain hum regardless of result
    if (this._holdSustainHandle) {
      this._holdSustainHandle.stop?.();
      this._holdSustainHandle = null;
    }

    if (isCorrect) {
      this.audio?.playWrenchHoldRelease?.();
    } else {
      this.audio?.playWrenchSequenceBreak?.();
    }
  }

  // ── Timing label (per-cell EARLY / LATE / PERFECT) ─────────

  _showTimingLabel(rStep, text, kind) {
    const cell  = this._responseCells[rStep];
    if (!cell) return;
    const label = cell.querySelector('.wv2-timing-label');
    if (!label) return;

    label.textContent = text;
    label.className   = `wv2-timing-label wv2-timing-label--${kind}`;
    // Force reflow to restart the animation if triggered twice rapidly
    void label.offsetWidth;
    label.classList.add('wv2-timing-label--show');
  }

  // ── Completion ────────────────────────────────────────────────

  _complete() {
    this._phase    = 'done';
    this._progress = 1.0;
    this.engine.stop();
    this._detachInput();

    this._updateProgress();
    this._setBannerState('response', '✓ DONE');
    this._setStatus('✓ Done');
    this._setFlavor(`${this.part.name} is off.`);

    if (this.container) this.container.classList.add('wv2-complete');

    const avgComboContrib = this._bestCombo >= 3 ? 1.3 : this._bestCombo >= 2 ? 1.15 : 1.0;
    const qualityMult     = clamp(avgComboContrib, 0.5, 1.5);
    const condImprovement = clamp((1.0 - (this.part.condition ?? 0.3)) * 0.65, 0.05, 0.30);
    const xpBase          = 10 + (this.part.difficulty ?? 0.5) * 40;
    const xpEarned        = Math.round(xpBase * qualityMult);
    const completedPerfect = this._bestCombo >= 4;

    setTimeout(() => {
      this.onComplete({
        conditionImprovement: parseFloat(condImprovement.toFixed(2)),
        xpEarned,
        qualityMultiplier:    parseFloat(qualityMult.toFixed(2)),
        completedPerfect,
        rhythmStats: { bestCombo: this._bestCombo, totalPatterns: this._totalPatterns },
      });
    }, 800);
  }

  // ── UI helpers ────────────────────────────────────────────────

  _setBannerState(state, label) {
    if (!this._phaseBanner) return;
    this._phaseBanner.className = `wv2-phase-banner wv2-phase-banner--${state}`;
    if (this._phaseLabel) this._phaseLabel.textContent = label;
  }

  _clearCallCell(index) {
    if (index >= 0 && index < 8) {
      this._callCells[index]?.classList.remove('wv2-cell--call-active');
    }
  }

  _clearAllCells() {
    this._callCells.forEach(c => { c.className = 'wv2-cell'; });
    this._responseCells.forEach(c => {
      const label = c.querySelector('.wv2-timing-label');
      c.className = 'wv2-cell';
      if (label) c.appendChild(label);
    });
  }

  _updateComboDisplay() {
    if (!this._comboEl) return;
    const mult = _comboMultiplier(this._combo);
    this._comboEl.textContent = `COMBO ×${mult.toFixed(1)}`;
    const col = mult >= 2.5 ? '#f59e0b' : mult >= 2.0 ? '#22c55e' : mult >= 1.5 ? '#84cc16' : 'var(--text-muted,#888)';
    this._comboEl.style.color = col;

    if (this._boltEl) {
      const deg = this._combo * 45;
      this._boltEl.style.transform = `rotate(${deg}deg)`;
      const boltColor = mult >= 2.0 ? '#22c55e' : mult >= 1.5 ? '#84cc16' : 'var(--border,#333)';
      const inner = this._boltEl.querySelector('.wv2-bolt-inner');
      if (inner) inner.style.background = boltColor;
    }

    if (this._combo > 0) {
      const level = this._combo <= 1 ? 1 : this._combo <= 2 ? 2 : this._combo <= 3 ? 3 : 4;
      this.audio?.playWrenchComboBump?.(level);
    }
  }

  _updateProgress() {
    const pct = Math.min(100, Math.round(this._progress * 100));
    if (this._progressFill)  this._progressFill.style.width = `${pct}%`;
    if (this._progressPctEl) this._progressPctEl.textContent = `${pct}%`;
  }

  _setStatus(text) {
    if (this._statusEl) this._statusEl.textContent = text;
  }

  _setFlavor(text) {
    if (this._flavorEl) this._flavorEl.textContent = `"${text}"`;
  }
}


// ── Combo multiplier lookup ───────────────────────────────────

function _comboMultiplier(combo) {
  if (combo <= 1) return 1.0;
  if (combo === 2) return 1.5;
  if (combo === 3) return 2.0;
  if (combo === 4) return 2.5;
  return 3.0;
}


// ════════════════════════════════════════════════════════════
//  FUNCTION WRAPPER — called by workbench.js
// ════════════════════════════════════════════════════════════

/**
 * @param {object}   partDef       – Part definition from the part tree
 * @param {object}   partInstance  – Live instance state { condition, … }
 * @param {Element}  container     – DOM element to render into
 * @param {Function} onComplete    – Called with { newCondition, xpEarned, logEntries }
 * @param {object}   tools         – Player's tool map
 * @param {number}   skillLevel    – Wrench skill level (1–20)
 * @returns {WrenchMechanic}
 */
export function startWrenchWork(partDef, partInstance, container, onComplete, tools = {}, skillLevel = 1) {
  const audio  = window.audioManager;
  const engine = new RhythmEngine(audio);

  const m = new WrenchMechanic({
    part:         { ...partDef, condition: partInstance.condition ?? 0.3 },
    skillLevel,
    tools,
    audioManager: audio,
    rhythmEngine: engine,
    container,
    onComplete(result) {
      const base         = partInstance.condition ?? 0.3;
      const improvement  = result.conditionImprovement ?? 0;
      const newCondition = parseFloat(clamp(base + improvement, 0.01, 0.95).toFixed(2));
      const comboLabel   = result.qualityMultiplier >= 2.0 ? ` (×${result.qualityMultiplier?.toFixed(1)} combo)` : '';
      const logEntries   = [`Removed ${partDef.name}${comboLabel}`];
      onComplete({ newCondition, xpEarned: result.xpEarned, logEntries });
    },
  });

  container._bwCleanup = () => {
    m.destroy();
    container._bwCleanup = null;
  };

  m.start();
  return m;
}


// ── DOM helper ────────────────────────────────────────────────

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
