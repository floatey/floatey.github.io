// ════════════════════════════════════════════════════════════
//  mechanics/wrench.js — Wrench Work (Call / Response Grid)
//
//  GDD v2.0 §5 MECHANIC 1 — WRENCH WORK
//  Inspiration: Rhythm Heaven
//  Feel: Rhythmic, pattern-seeking, surprises you
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
      font-size: 10px;
      color: transparent;
      position: relative;
    }

    /* Call row: active beat (engine plays) */
    .wv2-cell--call-active {
      background: rgba(78, 127, 255, 0.22);
      border-color: #4e7fff;
    }

    /* Response row: cursor (current step) */
    .wv2-cell--cursor {
      border-color: var(--text-muted, #555);
      border-top-width: 3px;
    }

    /* Response row: correct tap */
    .wv2-cell--hit {
      background: rgba(34, 197, 94, 0.30);
      border-color: #22c55e;
      transform: scale(1.04);
    }

    /* Response row: missed active beat */
    .wv2-cell--miss {
      background: rgba(249, 115, 22, 0.18);
      border-color: #f97316;
    }

    /* Response row: tapped on a rest (STRIPPED) */
    .wv2-cell--stripped {
      background: rgba(239, 68, 68, 0.22);
      border-color: #ef4444;
    }

    /* Hazard: whole grid flashes */
    @keyframes wv2-hazard-flash {
      0%, 100% { border-color: #ef4444; background: rgba(239,68,68,0.12); }
      50%       { border-color: #fca5a5; background: rgba(239,68,68,0.28); }
    }
    .wv2-cell--hazard {
      animation: wv2-hazard-flash 380ms ease infinite;
    }

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

    /* ── Hazard overlay text ── */
    .wv2-hazard-text {
      font-family: var(--font-data, monospace);
      font-size: 14px;
      font-weight: 700;
      color: #ef4444;
      text-align: center;
      letter-spacing: 0.1em;
      animation: wv2-hazard-pulse 600ms ease-in-out infinite;
    }
    @keyframes wv2-hazard-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.5; }
    }

    @keyframes wv2-complete-flash {
      from { background: rgba(34,197,94,0.15); }
      to   { background: transparent; }
    }
    .wv2-complete { animation: wv2-complete-flash 600ms ease forwards; }
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
];

const HAZARD_SUCCESS_FLAVOR = [
  'Broke it loose. Good patience.',
  'Waited it out. Smart.',
  'That\'s how you handle a seized bolt.',
];

