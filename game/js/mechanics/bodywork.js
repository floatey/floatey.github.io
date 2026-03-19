// ════════════════════════════════════════════════════════════
//  mechanics/bodywork.js — Bodywork (Hold & Ring Coverage)
//
//  GDD v2.0 §5 MECHANIC 2 — BODYWORK
//  Inspiration: Osu!
//  Feel: Flowing, trance-like, meditative
//
//  Usage:
//    const mechanic = new BodyworkMechanic({
//      part, skillLevel, tools, audioManager,
//      rhythmEngine, container, onComplete, onBeat
//    });
//    mechanic.start();
//    mechanic.destroy();
//
//  onComplete fires with:
//    { conditionImprovement, xpEarned, qualityMultiplier,
//      completedPerfect, rhythmStats: { perfectZones, bestFlow } }
// ════════════════════════════════════════════════════════════

import { RhythmEngine }        from '../audio.js';
import { pickRandom, clamp, randomInt } from '../utils.js';

// ── One-time CSS injection ─────────────────────────────────────
let _cssInjected = false;
function _injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;
  const s = document.createElement('style');
  s.id = 'bodywork-v2-styles';
  s.textContent = `
    .bv2-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 620px;
      margin: 0 auto;
      font-family: var(--font-ui, monospace);
      user-select: none;
      -webkit-user-select: none;
    }

    .bv2-header { font-size:13px; font-weight:700; color:var(--text-primary,#fff); }
    .bv2-step-indicator {
      font-family: var(--font-data, monospace);
      font-size: 12px;
      color: var(--accent, #60a5fa);
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .bv2-chain {
      font-family: var(--font-data, monospace);
      font-size: 11px;
      color: var(--text-muted, #888);
    }
    .bv2-chain .bv2-step-done   { color:#22c55e; text-decoration:line-through; }
    .bv2-chain .bv2-step-active { color:var(--accent,#60a5fa); font-weight:700; }

    /* ── Zone layout area ── */
    .bv2-zone-area {
      position: relative;
      width: 100%;
      height: 220px;
      background: var(--bg-elevated, #111);
      border: 1px solid var(--border, #333);
      border-radius: 10px;
      overflow: hidden;
    }

    /* SVG connector lines */
    .bv2-connectors {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    /* ── Zone circle ── */
    .bv2-zone {
      position: absolute;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 2px solid var(--border, #444);
      background: var(--bg-card, #1a1a1a);
      transform: translate(-50%, -50%);
      cursor: pointer;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-data, monospace);
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted, #888);
      transition: border-color 120ms ease, background 120ms ease;
      overflow: visible;
    }

    /* Ring element (child div, not ::before for JS control) */
    .bv2-ring {
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      border: 2px solid var(--accent, #60a5fa);
      transform: scale(1);
      opacity: 0;
      pointer-events: none;
    }

    .bv2-zone--current {
      border-color: var(--accent, #60a5fa);
      background: rgba(96,165,250,0.08);
      color: var(--accent, #60a5fa);
    }

    .bv2-zone--holding {
      border-color: var(--accent, #60a5fa);
    }
    .bv2-zone--holding .bv2-ring {
      opacity: 1;
      animation: bv2-ring-expand var(--ring-duration, 1400ms) linear forwards;
    }

    @keyframes bv2-ring-expand {
      from { transform: scale(1);   opacity: 1; }
      to   { transform: scale(2.8); opacity: 0; }
    }

    .bv2-zone--done {
      border-color: #22c55e;
      background: rgba(34,197,94,0.12);
      color: #22c55e;
    }

    .bv2-zone--rust {
      border-color: #7c3d0a;
      background: #2a1500;
      color: #c2672a;
    }
    .bv2-zone--rust.bv2-zone--current {
      border-color: #c2672a;
    }

    .bv2-zone--next { opacity: 0.55; }

    @keyframes bv2-zone-complete {
      0%   { box-shadow: 0 0 0   rgba(34,197,94,0); }
      30%  { box-shadow: 0 0 20px rgba(34,197,94,0.6); }
      100% { box-shadow: 0 0 0   rgba(34,197,94,0); }
    }
    .bv2-zone-complete-flash {
      animation: bv2-zone-complete 450ms ease !important;
    }

    @keyframes bv2-rust-flash {
      0%, 100% { box-shadow: 0 0 0 rgba(239,68,68,0); }
      40%       { box-shadow: 0 0 22px rgba(239,68,68,0.7); }
    }
    .bv2-rust-flash { animation: bv2-rust-flash 800ms ease !important; }

    /* ── Stats ── */
    .bv2-stats {
      display: flex;
      gap: 20px;
      font-family: var(--font-data, monospace);
      font-size: 11px;
    }
    .bv2-stat-label { color: var(--text-muted, #888); text-transform:uppercase; letter-spacing:0.06em; }
    .bv2-stat-value { font-size: 15px; font-weight: 700; color: var(--text-primary, #eee); }

    /* Flow grade colors */
    .bv2-flow-smooth { color: #22c55e; }
    .bv2-flow-ok     { color: #84cc16; }
    .bv2-flow-break  { color: #f97316; }

    /* ── Progress bar ── */
    .bv2-progress-track {
      height: 10px;
      border-radius: 5px;
      background: var(--bg-elevated, #1a1a1a);
      border: 1px solid var(--border, #333);
      overflow: hidden;
    }
    .bv2-progress-fill {
      height: 100%;
      border-radius: 5px;
      background: var(--condition-good, #22c55e);
      transition: width 120ms ease;
    }

    .bv2-hint {
      font-size: 12px;
      color: var(--text-muted, #888);
      font-style: italic;
    }
    .bv2-flavor {
      font-style: italic;
      font-size: 12px;
      color: var(--text-muted, #888);
      border-left: 2px solid var(--border, #333);
      padding-left: 10px;
    }
    .bv2-reveal-msg {
      font-family: var(--font-data, monospace);
      font-size: 12px;
      font-weight: 600;
      color: #ef4444;
      min-height: 16px;
    }

    @keyframes bv2-step-transition {
      0%   { opacity:1; transform:scale(1); }
      40%  { opacity:0; transform:scale(0.94); }
      60%  { opacity:0; transform:scale(0.94); }
      100% { opacity:1; transform:scale(1); }
    }
    .bv2-zone-area--transition {
      animation: bv2-step-transition 600ms ease forwards !important;
      pointer-events: none;
    }
  `;
  document.head.appendChild(s);
}


