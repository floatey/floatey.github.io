// ════════════════════════════════════════════════════════════
//  mechanics/diagnostic.js — Diagnostic (Scrolling Signal Lane)
//
//  GDD v2.0 §5 MECHANIC 3 — DIAGNOSTIC
//  Inspiration: DDR
//  Feel: Focused, analytical, pattern-following
//
//  NOTE: This file replaces the old diagnosis.js (choose-answer puzzle).
//  Update workbench.js import: './mechanics/diagnostic.js'
//  and use DiagnosticMechanic class instead of startDiagnosis().
//
//  Usage:
//    const mechanic = new DiagnosticMechanic({
//      scenario, vehicleParts, skillLevel, tools,
//      audioManager, rhythmEngine, container, onComplete, onBeat
//    });
//    mechanic.start();
//    mechanic.destroy();
//
//  onComplete fires with:
//    { conditionImprovement, xpEarned, qualityMultiplier,
//      completedPerfect, rhythmStats: { correctFlags, falseFlags } }
// ════════════════════════════════════════════════════════════

import { RhythmEngine }           from '../audio.js';
import { pickRandom, clamp }      from '../utils.js';

// ── One-time CSS injection ─────────────────────────────────────
let _cssInjected = false;
function _injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.id = 'diagnostic-v2-styles';
  s.textContent = `
    .dv2-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 660px;
      margin: 0 auto;
      font-family: var(--font-ui, monospace);
    }

    .dv2-header { font-size:13px; font-weight:700; color:var(--text-primary,#fff); }
    .dv2-symptom {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary, #eee);
      line-height: 1.4;
    }
    .dv2-signal-label {
      font-family: var(--font-data, monospace);
      font-size: 11px;
      color: var(--text-muted, #888);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    /* ── Scan bar with progress ── */
    .dv2-scan-bar {
      height: 4px;
      border-radius: 2px;
      background: var(--bg-elevated, #1a1a1a);
      border: 1px solid var(--border, #333);
      overflow: hidden;
    }
    .dv2-scan-fill {
      height: 100%;
      background: var(--accent, #60a5fa);
      width: 0%;
      border-radius: 2px;
    }

    /* ── Signal lane ── */
    .dv2-lane-wrapper {
      position: relative;
      width: 100%;
      height: 80px;
      overflow: hidden;
      border: 1px solid var(--border, #333);
      border-radius: 8px;
      background: var(--bg-elevated, #0e1020);
    }

    .dv2-lane-inner {
      display: flex;
      flex-direction: row;
      align-items: center;
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      /* animation set by JS via --lane-duration */
      animation: dv2-lane-scroll var(--lane-duration, 30s) linear forwards;
    }

    @keyframes dv2-lane-scroll {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }

    /* ── Signal events ── */
    .dv2-event {
      flex-shrink: 0;
      height: 80%;
      border-radius: 3px;
      margin: 0 1px;
      transition: opacity 150ms ease;
    }
    .dv2-event--normal {
      background: rgba(34,197,94,0.40);
      width: var(--event-width, 8px);
      height: 50%;
      align-self: center;
    }
    .dv2-event--fault {
      background: #f59e0b;
      width: calc(var(--event-width, 8px) * 1.8);
      height: 80%;
      align-self: center;
      box-shadow: 0 0 6px rgba(245,158,11,0.5);
    }
    .dv2-event--decoy {
      background: #f97316;
      width: calc(var(--event-width, 8px) * 1.2);
      height: 60%;
      align-self: center;
      opacity: 0.75;
    }

    /* Grade overlays on events */
    .dv2-event--flagged-correct {
      background: #22c55e !important;
      box-shadow: 0 0 8px rgba(34,197,94,0.7);
    }
    .dv2-event--flagged-wrong {
      background: #ef4444 !important;
      opacity: 0.5;
    }
    .dv2-event--missed {
      background: #6b7280 !important;
      opacity: 0.4;
    }

    /* ── Read window ── */
    .dv2-read-window {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(96,165,250,0.07);
      border-left:  1px solid rgba(96,165,250,0.35);
      border-right: 1px solid rgba(96,165,250,0.35);
      pointer-events: none;
    }

    /* ── Symptom buttons ── */
    .dv2-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .dv2-btn {
      flex: 1;
      min-width: 80px;
      min-height: 44px;
      padding: 8px 12px;
      border: 1.5px solid var(--border, #444);
      border-radius: 6px;
      background: var(--bg-card, #141414);
      color: var(--text-primary, #eee);
      font-family: var(--font-ui, monospace);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color 120ms ease, background 120ms ease;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      text-align: center;
    }
    .dv2-btn:hover { border-color: var(--accent,#60a5fa); background: rgba(96,165,250,0.06); }
    .dv2-btn:active { transform: scale(0.97); }

    @keyframes dv2-btn-correct {
      0%   { border-color: #22c55e; background: rgba(34,197,94,0.22); transform: scale(1.04); }
      100% { border-color: #22c55e; background: rgba(34,197,94,0.08); transform: scale(1); }
    }
    .dv2-btn--correct { animation: dv2-btn-correct 350ms ease forwards; }

    @keyframes dv2-btn-wrong {
      0%, 100% { border-color: #ef4444; background: rgba(239,68,68,0.15); }
      50%       { transform: translateX(-5px); }
    }
    .dv2-btn--wrong { animation: dv2-btn-wrong 300ms ease; }

    /* ── Score row ── */
    .dv2-score-row {
      display: flex;
      gap: 16px;
      font-family: var(--font-data, monospace);
      font-size: 11px;
      color: var(--text-secondary, #aaa);
    }
    .dv2-score-hits   { color: #22c55e; }
    .dv2-score-misses { color: #f97316; }
    .dv2-score-false  { color: #ef4444; }

    /* ── Flavor ── */
    .dv2-flavor {
      font-style: italic;
      font-size: 12px;
      color: var(--text-muted, #777);
      min-height: 1.4em;
    }

    /* ── Intuition glow on a button ── */
    @keyframes dv2-intuition-pulse {
      0%, 100% { box-shadow: 0 0 0 1px rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.3); }
      50%       { box-shadow: 0 0 12px 2px rgba(251,191,36,0.4); border-color: rgba(251,191,36,0.7); }
    }
    .dv2-btn--intuition {
      animation: dv2-intuition-pulse 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(s);
}


// ── Flavor pools ──────────────────────────────────────────────
const FLAVOR_POOL = [
  "Something's not right. Think it through.",
  "Don't guess. Read the signal.",
  "The data tells a story.",
  "Process of elimination.",
  "Every clue matters. Use what you've got.",
  "Don't throw parts at it. Diagnose it.",
  "Watch for the pattern.",
];

// ── Scenario helpers ──────────────────────────────────────────
function _getPartName(partId, vehicleParts) {
  if (vehicleParts?.[partId]?.name) return vehicleParts[partId].name;
  return partId.split('_').slice(1).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function _getPartCost(partId, vehicleParts) {
  return vehicleParts?.[partId]?.replaceCost ?? 50;
}


// ════════════════════════════════════════════════════════════
//  DiagnosticMechanic
// ════════════════════════════════════════════════════════════

export class DiagnosticMechanic {
  /**
   * @param {object} opts
   * @param {object}   opts.scenario      – { id, symptom, correctDiagnosis, wrongOptions, multiLayer? }
   * @param {object}   opts.vehicleParts  – enriched part instances { partId: {name, replaceCost, ...} }
   * @param {number}   opts.skillLevel    – 1–20
   * @param {object}   opts.tools         – { multimeter, compression_tester, boost_leak_tester }
   * @param {object}   opts.audioManager
   * @param {object}   opts.rhythmEngine
   * @param {Element}  opts.container
   * @param {Function} opts.onComplete
   * @param {Function} [opts.onBeat]
   */
  constructor(opts) {
    this.scenario     = opts.scenario      ?? {};
    this.vehicleParts = opts.vehicleParts  ?? {};
    this.skillLevel   = opts.skillLevel    ?? 1;
    this.tools        = opts.tools         ?? {};
    this.audio        = opts.audioManager;
    this.engine       = opts.rhythmEngine;
    this.container    = opts.container;
    this.onComplete   = opts.onComplete    ?? (() => {});
    this._extBeat     = opts.onBeat        ?? (() => {});

    // Tool flags
    this._hasScanTool    = !!(this.tools.scan_tool    || this.tools.multimeter);
    this._hasMultimeter  = !!(this.tools.multimeter);
    this._hasCompTester  = !!(this.tools.compression_tester);
    this._hasBoostTester = !!(this.tools.boost_leak_tester);

    // Mechanic's Intuition at skill 11+
    this._useIntuition = this.skillLevel >= 11;

    // Map / lane
    this._map          = null;
    this._lane         = [];       // array of { type, signalType }
    this._laneLength   = 64;
    this._eventWidthMs = 0;
    this._totalDuration = 0;

    // Scan progress
    this._scanStartTime = 0;
    this._scanRAF       = null;
    this._scanDone      = false;

    // Fault tracking
    this._totalFaults    = 0;  // real faults in lane
    this._correctFlags   = 0;
    this._missedFaults   = 0;
    this._falseFlags     = 0;
    this._wrongDiagnosis = 0;
    this._yenPenalty     = 0;

    // In-window fault tracking
    this._faultEls       = [];  // { el, type, partId, evaluated }
    this._eventEls       = [];  // all event DOM elements

    // DOM refs
    this._laneInner      = null;
    this._readWindowEl   = null;
    this._scanFill       = null;
    this._hitsEl         = null;
    this._missesEl       = null;
    this._falseEl        = null;
    this._flavorEl       = null;
    this._btnEls         = {};   // partId → button el

    this._destroyed      = false;
    this._intuitionTimer = null;
  }

  // ── Public API ──────────────────────────────────────────────

  start() {
    _injectCSS();

    // Generate rhythm map to get BPM
    const difficulty = clamp(
      this.vehicleParts[this.scenario.correctDiagnosis]?.difficulty ?? 0.5,
      0, 1
    );
    this._map = RhythmEngine.generateMap(
      this.scenario.id ?? 'scenario',
      difficulty,
      'diagnostic'
    );

    // Lane event width: step duration in px (at 1px/ms scale, capped)
    const stepMs = (60 / this._map.bpm / 4) * 1000;
    this._eventWidthMs = stepMs;
    this._lane         = this._map.lane ?? [];
    this._laneLength   = this._map.laneLength ?? 64;
    this._totalDuration = stepMs * this._laneLength;

    // Count real faults
    this._totalFaults = this._lane.filter(e => e.type === 'fault').length;

    this._buildUI();
    this._startScan();
  }

  destroy() {
    this._destroyed = true;
    cancelAnimationFrame(this._scanRAF);
    clearTimeout(this._intuitionTimer);
    this._stopKeyListeners?.();
  }

  // ── UI Build ────────────────────────────────────────────────

  _buildUI() {
    const c = this.container;
    c.innerHTML = '';
    c.className = 'dv2-container';

    // Header / symptom
    c.appendChild(_el('div', { className: 'dv2-header',
      textContent: 'DIAGNOSTIC SCAN' }));
    c.appendChild(_el('div', { className: 'dv2-symptom',
      textContent: this.scenario.symptom ?? 'Investigating fault…' }));

    // Signal label + scan progress bar
    c.appendChild(_el('div', { className: 'dv2-signal-label',
      textContent: `Signal  ·  BPM: ${this._map.bpm}  ·  Events: ${this._laneLength}` }));
    const scanBarWrap = _el('div', { className: 'dv2-scan-bar' });
    this._scanFill = _el('div', { className: 'dv2-scan-fill' });
    scanBarWrap.appendChild(this._scanFill);
    c.appendChild(scanBarWrap);

    // ── Signal lane ──────────────────────────────────────────
    const laneWrap = _el('div', { className: 'dv2-lane-wrapper' });

    // Timing window width in px (read window element)
    const timingWindow = RhythmEngine.getTimingWindow('diagnostic', this.skillLevel, this._map.bpm);
    const winWidthMs   = timingWindow * 2 * 1000;
    const pxPerMs      = 1.0;  // 1px per ms
    const winWidthPx   = Math.max(20, winWidthMs * pxPerMs);
    const eventWidthPx = Math.max(8, this._eventWidthMs * pxPerMs);

    this._readWindowEl = _el('div', { className: 'dv2-read-window' });
    this._readWindowEl.style.width = `${winWidthPx}px`;
    laneWrap.appendChild(this._readWindowEl);

    // Build lane inner (scrolling)
    this._laneInner = _el('div', { className: 'dv2-lane-inner' });
    // Double the events for seamless visual (scroll to -50% = one full lane)
    const totalScrollWidth = eventWidthPx * this._laneLength * 2;
    this._laneInner.style.width = `${totalScrollWidth}px`;

    // Set animation duration on the element
    this._laneInner.style.setProperty('--lane-duration', `${this._totalDuration}ms`);
    this._laneInner.style.setProperty('--event-width', `${eventWidthPx}px`);

    this._faultEls  = [];
    this._eventEls  = [];

    // Render events ×2 for the scroll loop
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < this._lane.length; i++) {
        const ev = this._lane[i];
        let cls = 'dv2-event dv2-event--normal';
        if (ev.type === 'fault')  cls = 'dv2-event dv2-event--fault';
        if (ev.type === 'decoy')  cls = 'dv2-event dv2-event--decoy';

        const evEl = _el('div', { className: cls });
        evEl.style.width = `${eventWidthPx}px`;

        // Add text label if scan tool owned
        if (this._hasScanTool && (ev.type === 'fault' || ev.type === 'decoy')) {
          const partId = ev.type === 'fault'
            ? this.scenario.correctDiagnosis
            : this.scenario.wrongOptions[i % this.scenario.wrongOptions.length];
          const label = _el('span', {
            style: 'position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:9px;white-space:nowrap;font-family:var(--font-data);color:#f59e0b;',
            textContent: _getPartName(partId, this.vehicleParts).slice(0, 8).toUpperCase(),
          });
          evEl.style.position = 'relative';
          evEl.appendChild(label);
        }

        // Track fault elements for window detection
        if (pass === 0 && ev.type === 'fault') {
          const partId = this.scenario.correctDiagnosis;
          this._faultEls.push({ el: evEl, type: 'fault', partId, evaluated: false, index: i });
        }
        if (pass === 0 && ev.type === 'decoy') {
          const wrongOpts = this.scenario.wrongOptions ?? [];
          const partId = wrongOpts[i % Math.max(1, wrongOpts.length)];
          this._faultEls.push({ el: evEl, type: 'decoy', partId, evaluated: false, index: i });
        }

        this._laneInner.appendChild(evEl);
        if (pass === 0) this._eventEls.push(evEl);
      }
    }

    laneWrap.appendChild(this._laneInner);
    c.appendChild(laneWrap);

    // ── Symptom buttons ──────────────────────────────────────
    const allOptions = _shuffle([
      this.scenario.correctDiagnosis,
      ...(this.scenario.wrongOptions ?? []),
    ]);
    const btnRow = _el('div', { className: 'dv2-buttons' });
    this._btnEls = {};

    allOptions.forEach((partId, i) => {
      const name = _getPartName(partId, this.vehicleParts);
      const btn  = _el('button', { className: 'dv2-btn', textContent: name });
      btn.title  = partId;
      btn.addEventListener('click', () => this._onButtonPress(partId));
      // Keyboard: keys 1–5
      btn.dataset.keyIndex = String(i + 1);
      btnRow.appendChild(btn);
      this._btnEls[partId] = btn;
    });
    c.appendChild(btnRow);

    // Score row
    const scoreRow = _el('div', { className: 'dv2-score-row' });
    this._hitsEl   = _el('span', { className: 'dv2-score-hits',   textContent: 'Hits: 0' });
    this._missesEl = _el('span', { className: 'dv2-score-misses', textContent: 'Misses: 0' });
    this._falseEl  = _el('span', { className: 'dv2-score-false',  textContent: 'False flags: 0' });
    scoreRow.appendChild(this._hitsEl);
    scoreRow.appendChild(this._missesEl);
    scoreRow.appendChild(this._falseEl);
    c.appendChild(scoreRow);

    // Flavor
    this._flavorEl = _el('div', { className: 'dv2-flavor',
      textContent: `"${pickRandom(FLAVOR_POOL)}"` });
    c.appendChild(this._flavorEl);

    // Keyboard input (1–5 keys map to buttons)
    const keyHandler = (e) => {
      const i = parseInt(e.key);
      if (i >= 1 && i <= 5) {
        const btn = Array.from(btnRow.querySelectorAll('.dv2-btn'))[i - 1];
        if (btn) btn.click();
      }
    };
    document.addEventListener('keydown', keyHandler);
    this._stopKeyListeners = () => document.removeEventListener('keydown', keyHandler);
  }

  // ── Scan loop ─────────────────────────────────────────────────

  _startScan() {
    this._scanStartTime = performance.now();
    this._laneInner.style.animationPlayState = 'running';

    const tick = () => {
      if (this._destroyed || this._scanDone) return;

      const elapsed = performance.now() - this._scanStartTime;
      const progress = Math.min(1.0, elapsed / this._totalDuration);

      // Scan bar
      if (this._scanFill) {
        this._scanFill.style.width = `${Math.round(progress * 100)}%`;
      }

      // Check fault positions against read window
      this._checkFaultsInWindow();

      // Mechanic's Intuition: glow the correct button ~0.5s before fault arrives
      if (this._useIntuition) {
        this._applyIntuitionGlow(elapsed);
      }

      // Audio pulses (one per step)
      this._audioSchedule(elapsed);

      if (progress >= 1.0) {
        this._onScanComplete();
        return;
      }

      this._scanRAF = requestAnimationFrame(tick);
    };
    this._scanRAF = requestAnimationFrame(tick);
  }

  _lastAudioStep = -1;

  _audioSchedule(elapsed) {
    // Fire diag_scan_pulse audio at each step boundary
    const stepMs = this._eventWidthMs;
    const step   = Math.floor(elapsed / stepMs);
    if (step === this._lastAudioStep) return;
    if (step >= this._laneLength) return;
    this._lastAudioStep = step;

    const ev = this._lane[step];
    if (ev) {
      this.audio?.playDiagScanPulse?.(ev.signalType ?? 1);
    }
  }

  _checkFaultsInWindow() {
    if (!this._readWindowEl) return;
    const winRect = this._readWindowEl.getBoundingClientRect();
    const winCenter = winRect.left + winRect.width / 2;

    for (const faultData of this._faultEls) {
      if (faultData.evaluated) continue;
      const rect = faultData.el.getBoundingClientRect();
      const evCenter = rect.left + rect.width / 2;
      const dist = Math.abs(evCenter - winCenter);

      if (dist <= winRect.width / 2) {
        faultData.inWindow = true;
      } else if (faultData.inWindow && evCenter < winRect.left) {
        // Fault has passed through window without being flagged
        if (faultData.type === 'fault') {
          this._missedFaults++;
          faultData.el.classList.add('dv2-event--missed');
          this._updateScore();
        }
        faultData.evaluated = true;
        faultData.inWindow  = false;
      }
    }
  }

  _applyIntuitionGlow(elapsed) {
    // Find the next fault approaching the window
    const stepsFromNow = 0.5 * 1000 / this._eventWidthMs;  // steps in 500ms
    const currentStep  = elapsed / this._eventWidthMs;
    const lookaheadStep = currentStep + stepsFromNow;

    let nextFaultType = null;
    for (let i = Math.floor(currentStep); i < Math.min(Math.ceil(lookaheadStep), this._laneLength); i++) {
      if (this._lane[i]?.type === 'fault') {
        nextFaultType = this.scenario.correctDiagnosis;
        break;
      }
    }

    // Apply or remove glow
    for (const [partId, btn] of Object.entries(this._btnEls)) {
      const shouldGlow = nextFaultType && partId === nextFaultType;
      btn.classList.toggle('dv2-btn--intuition', shouldGlow);
    }
  }

  // ── Button press handler ──────────────────────────────────────

  _onButtonPress(pressedPartId) {
    if (this._destroyed || this._scanDone) return;

    // Find fault at read window
    const windowFault = this._faultEls.find(f => f.inWindow && !f.evaluated);

    if (!windowFault) {
      // False flag — no fault at window
      this._falseFlags++;
      this.audio?.playDiagFalseFlag?.();
      this._flashBtn(pressedPartId, 'wrong');
      this._setFlavor("There's nothing there. Don't jump.");
      this._updateScore();
      return;
    }

    windowFault.evaluated = true;
    windowFault.inWindow  = false;

    if (windowFault.type === 'fault' && pressedPartId === this.scenario.correctDiagnosis) {
      // CORRECT FLAG
      this._correctFlags++;
      windowFault.el.classList.add('dv2-event--flagged-correct');
      this.audio?.playDiagCorrectFlag?.();
      this._flashBtn(pressedPartId, 'correct');
      this._setFlavor('Flagged. That\'s the one.');
    } else if (windowFault.type === 'decoy') {
      // Wrong button on a decoy — pay part replacement cost
      const cost = _getPartCost(pressedPartId, this.vehicleParts);
      this._yenPenalty += cost;
      this._wrongDiagnosis++;
      windowFault.el.classList.add('dv2-event--flagged-wrong');
      this.audio?.playDiagWrongFlag?.();
      this._flashBtn(pressedPartId, 'wrong');
      this._setFlavor(`Nope. That cost ¥${cost}.`);
    } else {
      // Fault at window but wrong button pressed
      const cost = _getPartCost(pressedPartId, this.vehicleParts);
      this._yenPenalty += cost;
      this._wrongDiagnosis++;
      windowFault.el.classList.add('dv2-event--flagged-wrong');
      this.audio?.playDiagWrongFlag?.();
      this._flashBtn(pressedPartId, 'wrong');
      this._setFlavor(`Wrong part. Wasted ¥${cost}.`);
    }

    this._updateScore();
  }

  // ── Scan complete ──────────────────────────────────────────────

  _onScanComplete() {
    this._scanDone = true;
    if (this._scanFill) this._scanFill.style.width = '100%';

    // Any faults still in-window or not yet passed = final miss check
    for (const f of this._faultEls) {
      if (!f.evaluated && f.type === 'fault') {
        this._missedFaults++;
        f.el.classList.add('dv2-event--missed');
        f.evaluated = true;
      }
    }

    this._updateScore();
    this.audio?.play?.('aha');

    // Quality calculation
    const totalFaults = Math.max(1, this._totalFaults);
    const hitRate     = this._correctFlags / totalFaults;
    const falseFlagRate = this._falseFlags / Math.max(1, this._laneLength);
    const quality     = clamp(hitRate * (1 - falseFlagRate), 0, 1);

    const difficulty    = clamp(
      this.vehicleParts[this.scenario.correctDiagnosis]?.difficulty ?? 0.5, 0, 1
    );
    const condImprovement = clamp(quality * 0.25, 0.02, 0.25);
    const xpBase          = 20 + (this.scenario.wrongOptions?.length ?? 2) * 2;
    const xpEarned        = Math.round(xpBase * Math.max(0.5, quality));

    this._setFlavor(
      quality >= 0.9 ? 'Clean scan. You read that perfectly.' :
      quality >= 0.65 ? 'Got the main fault. Good enough.' :
      'Sloppy scan. Better than nothing.'
    );

    setTimeout(() => {
      this.onComplete({
        conditionImprovement: parseFloat(condImprovement.toFixed(2)),
        xpEarned,
        qualityMultiplier:   parseFloat(Math.max(0.5, quality * 1.5).toFixed(2)),
        completedPerfect:    quality >= 0.95,
        yenPenalty:          this._yenPenalty,
        rhythmStats: {
          correctFlags: this._correctFlags,
          falseFlags:   this._falseFlags,
        },
      });
    }, 1000);
  }

  // ── UI helpers ────────────────────────────────────────────────

  _flashBtn(partId, type) {
    const btn = this._btnEls[partId];
    if (!btn) return;
    const cls = type === 'correct' ? 'dv2-btn--correct' : 'dv2-btn--wrong';
    btn.classList.remove(cls);
    void btn.offsetWidth;
    btn.classList.add(cls);
    btn.addEventListener('animationend', () => btn.classList.remove(cls), { once: true });
  }

  _updateScore() {
    if (this._hitsEl)   this._hitsEl.textContent   = `Hits: ${this._correctFlags}/${this._totalFaults}`;
    if (this._missesEl) this._missesEl.textContent  = `Misses: ${this._missedFaults}`;
    if (this._falseEl)  this._falseEl.textContent   = `False flags: ${this._falseFlags}`;
  }

  _setFlavor(text) {
    if (this._flavorEl) this._flavorEl.textContent = `"${text}"`;
  }
}


// ── Helpers ───────────────────────────────────────────────────

function _shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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

// ════════════════════════════════════════════════════════════
//  FUNCTION WRAPPER — called by workbench.js
//  Diagnosis has a different onComplete shape from the other
//  three mechanics (wasCorrect, correctPartId, yenPenalty, …)
//  so this wrapper passes it through unchanged — workbench.js
//  routes it to handleDiagnosisComplete() which understands it.
// ════════════════════════════════════════════════════════════

/**
 * @param {object}   scenario      – Diagnostic scenario from the part tree
 * @param {object}   vehicleParts  – Enriched part instance map
 * @param {Element}  container     – DOM element to render into
 * @param {Function} onComplete    – Called with diagnosis-specific result shape
 * @param {object}   tools         – Player's tool map
 * @param {number}   skillLevel    – Diagnosis skill level (1–20)
 * @returns {DiagnosticMechanic}
 */
export function startDiagnosis(scenario, vehicleParts, container, onComplete, tools = {}, skillLevel = 1) {
  const m = new DiagnosticMechanic({
    scenario,
    vehicleParts,
    skillLevel,
    tools,
    audioManager: window.audioManager,
    rhythmEngine: null,
    container,
    onComplete,   // passed through directly — workbench.js handles the shape
  });

  // Register cleanup hook for workbench.js _teardownMechanic()
  container._bwCleanup = () => {
    m.destroy();
    container._bwCleanup = null;
  };

  m.start();
  return m;
}