const HAZARD_FAIL_FLAVOR = [
  'You tapped through it. Start again.',
  'Too eager on the seized bolt.',
  'Can\'t force a seized bolt. Back off.',
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
    this._map           = null;
    this._timingWindow  = 0;  // seconds
    this._totalCycles   = 4;
    this._baseStepVal   = 0;

    // Tool flags
    this._hasImpact     = !!(this.tools.impact_wrench);
    this._oilCharges    = typeof this.tools.penetrating_oil === 'number'
      ? this.tools.penetrating_oil : (this.tools.penetrating_oil ? 10 : 0);

    // Runtime state
    this._phase         = 'idle';  // 'call'|'response'|'hazard'|'done'
    this._cycleIndex    = 0;
    this._progress      = 0;
    this._combo         = 0;
    this._bestCombo     = 0;
    this._totalPatterns = 0;

    // Per-cycle response tracking
    this._callPattern   = [];  // 8 bools
    this._responsePattern = [];
    this._responseTaps  = [];  // 'correct'|'stripped'|'miss'|'ok' per step
    this._responseStep  = -1;
    this._responseStepTime = 0;
    this._responseStepActive = false;
    this._responseStepEval = false;

    // Hazard
    this._hazardInterval = 4;
    this._patternsSinceHazard = 0;
    this._hazardActive  = false;
    this._hazardFailed  = false;
    this._oilBPMReduced = false;

    // Intro double-call
    this._introCallsDone = 0;

    // DOM refs
    this._callCells      = [];
    this._responseCells  = [];
    this._comboEl        = null;
    this._progressFill   = null;
    this._progressPctEl  = null;
    this._statusEl       = null;
    this._flavorEl       = null;
    this._boltEl         = null;
    this._hazardEl       = null;

    this._destroyed      = false;

    this._handleKeyDown  = this._onPlayerInput.bind(this);
    this._handleTouch    = (e) => { e.preventDefault(); this._onPlayerInput(); };
    this._handleClick    = (e) => { e.preventDefault(); this._onPlayerInput(); };
  }

  // ── Public API ──────────────────────────────────────────────

  start() {
    _injectCSS();

    const difficulty = clamp(this.part.difficulty ?? 0.5, 0, 1);
    const condition  = clamp(this.part.condition  ?? 0.3, 0, 1);

    // Apply penetrating oil: reduce effective BPM (done via map BPM property)
    // We'll generate the map first, then optionally modify
    this._map = RhythmEngine.generateMap(
      this.part.id ?? 'unknown',
      difficulty,
      'wrench'
    );

    // Apply penetrating oil: reduce BPM by 8 for one job
    if (this._oilCharges > 0 && !this._oilBPMReduced) {
      this._map = { ...this._map, bpm: Math.max(60, this._map.bpm - 8) };
      this._oilBPMReduced = true;
      // Caller responsible for decrementing charges via state
    }

    // Cache derived values
    this._timingWindow = RhythmEngine.getTimingWindow('wrench', this.skillLevel, this._map.bpm);
    this._totalCycles  = Math.max(4, Math.round((1 - condition) * 10));
    this._baseStepVal  = 1.0 / (this._totalCycles * 8);
    this._hazardInterval = this._map.hazardInterval ?? 4;

    // Intro: low skill or first cycle = double call
    this._introCallsDone = 0;

    this._buildUI();
    this._attachInput();

    // Start engine — it handles call-phase audio and fires beat callbacks
    this.engine.start(this._map, (step, time, isActive) => {
      if (!this._destroyed) this._onBeat(step, time, isActive);
      this._extBeat(step, time, isActive);
    });
  }

  destroy() {
    this._destroyed = true;
    this.engine.stop();
    document.removeEventListener('keydown', this._handleKeyDown);
    if (this.container) {
      this.container.removeEventListener('touchstart', this._handleTouch);
      this.container.removeEventListener('click', this._handleClick);
    }
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

    // Play area wrapper (tap target)
    const playArea = _el('div', { className: 'wv2-play-area' });
    c.appendChild(playArea);

    // Hazard overlay text (hidden by default)
    this._hazardEl = _el('div', { className: 'wv2-hazard-text' });
    this._hazardEl.style.display = 'none';
    playArea.appendChild(this._hazardEl);

    // Grid section
    const gridSection = _el('div', { className: 'wv2-grid-section' });

    // CALL row
    const callLabel = _el('div', { className: 'wv2-row-label', textContent: 'CALL  (listen)' });
    gridSection.appendChild(callLabel);
    const callRow = _el('div', { className: 'wv2-beat-row' });
    this._callCells = [];
    for (let i = 0; i < 8; i++) {
      const cell = _el('div', { className: 'wv2-cell' });
      callRow.appendChild(cell);
      this._callCells.push(cell);
    }
    gridSection.appendChild(callRow);

    // RESPONSE row
    const respLabel = _el('div', { className: 'wv2-row-label',
      textContent: 'RESPONSE  (tap to match)' });
    gridSection.appendChild(respLabel);
    const respRow = _el('div', { className: 'wv2-beat-row' });
    this._responseCells = [];
    for (let i = 0; i < 8; i++) {
      const cell = _el('div', { className: 'wv2-cell' });
      respRow.appendChild(cell);
      this._responseCells.push(cell);
    }
    gridSection.appendChild(respRow);
    playArea.appendChild(gridSection);

    // Combo row
    const comboRow = _el('div', { className: 'wv2-combo-row' });
    this._comboEl  = _el('div', { className: 'wv2-combo-label', textContent: 'COMBO ×1.0' });
    this._boltEl   = _el('div', { className: 'wv2-bolt' });
    this._boltEl.appendChild(_el('div', { className: 'wv2-bolt-inner' }));
    comboRow.appendChild(this._comboEl);
    comboRow.appendChild(this._boltEl);
    c.appendChild(comboRow);

    // Progress bar
    const progWrap = _el('div', { className: 'wv2-progress-wrap' });
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
    if (this.container) {
      this.container.addEventListener('touchstart', this._handleTouch, { passive: false });
      this.container.addEventListener('click', this._handleClick);
    }
  }

  // ── Beat callback (from RhythmEngine) ───────────────────────

  _onBeat(step, time, isActive) {
    if (this._phase === 'done') return;

    // ── Cycle start (step 0) ──────────────────────────────
    if (step === 0) {
      // Evaluate previous response cycle (unless we're at the very start)
      if (this._phase === 'response') {
        this._evaluateMissedLastStep();
        this._endResponsePhase();
      } else if (this._phase === 'hazard') {
        this._endHazardPhase();
      }

      // Decide next phase
      if (this._shouldFireHazard()) {
        this._startHazardPhase();
      } else {
        this._startCallPhase();
      }
    }

    // ── Call phase (steps 0–7) ───────────────────────────
    if (this._phase === 'call' && step < 8) {
      // Highlight the call cell that is currently active
      this._clearCallCell(step > 0 ? step - 1 : -1);
      if (isActive) {
        this._callCells[step]?.classList.add('wv2-cell--call-active');
      }
      // Audio handled automatically by engine's _playBeatSound for wrench call phase
    }

    // ── Transition to response (step 8) ─────────────────
    if (step === 8) {
      this._clearCallCell(7);
      this._startResponsePhase(time);
    }

    // ── Response phase (steps 8–15) ──────────────────────
    if (this._phase === 'response' && step >= 8) {
      const rStep = step - 8;

      // Evaluate the previous response step if it hasn't been
      if (rStep > 0) {
        this._evaluatePreviousResponseStep(rStep - 1, time);
      }

      // Set up current response step
      this._responseStep        = rStep;
      this._responseStepTime    = time;
      this._responseStepActive  = this._responsePattern[rStep] ?? false;
      this._responseStepEval    = false;

      // Advance cursor
      this._responseCells.forEach((c, i) => {
        c.classList.remove('wv2-cell--cursor');
        if (i === rStep) c.classList.add('wv2-cell--cursor');
      });
    }

    // ── Hazard phase ──────────────────────────────────────
    if (this._phase === 'hazard') {
      // Engine keeps running; no cell updates
      return;
    }
  }

  // ── Phase management ─────────────────────────────────────────

  _startCallPhase() {
    this._phase = 'call';

    // Determine patterns for this cycle (with variation after first)
    const variedCall = RhythmEngine.applyVariation(this._map, this._cycleIndex);
    this._callPattern = variedCall.slice(0, 8);
    // Response may differ slightly (turnaround from map)
    this._responsePattern = (this._map.responsePattern ?? [...this._callPattern]).map((v, i) =>
      i < variedCall.length ? variedCall[i] : v
    );

    // Clear all cells
    this._callCells.forEach(c => {
      c.className = 'wv2-cell';
    });
    this._responseCells.forEach(c => {
      c.className = 'wv2-cell';
    });

    // Show the pattern in call row immediately if intro double-call
    if (this.skillLevel <= 5 && this._introCallsDone < 1 && this._cycleIndex === 0) {
      this._callPattern.forEach((active, i) => {
        if (active) this._callCells[i].classList.add('wv2-cell--call-active');
      });
    }

    this._setStatus('CALL — listen');
  }

  _startResponsePhase(stepTime) {
    // On first call of skill 1-5, play call again instead of going to response
    if (this.skillLevel <= 5 && this._cycleIndex === 0 && this._introCallsDone < 1) {
      this._introCallsDone++;
      this._phase = 'call';
      this._setStatus('CALL — listen again');
      return;
    }

    this._phase             = 'response';
    this._responseStep      = 0;
    this._responseStepTime  = stepTime;
    this._responseStepActive = this._responsePattern[0] ?? false;
    this._responseStepEval  = false;
    this._responseTaps      = new Array(8).fill(null);

    this._clearAllCells();
    this._setStatus('RESPONSE — echo the call');
  }

  _startHazardPhase() {
    this._phase       = 'hazard';
    this._hazardFailed = false;
    this._patternsSinceHazard = 0;

    this._callCells.forEach(c => {
      c.className = 'wv2-cell wv2-cell--hazard';
    });
    this._responseCells.forEach(c => {
      c.className = 'wv2-cell wv2-cell--hazard';
    });

    this._hazardEl.textContent = '⚠ SEIZED — HOLD';
    this._hazardEl.style.display = 'block';

    this.audio?.play('stuck');
    this._setStatus('');
    this._setFlavor('Seized. Don\'t tap — let it breathe.');
  }

  _endHazardPhase() {
    this._hazardEl.style.display = 'none';
    this._clearAllCells();

    if (!this._hazardFailed) {
      this._setFlavor(pickRandom(HAZARD_SUCCESS_FLAVOR));
      this._setStatus('Broke it loose ✓');
    } else {
      this._progress = Math.max(0, this._progress - 0.08);
      this._combo    = 0;
      this._updateComboDisplay();
      this._updateProgress();
      this._setFlavor(pickRandom(HAZARD_FAIL_FLAVOR));
      this._setStatus('STRIPPED — hazard failed');
    }

    // Reset hazard counter with new random interval
    this._hazardInterval = 3 + Math.floor(Math.random() * 3);
  }

  _endResponsePhase() {
    this._evaluateCycle();
    this._cycleIndex++;
    this._totalPatterns++;
    this._patternsSinceHazard++;
  }

  // ── Response evaluation ───────────────────────────────────────

  _evaluatePreviousResponseStep(prevStep, currentTime) {
    if (this._responseStep !== prevStep) return;
    if (this._responseStepEval) return;

    // No tap was received for this step — it's a miss if active, ok if rest
    if (this._responseStepActive) {
      this._responseTaps[prevStep] = 'miss';
      const cell = this._responseCells[prevStep];
      if (cell) {
        cell.classList.remove('wv2-cell--cursor');
        cell.classList.add('wv2-cell--miss');
      }
    } else {
      this._responseTaps[prevStep] = 'ok';
    }
    this._responseStepEval = true;
  }

  _evaluateMissedLastStep() {
    // Called at cycle end — evaluate step 7 if still open
    if (this._responseStep === 7 && !this._responseStepEval) {
      if (this._responseStepActive) {
        this._responseTaps[7] = 'miss';
        const cell = this._responseCells[7];
        if (cell) {
          cell.classList.remove('wv2-cell--cursor');
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
    const pattern = this._responsePattern;

    let correct = 0;
    let stripped = 0;
    let missed = 0;

    for (let i = 0; i < 8; i++) {
      const t = taps[i];
      const active = pattern[i];

      if (t === 'correct') correct++;
      else if (t === 'stripped') stripped++;
      else if (t === 'miss' && active) missed++;
    }

    const isPerfect = stripped === 0 && missed === 0 && correct > 0;

    if (isPerfect) {
      this._combo++;
      this._bestCombo = Math.max(this._bestCombo, this._combo);
      // Impact wrench: every 4th completed pattern = auto-hit one rest step
      // (handled implicitly — progress bonus)
      if (this._hasImpact && this._combo % 4 === 0) {
        correct = Math.min(8, correct + 1);
      }
    } else {
      this._combo = 0;
    }

    // Progress contribution
    const mult   = _comboMultiplier(this._combo);
    const contribution = (correct / 8) * mult * (1.0 / this._totalCycles);
    this._progress = Math.min(1.0, this._progress + contribution);

    this._updateComboDisplay();
    this._updateProgress();

    // Check completion
    if (this._progress >= 1.0) {
      this._complete();
      return;
    }

    // Flavor
    if (isPerfect && this._combo >= 3) {
      this._setFlavor(`Locked in. ×${mult.toFixed(1)} momentum.`);
    } else if (stripped > 0) {
      this._setFlavor(pickRandom(STRIPPED_FLAVOR));
    } else if (missed > 0) {
      this._setFlavor('Missed one. Stay with the pattern.');
    } else if (correct > 0) {
      this._setFlavor(pickRandom([...GENERIC_FLAVOR, ...(this.part.flavorText ?? [])]));
    }
  }

  // ── Player input handler ──────────────────────────────────────

  _onPlayerInput(e) {
    if (this._destroyed) return;
    if (e?.key && e.key !== ' ') return;  // keyboard: only space bar
    if (e?.type === 'keydown') e.preventDefault();

    // Hazard: any tap = failure
    if (this._phase === 'hazard') {
      this._hazardFailed = true;
      this._callCells.forEach(c => c.style.borderColor = '#ff0000');
      this.audio?.playWrenchSequenceBreak?.();
      return;
    }

    if (this._phase !== 'response') return;
    if (this._responseStepEval) return;  // step already evaluated this cycle

    const ctx = this.audio?._ctx;
    const tapTime = ctx ? ctx.currentTime : performance.now() / 1000;
    const delta   = Math.abs(tapTime - this._responseStepTime);
    const inTime  = delta <= this._timingWindow;
    const rStep   = this._responseStep;
    const isActive = this._responseStepActive;
    const cell     = this._responseCells[rStep];

    if (!isActive) {
      // Tap on a rest beat = STRIPPED
      this._responseTaps[rStep] = 'stripped';
      if (cell) {
        cell.classList.remove('wv2-cell--cursor');
        cell.classList.add('wv2-cell--stripped');
      }
      this.audio?.playWrenchSequenceBreak?.();
      this._setStatus('STRIPPED');
    } else if (inTime) {
      // Correct tap on active beat
      this._responseTaps[rStep] = 'correct';
      if (cell) {
        cell.classList.remove('wv2-cell--cursor');
        cell.classList.add('wv2-cell--hit');
      }
      this.audio?.playRatchet?.();
    } else {
      // Out-of-window tap on active beat = miss
      this._responseTaps[rStep] = 'miss';
      if (cell) {
        cell.classList.remove('wv2-cell--cursor');
        cell.classList.add('wv2-cell--miss');
      }
    }

    this._responseStepEval = true;
  }

  // ── Hazard scheduling ─────────────────────────────────────────

  _shouldFireHazard() {
    return this._patternsSinceHazard >= this._hazardInterval;
  }

  // ── Completion ────────────────────────────────────────────────

  _complete() {
    this._phase    = 'done';
    this._progress = 1.0;
    this.engine.stop();
    this._detachInput();

    this._updateProgress();
    this._setStatus('✓ Done');
    this._setFlavor(`${this.part.name} is off.`);

    // Container flash
    if (this.container) {
      this.container.classList.add('wv2-complete');
    }

    // Compute result
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
        rhythmStats: {
          bestCombo:     this._bestCombo,
          totalPatterns: this._totalPatterns,
        },
      });
    }, 800);
  }

  // ── UI helpers ────────────────────────────────────────────────

  _clearCallCell(index) {
    if (index >= 0 && index < 8) {
      this._callCells[index]?.classList.remove('wv2-cell--call-active');
    }
  }

  _clearAllCells() {
    this._callCells.forEach(c => { c.className = 'wv2-cell'; });
    this._responseCells.forEach(c => { c.className = 'wv2-cell'; });
  }

  _updateComboDisplay() {
    if (!this._comboEl) return;
    const mult = _comboMultiplier(this._combo);
    this._comboEl.textContent = `COMBO ×${mult.toFixed(1)}`;
    const col = mult >= 2.5 ? '#f59e0b' : mult >= 2.0 ? '#22c55e' : mult >= 1.5 ? '#84cc16' : 'var(--text-muted,#888)';
    this._comboEl.style.color = col;

    // Bolt rotation
    if (this._boltEl) {
      const deg = this._combo * 45;
      this._boltEl.style.transform = `rotate(${deg}deg)`;
      const boltColor = mult >= 2.0 ? '#22c55e' : mult >= 1.5 ? '#84cc16' : 'var(--border,#333)';
      const inner = this._boltEl.querySelector('.wv2-bolt-inner');
      if (inner) inner.style.background = boltColor;
    }

    // Combo milestone sounds
    if (this._combo > 0) {
      const level = this._combo <= 1 ? 1 : this._combo <= 2 ? 2 : this._combo <= 3 ? 3 : 4;
      this.audio?.playWrenchComboBump?.(level);
    }
  }

  _updateProgress() {
    const pct = Math.min(100, Math.round(this._progress * 100));
    if (this._progressFill) this._progressFill.style.width = `${pct}%`;
    if (this._progressPctEl) this._progressPctEl.textContent = `${pct}%`;
  }

  _setStatus(text) {
    if (this._statusEl) this._statusEl.textContent = text;
  }

  _setFlavor(text) {
    if (this._flavorEl) this._flavorEl.textContent = `"${text}"`;
  }

  _detachInput() {
    document.removeEventListener('keydown', this._handleKeyDown);
    if (this.container) {
      this.container.removeEventListener('touchstart', this._handleTouch);
      this.container.removeEventListener('click', this._handleClick);
    }
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
//  Bridges the class-based API to the function-call API that
//  workbench.js expects.  Adapts the GDD-shape onComplete result
//  { conditionImprovement, xpEarned, ... } into the workbench
//  shape { newCondition, xpEarned, logEntries }.
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
      const base          = partInstance.condition ?? 0.3;
      const improvement   = result.conditionImprovement ?? 0;
      const newCondition  = parseFloat(clamp(base + improvement, 0.01, 0.95).toFixed(2));
      const comboLabel    = result.qualityMultiplier >= 2.0 ? ` (×${result.qualityMultiplier?.toFixed(1)} combo)` : '';
      const logEntries    = [`Removed ${partDef.name}${comboLabel}`];
      onComplete({ newCondition, xpEarned: result.xpEarned, logEntries });
    },
  });

  // Register cleanup hook for workbench.js _teardownMechanic()
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