// ── Process chain definitions ─────────────────────────────────
const PROCESS_CHAINS = {
  sanding:       ['Sand', 'Prime', 'Paint'],
  polishing:     ['Clean', 'Polish', 'Seal'],
  degreasing:    ['Degrease', 'Clean'],
  rust_treatment:['Grind', 'Treat', 'Seal'],
  primer:        ['Sand', 'Prime'],
  paint:         ['Sand', 'Paint'],
  interior:      ['Clean', 'Repair', 'Condition'],
  simple:        ['Degrease', 'Clean'],
};

// ── Zone layout descriptors ───────────────────────────────────
const LAYOUTS = {
  sanding:        { count: 10, type: 'two-row',   holdBase: 1400 },
  polishing:      { count:  8, type: 'circle',     holdBase: 1600 },
  degreasing:     { count:  6, type: 'scatter',    holdBase: 1000 },
  rust_treatment: { count: 12, type: 'scatter',    holdBase: 2200 },
  primer:         { count:  8, type: 'vertical',   holdBase: 1200 },
  paint:          { count:  8, type: 'horizontal', holdBase: 1800 },
  interior:       { count:  8, type: 'scatter',    holdBase: 1400 },
  simple:         { count:  6, type: 'two-row',    holdBase: 1000 },
};

// ── Flavor text ───────────────────────────────────────────────
const FLAVOR_POOL = [
  'Slow and steady. Let the sandpaper do the work.',
  "Don't skip the prep. Paint is only as good as the surface.",
  'Even coverage. No drips, no runs.',
  'Work the whole panel.',
  'Patience. This is where the car remembers you.',
  "Factory finish? No. But it's honest work.",
  'Feel the resistance. Work with it.',
];
const RUST_FLAVOR = [
  "That's deeper than it looked.",
  'Rust never sleeps.',
  'Found a pocket underneath.',
  'Surface was hiding a nasty pocket.',
];


// ════════════════════════════════════════════════════════════
//  BodyworkMechanic
// ════════════════════════════════════════════════════════════

export class BodyworkMechanic {
  constructor(opts) {
    this.part       = opts.part        ?? {};
    this.skillLevel = opts.skillLevel  ?? 1;
    this.tools      = opts.tools       ?? {};
    this.audio      = opts.audioManager;
    this.engine     = opts.rhythmEngine;
    this.container  = opts.container;
    this.onComplete = opts.onComplete  ?? (() => {});
    this._extBeat   = opts.onBeat      ?? (() => {});

    // Tool flags
    this._hasPolisher  = !!(this.tools.da_polisher);
    this._hasBlaster   = !!(this.tools.media_blaster);

    // Derived
    this._processType   = null;
    this._chain         = [];
    this._layout        = null;
    this._zonePositions = [];  // [{x, y}] as percentages
    this._rustIndices   = new Set();
    this._holdDuration  = 1400;  // ms per zone (base)

    // Step state
    this._currentStep = 0;
    this._totalSteps  = 1;
    this._totalZones  = 0;

    // Zone state per zone: 'empty'|'current'|'next'|'holding'|'done'
    this._zoneStates  = [];
    // Grade per zone per step
    this._zoneGrades  = [];  // [step][zone] = 'perfect'|'good'|'rushed'|'miss'|null

    // Hold state
    this._activeZone     = -1;
    this._holdStart      = 0;
    this._holdRAF        = null;
    this._padHandle      = null;
    this._rustHandle     = null;

    // Flow tracking
    this._lastZoneRelease  = 0;
    this._flowScores       = [];   // per zone: 'smooth'|'ok'|'break'
    this._continuousCoverage = true;
    this._rustZonesCleared  = 0;
    this._rustPenalty       = 0;

    // Stats
    this._perfectZones   = 0;
    this._totalGoodZones = 0;

    // Timer
    this._timerStart  = 0;
    this._timerRAF    = null;

    // DOM refs
    this._zoneEls   = [];
    this._ringEls   = [];
    this._zoneArea  = null;
    this._svgEl     = null;
    this._stepEl    = null;
    this._chainEl   = null;
    this._coverageEl = null;
    this._qualityEl  = null;
    this._timeEl     = null;
    this._hintEl     = null;
    this._revealEl   = null;
    this._flavorEl   = null;
    this._progFill   = null;

    this._destroyed  = false;
    this._onGlobalRelease = this._handleGlobalRelease.bind(this);
  }

  // ── Public API ──────────────────────────────────────────────

  start() {
    _injectCSS();

    const difficulty = clamp(this.part.difficulty ?? 0.5, 0, 1);
    this._processType = _deriveProcessType(this.part);
    this._chain       = PROCESS_CHAINS[this._processType] ?? PROCESS_CHAINS.simple;
    this._layout      = LAYOUTS[this._processType] ?? LAYOUTS.simple;
    this._totalSteps  = this._chain.length;
    this._totalZones  = this._layout.count;

    // Hold duration: base × (1 + diff × 0.5), DA Polisher × 0.65
    const baseHold = this._layout.holdBase;
    this._holdDuration = baseHold * (1 + difficulty * 0.5) * (this._hasPolisher ? 0.65 : 1.0);
    // Skill: -3% per level above 1
    const skillReduction = clamp((this.skillLevel - 1) * 0.03, 0, 0.57);
    this._holdDuration *= (1 - skillReduction);

    // Rust zone indices: 20–35% of zones
    const rustCount = Math.round(this._totalZones * (0.20 + Math.random() * 0.15));
    const allIndices = Array.from({ length: this._totalZones }, (_, i) => i);
    _shuffle(allIndices);
    this._rustIndices = new Set(allIndices.slice(0, rustCount));

    // Zone positions
    this._zonePositions = _computeZonePositions(this._layout, this._totalZones, this.part.id ?? 'x');

    // Init grade tracking
    this._zoneGrades = Array.from({ length: this._totalSteps }, () =>
      new Array(this._totalZones).fill(null)
    );
    this._zoneStates = new Array(this._totalZones).fill('empty');
    this._zoneStates[0] = 'current';
    if (this._totalZones > 1) this._zoneStates[1] = 'next';

    this._buildUI();
    this._attachInput();
    this._updateStepIndicator();
    this._setFlavor(pickRandom(FLAVOR_POOL));

    this._timerStart = performance.now();
    this._timerRAF   = requestAnimationFrame(this._tickTimer.bind(this));
  }

  destroy() {
    this._destroyed = true;
    this._stopHold();
    cancelAnimationFrame(this._holdRAF);
    cancelAnimationFrame(this._timerRAF);
    document.removeEventListener('mouseup',      this._onGlobalRelease);
    document.removeEventListener('touchend',     this._onGlobalRelease);
    document.removeEventListener('touchcancel',  this._onGlobalRelease);
    if (this._container) {
      this._container._bwCleanup = null;
    }
  }

  // ── UI Build ────────────────────────────────────────────────

  _buildUI() {
    const c = this.container;
    c.innerHTML = '';
    c.className = 'bv2-container';

    // Header
    const hdr = _el('div', { className: 'bv2-header',
      textContent: `Bodywork: ${this.part.name ?? 'Panel'}` });
    c.appendChild(hdr);

    this._stepEl  = _el('div', { className: 'bv2-step-indicator' });
    this._chainEl = _el('div', { className: 'bv2-chain' });
    c.appendChild(this._stepEl);
    c.appendChild(this._chainEl);

    // Zone area
    this._zoneArea = _el('div', { className: 'bv2-zone-area' });

    // SVG connector lines
    this._svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this._svgEl.setAttribute('class', 'bv2-connectors');
    this._svgEl.setAttribute('width', '100%');
    this._svgEl.setAttribute('height', '100%');
    this._zoneArea.appendChild(this._svgEl);

    // Build zone elements
    this._zoneEls = [];
    this._ringEls = [];
    for (let i = 0; i < this._totalZones; i++) {
      const pos     = this._zonePositions[i];
      const isRust  = this._rustIndices.has(i);

      const zoneEl  = _el('div', { className: 'bv2-zone' + (isRust ? ' bv2-zone--rust' : '') });
      zoneEl.style.left = `${pos.x}%`;
      zoneEl.style.top  = `${pos.y}%`;
      zoneEl.textContent = isRust ? '🟫' : `${i + 1}`;

      const ringEl = _el('div', { className: 'bv2-ring' });
      zoneEl.appendChild(ringEl);

      zoneEl.addEventListener('pointerdown',  (e) => { e.preventDefault(); this._startHold(i); });
      zoneEl.addEventListener('pointerup',    (e) => { e.preventDefault(); this._endHold(i); });
      zoneEl.addEventListener('pointerleave', (e) => { if (this._activeZone === i) this._endHold(i); });

      this._zoneArea.appendChild(zoneEl);
      this._zoneEls.push(zoneEl);
      this._ringEls.push(ringEl);
    }

    c.appendChild(this._zoneArea);
    this._drawConnectors();

    // Stats row
    const statsRow = _el('div', { className: 'bv2-stats' });

    const covBlock = _el('div', { style: 'display:flex;flex-direction:column;gap:1px;' });
    covBlock.appendChild(_el('div', { className: 'bv2-stat-label', textContent: 'Coverage' }));
    this._coverageEl = _el('div', { className: 'bv2-stat-value', textContent: '0%' });
    covBlock.appendChild(this._coverageEl);
    statsRow.appendChild(covBlock);

    const qualBlock = _el('div', { style: 'display:flex;flex-direction:column;gap:1px;' });
    qualBlock.appendChild(_el('div', { className: 'bv2-stat-label', textContent: 'Quality' }));
    this._qualityEl = _el('div', { className: 'bv2-stat-value', textContent: 'POOR' });
    qualBlock.appendChild(this._qualityEl);
    statsRow.appendChild(qualBlock);

    const timeBlock = _el('div', { style: 'display:flex;flex-direction:column;gap:1px;' });
    timeBlock.appendChild(_el('div', { className: 'bv2-stat-label', textContent: 'Flow' }));
    this._timeEl = _el('div', { className: 'bv2-stat-value', textContent: '—' });
    timeBlock.appendChild(this._timeEl);
    statsRow.appendChild(timeBlock);

    c.appendChild(statsRow);

    // Progress bar
    const progTrack = _el('div', { className: 'bv2-progress-track' });
    this._progFill  = _el('div', { className: 'bv2-progress-fill' });
    this._progFill.style.width = '0%';
    progTrack.appendChild(this._progFill);
    c.appendChild(progTrack);

    // Hint
    this._hintEl = _el('div', { className: 'bv2-hint',
      textContent: 'Hold each zone until the ring completes. Rust zones take longer.' });
    c.appendChild(this._hintEl);

    // Reveal message
    this._revealEl = _el('div', { className: 'bv2-reveal-msg' });
    c.appendChild(this._revealEl);

    // Flavor
    this._flavorEl = _el('div', { className: 'bv2-flavor' });
    c.appendChild(this._flavorEl);

    // Apply initial zone states
    this._refreshAllZoneVisuals();
  }

  _attachInput() {
    document.addEventListener('mouseup',     this._onGlobalRelease);
    document.addEventListener('touchend',    this._onGlobalRelease);
    document.addEventListener('touchcancel', this._onGlobalRelease);

    // Space key = hold current zone
    this._handleKeyDown = (e) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      const cur = this._zoneStates.indexOf('current');
      if (cur >= 0 && this._activeZone === -1) this._startHold(cur);
    };
    this._handleKeyUp = (e) => {
      if (e.code !== 'Space') return;
      if (this._activeZone >= 0) this._endHold(this._activeZone);
    };
    document.addEventListener('keydown', this._handleKeyDown);
    document.addEventListener('keyup',   this._handleKeyUp);
  }

  // ── Hold mechanics ────────────────────────────────────────────

  _startHold(zoneIndex) {
    if (this._destroyed) return;
    if (this._zoneStates[zoneIndex] === 'done') return;
    if (this._activeZone !== -1 && this._activeZone !== zoneIndex) this._endHold(this._activeZone);

    const isRust   = this._rustIndices.has(zoneIndex);
    const duration = isRust ? this._holdDuration * 2.5 : this._holdDuration;

    // Media blaster: instant complete for rust zones (just one GOOD hold)
    if (isRust && this._hasBlaster) {
      this._completeZone(zoneIndex, 'good', true);
      return;
    }

    this._activeZone  = zoneIndex;
    this._holdStart   = performance.now();

    // CSS ring animation
    const zoneEl = this._zoneEls[zoneIndex];
    const ringEl = this._ringEls[zoneIndex];
    zoneEl.style.setProperty('--ring-duration', `${duration}ms`);
    // Re-trigger animation
    ringEl.style.animation = 'none';
    void ringEl.offsetWidth;
    ringEl.style.animation = '';

    zoneEl.classList.add('bv2-zone--holding');
    zoneEl.classList.add('bv2-zone--current');

    // Audio: pad tone
    const freq = _zoneFrequency(zoneIndex, isRust);
    if (isRust) {
      this._rustHandle = this.audio?.startBodyworkRust?.() ?? null;
    } else {
      this._padHandle = this.audio?.playBodyworkPad?.(freq, duration, 1.0) ?? null;
    }

    // Start fill tick
    const self = this;
    function tick() {
      if (self._activeZone !== zoneIndex || self._destroyed) return;
      const elapsed  = performance.now() - self._holdStart;
      const progress = elapsed / duration;
      const pct = Math.round(progress * 100);
      const zEl = self._zoneEls[zoneIndex];
      if (zEl) zEl.textContent = isRust ? `🟫 ${pct}%` : `${pct}%`;

      if (progress >= 1.0) {
        self._completeZone(zoneIndex, 'perfect');
        return;
      }
      self._holdRAF = requestAnimationFrame(tick);
    }
    this._holdRAF = requestAnimationFrame(tick);
  }

  _endHold(zoneIndex) {
    if (this._activeZone !== zoneIndex) return;

    const isRust   = this._rustIndices.has(zoneIndex);
    const duration = isRust ? this._holdDuration * 2.5 : this._holdDuration;
    const elapsed  = performance.now() - this._holdStart;
    const progress = elapsed / duration;

    cancelAnimationFrame(this._holdRAF);
    this._holdRAF   = null;
    this._activeZone = -1;

    this._stopHold();

    const zoneEl = this._zoneEls[zoneIndex];
    if (zoneEl) zoneEl.classList.remove('bv2-zone--holding');

    // Grade based on ring %
    const ringPct = progress * 100;
    let grade;
    if (ringPct >= 85 && ringPct <= 115) {
      grade = 'perfect';
    } else if ((ringPct >= 70 && ringPct < 85) || (ringPct > 115 && ringPct <= 130)) {
      grade = 'good';
    } else if (ringPct >= 50) {
      grade = 'rushed';
    } else {
      // Released too early — keep zone in current state
      this._continuousCoverage = false;
      this._setFlavor("Don't rush it.");
      return;
    }

    this._completeZone(zoneIndex, grade);
  }

  _completeZone(zoneIndex, grade, instant = false) {
    const isRust = this._rustIndices.has(zoneIndex);

    cancelAnimationFrame(this._holdRAF);
    this._holdRAF    = null;
    this._activeZone = -1;

    this._stopHold();

    // Record grade
    if (this._currentStep < this._totalSteps) {
      this._zoneGrades[this._currentStep][zoneIndex] = grade;
    }

    // Mark zone done
    this._zoneStates[zoneIndex] = 'done';
    const zoneEl = this._zoneEls[zoneIndex];
    if (zoneEl) {
      zoneEl.className = 'bv2-zone bv2-zone--done' + (isRust ? ' bv2-zone--rust' : '');
      zoneEl.textContent = '✓';
      _triggerAnim(zoneEl, 'bv2-zone-complete-flash');
    }

    // Audio
    if (grade === 'perfect') { this.audio?.playBodyworkZonePerfect?.(); this._perfectZones++; }
    else if (grade === 'rushed') { this.audio?.playBodyworkZoneRush?.(); }
    this._totalGoodZones++;

    // Rust reveal roll
    if (isRust) {
      this._rustZonesCleared++;
      if (Math.random() < 0.25) this._rustReveal(zoneIndex);
    }

    // Flow score
    if (this._lastZoneRelease > 0) {
      const gap = performance.now() - this._lastZoneRelease;
      const flowGrade = gap < 300 ? 'smooth' : gap < 700 ? 'ok' : 'break';
      this._flowScores.push(flowGrade);
      if (flowGrade === 'break') this._continuousCoverage = false;
    }
    this._lastZoneRelease = performance.now();

    // Advance to next zone
    this._advanceZoneCursor();
    this._updateStats();

    // Check if all zones done
    if (this._zoneStates.every(s => s === 'done')) {
      if (this._currentStep < this._totalSteps - 1) {
        this._advanceStep();
      } else {
        this._finish();
      }
    }
  }

  _stopHold() {
    if (this._padHandle)  { this.audio?.stop?.(this._padHandle);  this._padHandle = null; }
    if (this._rustHandle) {
      if (typeof this._rustHandle.stop === 'function') this._rustHandle.stop();
      this._rustHandle = null;
    }
  }

  _rustReveal(zoneIndex) {
    this._rustPenalty += 0.05;
    const zoneEl = this._zoneEls[zoneIndex];
    if (zoneEl) _triggerAnim(zoneEl, 'bv2-rust-flash');
    if (this._revealEl) {
      this._revealEl.textContent = pickRandom(RUST_FLAVOR);
      setTimeout(() => { if (this._revealEl) this._revealEl.textContent = ''; }, 3500);
    }
    this._setFlavor(pickRandom(["That's deeper than it looked.", 'Rust never sleeps.']));
  }

  _advanceZoneCursor() {
    const nextZone = this._zoneStates.findIndex(s => s !== 'done');
    if (nextZone >= 0) {
      this._zoneStates[nextZone] = 'current';
      const zoneEl = this._zoneEls[nextZone];
      if (zoneEl) {
        zoneEl.classList.remove('bv2-zone--next');
        zoneEl.classList.add('bv2-zone--current');
      }
      const nextNext = this._zoneStates.findIndex((s, i) => i > nextZone && s !== 'done');
      if (nextNext >= 0) {
        this._zoneStates[nextNext] = 'next';
        this._zoneEls[nextNext]?.classList.add('bv2-zone--next');
      }
    }
  }

  _advanceStep() {
    this._zoneArea.classList.add('bv2-zone-area--transition');

    setTimeout(() => {
      this._currentStep++;
      this._zoneStates = new Array(this._totalZones).fill('empty');
      this._zoneStates[0] = 'current';
      if (this._totalZones > 1) this._zoneStates[1] = 'next';

      this._zoneEls.forEach((el, i) => {
        const isRust = this._rustIndices.has(i);
        el.className = 'bv2-zone' + (isRust ? ' bv2-zone--rust' : '');
        el.textContent = isRust ? '🟫' : `${i + 1}`;
        // Re-init ring
        const ring = this._ringEls[i];
        if (ring) { ring.style.animation = 'none'; }
      });
      this._zoneEls[0]?.classList.add('bv2-zone--current');
      if (this._zoneEls[1]) this._zoneEls[1].classList.add('bv2-zone--next');

      this._updateStepIndicator();
      this._setFlavor(pickRandom(FLAVOR_POOL));
      this._zoneArea.classList.remove('bv2-zone-area--transition');
      this._updateStats();
    }, 300);
  }

  _finish() {
    if (this._destroyed) return;
    cancelAnimationFrame(this._timerRAF);

    const qualScore = this._calcQuality();
    const gap       = clamp((this.part.condition ?? 0.2), 0, 1);
    const newCond   = clamp((this.part.condition ?? 0.2) + qualScore * (0.85 - (this.part.condition ?? 0.2)), 0, 0.85);
    const condImprovement = clamp(newCond - (this.part.condition ?? 0.2), 0, 0.30);

    const continuousBonus  = this._continuousCoverage ? 1.10 : 1.0;
    const rustBonus        = 1 + this._rustZonesCleared * 0.05;
    const baseXP           = 12 + (this.part.difficulty ?? 0.5) * 35;
    const xpEarned         = Math.round(baseXP * qualScore * rustBonus * continuousBonus);

    const qualLabel = _qualityLabel(qualScore);
    const bestFlow  = this._flowScores.length
      ? this._flowScores.filter(f => f === 'smooth').length / this._flowScores.length
      : 0;

    this._setFlavor("Factory finish? No. But it's honest work.");
    if (this._hintEl) this._hintEl.textContent = 'All steps complete.';

    // Mark all zones done visually
    this._zoneEls.forEach(el => {
      el.className = 'bv2-zone bv2-zone--done';
      el.textContent = '✓';
    });

    setTimeout(() => {
      this.onComplete({
        conditionImprovement: parseFloat(condImprovement.toFixed(2)),
        xpEarned,
        qualityMultiplier:   parseFloat(Math.max(0.5, qualScore * 1.5).toFixed(2)),
        completedPerfect:    qualScore >= 0.9,
        rhythmStats: {
          perfectZones: this._perfectZones,
          bestFlow:     parseFloat(bestFlow.toFixed(2)),
        },
      });
    }, 800);
  }

  // ── Quality calculation ───────────────────────────────────────

  _calcQuality() {
    let total = 0;
    let count = 0;
    for (let step = 0; step < this._totalSteps; step++) {
      for (let z = 0; z < this._totalZones; z++) {
        const g = this._zoneGrades[step][z];
        if (g === 'perfect') { total += 1.0; count++; }
        else if (g === 'good') { total += 0.75; count++; }
        else if (g === 'rushed') { total += 0.40; count++; }
      }
    }
    const raw = count > 0 ? total / count : 0;
    return clamp(raw - this._rustPenalty, 0, 1.0);
  }

  // ── UI helpers ────────────────────────────────────────────────

  _refreshAllZoneVisuals() {
    for (let i = 0; i < this._totalZones; i++) {
      const el    = this._zoneEls[i];
      const state = this._zoneStates[i];
      const isRust = this._rustIndices.has(i);
      if (!el) continue;
      el.classList.toggle('bv2-zone--current', state === 'current');
      el.classList.toggle('bv2-zone--next', state === 'next');
      el.classList.toggle('bv2-zone--done', state === 'done');
    }
  }

  _drawConnectors() {
    if (!this._svgEl) return;
    while (this._svgEl.firstChild) this._svgEl.removeChild(this._svgEl.firstChild);

    for (let i = 0; i < this._totalZones - 1; i++) {
      const a = this._zonePositions[i];
      const b = this._zonePositions[i + 1];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', `${a.x}%`);
      line.setAttribute('y1', `${a.y}%`);
      line.setAttribute('x2', `${b.x}%`);
      line.setAttribute('y2', `${b.y}%`);
      line.setAttribute('stroke', 'var(--border, #333)');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '3,4');
      this._svgEl.appendChild(line);
    }
  }

  _updateStepIndicator() {
    const name = this._chain[this._currentStep] ?? '';
    if (this._stepEl) {
      this._stepEl.textContent = `Process: ${name} (Step ${this._currentStep + 1}/${this._totalSteps})`;
    }
    if (this._chainEl) {
      this._chainEl.innerHTML = this._chain.map((n, i) => {
        if (i < this._currentStep) return `<span class="bv2-step-done">${n}</span>`;
        if (i === this._currentStep) return `<span class="bv2-step-active">${n}</span>`;
        return `<span>${n}</span>`;
      }).join(' → ');
    }
  }

  _updateStats() {
    const done = this._zoneStates.filter(s => s === 'done').length;
    const pct  = Math.round((done / this._totalZones) * 100);
    if (this._coverageEl) this._coverageEl.textContent = `${pct}%`;
    if (this._progFill)   this._progFill.style.width   = `${pct}%`;

    const q = this._calcQuality();
    const { label, cls } = _qualLabel(q);
    if (this._qualityEl) {
      this._qualityEl.textContent = label;
      this._qualityEl.className = `bv2-stat-value ${cls}`;
    }

    // Flow
    const recent = this._flowScores.slice(-5);
    const smooth = recent.filter(f => f === 'smooth').length;
    const flowLabel = smooth >= 4 ? 'SMOOTH' : smooth >= 2 ? 'OK' : 'BREAK';
    const flowCls   = smooth >= 4 ? 'bv2-flow-smooth' : smooth >= 2 ? 'bv2-flow-ok' : 'bv2-flow-break';
    if (this._timeEl) {
      this._timeEl.textContent = flowLabel;
      this._timeEl.className = `bv2-stat-value ${flowCls}`;
    }
  }

  _setFlavor(text) {
    if (this._flavorEl) this._flavorEl.textContent = `"${text}"`;
  }

  _tickTimer() {
    if (this._destroyed) return;
    // (Timer display removed for simplicity — coverage/quality are the main stats)
    this._timerRAF = requestAnimationFrame(this._tickTimer.bind(this));
  }

  _handleGlobalRelease() {
    if (this._activeZone >= 0) this._endHold(this._activeZone);
  }
}


// ── Helpers ───────────────────────────────────────────────────

function _deriveProcessType(part) {
  const name = (part.name ?? '').toLowerCase();
  const id   = (part.id   ?? '').toLowerCase();
  if (/interior|seat|dash|carpet|console/i.test(name + id)) return 'interior';
  if (/rust|quarter|fender|door|hood|sill|rocker/i.test(name + id)) return 'rust_treatment';
  if (/panel|body|paint/i.test(name + id)) return 'sanding';
  if (/polish|buff/i.test(name + id)) return 'polishing';
  if (/primer|prime/i.test(name + id)) return 'primer';
  if (/degrease|clean/i.test(name + id)) return 'degreasing';
  const diff = clamp(part.difficulty ?? 0.5, 0, 1);
  return diff >= 0.5 ? 'sanding' : 'simple';
}

function _computeZonePositions(layout, count, seed) {
  const positions = [];
  const rng = _seededRand(seed);

  switch (layout.type) {
    case 'two-row': {
      const cols = Math.ceil(count / 2);
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        positions.push({
          x: 8 + col * (84 / Math.max(1, cols - 1)),
          y: 30 + row * 40,
        });
      }
      break;
    }
    case 'circle': {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        positions.push({
          x: 50 + 38 * Math.cos(angle),
          y: 50 + 40 * Math.sin(angle),
        });
      }
      break;
    }
    case 'vertical': {
      for (let i = 0; i < count; i++) {
        const col = Math.floor(i / 4);
        const row = i % 4;
        positions.push({ x: 20 + col * 60, y: 15 + row * 24 });
      }
      break;
    }
    case 'horizontal': {
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 4);
        const col = i % 4;
        positions.push({ x: 12 + col * 25, y: 25 + row * 50 });
      }
      break;
    }
    case 'scatter':
    default: {
      const placed = [];
      for (let i = 0; i < count; i++) {
        let x, y, attempts = 0;
        do {
          x = 10 + rng() * 80;
          y = 10 + rng() * 80;
          attempts++;
        } while (attempts < 50 && placed.some(p => Math.hypot(p.x - x, p.y - y) < 18));
        placed.push({ x, y });
        positions.push({ x, y });
      }
      break;
    }
  }
  return positions;
}

// D major pentatonic scale frequencies for zone pads
const BODYWORK_SCALE = [293.66, 329.63, 369.99, 440.00, 493.88, 587.33, 659.25, 739.99, 880.00];

function _zoneFrequency(zoneIndex, isRust) {
  if (isRust) return 261.63; // C4 — flat-seven tension note
  return BODYWORK_SCALE[zoneIndex % BODYWORK_SCALE.length];
}

function _qualLabel(q) {
  if (q < 0.30) return { label: 'POOR',    cls: '' };
  if (q < 0.60) return { label: 'FAIR',    cls: '' };
  if (q < 0.80) return { label: 'GOOD',    cls: 'bv2-flow-smooth' };
  if (q < 0.95) return { label: 'GREAT',   cls: 'bv2-flow-smooth' };
  return               { label: 'PERFECT', cls: 'bv2-flow-smooth' };
}

function _qualityLabel(q) { return _qualLabel(q).label; }

function _triggerAnim(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

function _shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function _seededRand(seed) {
  let h = 0;
  for (let i = 0; i < String(seed).length; i++) {
    h = (Math.imul(31, h) + String(seed).charCodeAt(i)) | 0;
  }
  h = h >>> 0;
  return function() {
    h += 0x6d2b79f5;
    let z = h;
    z  = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
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
//  Bridges the class-based API to workbench.js's function-call
//  convention. Maps the GDD onComplete shape to the workbench
//  { newCondition, xpEarned, logEntries } contract.
// ════════════════════════════════════════════════════════════

/**
 * @param {object}   partDef       – Part definition from the part tree
 * @param {object}   partInstance  – Live instance state { condition, … }
 * @param {Element}  container     – DOM element to render into
 * @param {Function} onComplete    – Called with { newCondition, xpEarned, logEntries }
 * @param {object}   tools         – Player's tool map
 * @param {number}   skillLevel    – Bodywork skill level (1–20)
 * @returns {BodyworkMechanic}
 */
export function startBodywork(partDef, partInstance, container, onComplete, tools = {}, skillLevel = 1) {
  const m = new BodyworkMechanic({
    part:         { ...partDef, condition: partInstance.condition ?? 0.3 },
    skillLevel,
    tools,
    audioManager: window.audioManager,
    rhythmEngine: null,
    container,
    onComplete(result) {
      const base         = partInstance.condition ?? 0.3;
      const improvement  = result.conditionImprovement ?? 0;
      const newCondition = parseFloat(clamp(base + improvement, 0.01, 0.95).toFixed(2));
      const qualLabel    = result.completedPerfect ? ' (perfect coverage)' : '';
      const logEntries   = [
        `Bodywork: ${partDef.name}${qualLabel}`,
        `Condition: ${Math.round(base * 100)}% → ${Math.round(newCondition * 100)}%`,
        `Bodywork XP: +${result.xpEarned}`,
      ];
      onComplete({ newCondition, xpEarned: result.xpEarned, logEntries });
    },
  });

  // Register cleanup hook so workbench.js _teardownMechanic() can
  // cancel rAF loops and detach event listeners on navigation.
  container._bwCleanup = () => {
    m.destroy();
    container._bwCleanup = null;
  };

  m.start();
  return m;
}
