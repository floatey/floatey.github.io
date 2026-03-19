// ════════════════════════════════════════════════════════════
//  mechanics/precision.js — Precision Work (Timing Target)
//
//  Usage:
//    startPrecisionWork(partData, instanceState, container,
//                       onComplete, playerTools, skillLevel)
//
//  onComplete fires with: { newCondition, xpEarned, logEntries[] }
//
//  FILE LOCATION: game/js/mechanics/precision.js
// ════════════════════════════════════════════════════════════

import { randomInt, randomRange, pickRandom, clamp } from '../utils.js';

// ── One-time CSS injection ────────────────────────────────────
let _cssInjected = false;

function _injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;

  const style = document.createElement('style');
  style.id = 'precision-mechanic-styles';
  style.textContent = `

    /* ── Sweep indicator ── */
    @keyframes pw-sweep-ltr {
      0%   { left: 0%; }
      100% { left: calc(100% - 4px); }
    }
    @keyframes pw-sweep-rtl {
      0%   { left: calc(100% - 4px); }
      100% { left: 0%; }
    }
    .pw-indicator-ltr {
      animation: pw-sweep-ltr linear forwards;
    }
    .pw-indicator-rtl {
      animation: pw-sweep-rtl linear forwards;
    }

    /* ── Hit feedback ── */
    @keyframes pw-flash-green {
      0%   { box-shadow: 0 0 0   rgba(34,197,94,0); }
      25%  { box-shadow: 0 0 32px rgba(34,197,94,0.75); }
      100% { box-shadow: 0 0 0   rgba(34,197,94,0); }
    }
    @keyframes pw-flash-yellow {
      0%   { box-shadow: 0 0 0   rgba(234,179,8,0); }
      25%  { box-shadow: 0 0 24px rgba(234,179,8,0.60); }
      100% { box-shadow: 0 0 0   rgba(234,179,8,0); }
    }
    @keyframes pw-flash-red {
      0%   { background-color: inherit; }
      20%  { background-color: rgba(239,68,68,0.25); }
      100% { background-color: inherit; }
    }
    .pw-hit-green   { animation: pw-flash-green  420ms ease; }
    .pw-hit-yellow  { animation: pw-flash-yellow 380ms ease; }
    .pw-hit-red     { animation: pw-flash-red    500ms ease; }

    /* ── Perfect Torque gold flash ── */
    @keyframes pw-perfect-torque {
      0%   { box-shadow: 0 0 0   rgba(245,158,11,0); filter: brightness(1);   }
      15%  { box-shadow: 0 0 42px rgba(245,158,11,0.9); filter: brightness(1.6); }
      60%  { box-shadow: 0 0 24px rgba(245,158,11,0.50); filter: brightness(1.2); }
      100% { box-shadow: 0 0 0   rgba(245,158,11,0); filter: brightness(1);   }
    }
    .pw-perfect-torque-flash {
      animation: pw-perfect-torque 700ms ease !important;
    }

    /* ── Sequence break shake ── */
    @keyframes pw-seq-shake {
      0%          { transform: translateX(0); }
      15%, 45%, 75% { transform: translateX(-6px); }
      30%, 60%, 90% { transform: translateX(6px); }
      100%        { transform: translateX(0); }
    }
    .pw-seq-shake { animation: pw-seq-shake 320ms ease !important; }

    /* ── Result step icons pulse in ── */
    @keyframes pw-step-pop {
      0%   { transform: scale(0.5); opacity: 0; }
      60%  { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1);   opacity: 1; }
    }
    .pw-step-pop { animation: pw-step-pop 220ms ease !important; }

    /* ── Flavor text fade ── */
    @keyframes pw-flavor-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pw-flavor-in { animation: pw-flavor-in 200ms ease !important; }

    /* ── Completion sweep ── */
    @keyframes pw-complete-sweep {
      0%   { background: var(--condition-good); }
      40%  { background: #10b981; filter: brightness(1.6); }
      100% { background: var(--condition-excellent);
             box-shadow: 0 0 22px rgba(16,185,129,0.45); }
    }
    .pw-complete-bar {
      animation: pw-complete-sweep 700ms ease forwards !important;
    }

    /* ── Zone label badges ── */
    .pw-zone-label {
      font-family: var(--font-data, monospace);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-align: center;
      padding-top: 4px;
    }

    /* ── Sequence position marker ── */
    .pw-seq-marker {
      position: absolute;
      top: -18px;
      transform: translateX(-50%);
      font-family: var(--font-data, monospace);
      font-size: 11px;
      font-weight: 700;
      color: var(--text-primary, #fff);
      pointer-events: none;
      transition: opacity 150ms;
    }

    /* ── Tap anywhere overlay (mobile) ── */
    .pw-mobile-tap-area {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
    }

    /* ── Result dots wrap ── */
    .pw-results-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      align-items: center;
    }
    .pw-result-icon {
      display: inline-block;
      font-size: 15px;
      line-height: 1;
      transition: opacity 150ms;
    }

    /* ── Hit label pop ── */
    @keyframes pw-hit-label-pop {
      0%   { opacity: 1; transform: translateY(0) scale(1); }
      60%  { opacity: 1; transform: translateY(-20px) scale(1.15); }
      100% { opacity: 0; transform: translateY(-36px) scale(0.9); }
    }
    .pw-hit-label-anim {
      position: absolute;
      pointer-events: none;
      font-family: var(--font-data, monospace);
      font-size: 13px;
      font-weight: 700;
      animation: pw-hit-label-pop 600ms ease forwards;
      white-space: nowrap;
      z-index: 10;
    }
  `;
  document.head.appendChild(style);
}


// ════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ════════════════════════════════════════════════════════════

/**
 * Render the Precision Work mechanic into `container` and begin the interaction.
 *
 * @param {object}   partData       – Part definition (name, difficulty, flavorText, …)
 * @param {object}   instanceState  – Part instance state (condition, repairProgress, …)
 * @param {Element}  container      – DOM element to render into
 * @param {Function} onComplete     – Called with { newCondition, xpEarned, logEntries[] }
 * @param {object}   playerTools    – Map of owned tool IDs (check torque_wrench, angle_gauge)
 * @param {number}   skillLevel     – Player's precision skill level (1–n)
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

  // ── Derived constants ────────────────────────────────────────
  const difficulty     = clamp(partData.difficulty ?? 0.5, 0, 1);
  const hasTorqueWrench = !!playerTools.torque_wrench;
  const hasAngleGauge   = !!playerTools.angle_gauge;

  // Steps: 4 at diff 0.1, 11 at diff 0.9
  const totalSteps = 4 + Math.floor(difficulty * 8);

  // Sweep duration (lower = faster = harder)
  let sweepDuration = 2.5 - difficulty * 1.5;            // 2.35 s → 1.15 s
  if (hasTorqueWrench) sweepDuration *= 1.15;            // 15% slower
  sweepDuration *= (1 + skillLevel * 0.01);              // 1% per skill level

  // Green zone width (percentage of bar)
  let greenPct = 12 - difficulty * 7.78;                 // ~12% → ~5%
  greenPct = clamp(greenPct, 5, 12);
  if (hasAngleGauge) greenPct += 10;                     // +10% additive
  greenPct += skillLevel * 1;                            // +1% per skill level

  // Yellow flanks (fixed)
  const yellowPct = 8; // each side

  // Torque spec label (cosmetic)
  const torqueSpec = (8 + difficulty * 60).toFixed(1);

  // Condition math
  const startCondition   = clamp(instanceState.condition ?? 0.2, 0, 1);
  const targetImprovement = (0.90 - startCondition) * 0.8;
  const stepValue         = targetImprovement / totalSteps;

  // XP
  const baseXP = 15 + difficulty * 50;

  // Sequence enforcement (high difficulty)
  const useSequence = difficulty > 0.6;

  // Perfect Torque tracking
  let nextPerfectAt = randomInt(3, 7); // variable 3-7 green hits

  // ── Flavor ──────────────────────────────────────────────────
  const GENERIC_FLAVOR = [
    'Smooth and steady. Don\'t rush.',
    'Right on the money.',
    'Spec is spec. No shortcuts.',
    'Feel the click.',
    'That\'s torqued to spec.',
    'Careful... the gasket surface is soft.',
  ];
  const partFlavors = Array.isArray(partData.flavorText) && partData.flavorText.length
    ? partData.flavorText : [];
  const ALL_FLAVOR = [...partFlavors, ...GENERIC_FLAVOR];

  // ── Mutable state ────────────────────────────────────────────
  let currentStep      = 0;        // 0-indexed
  let stepResults      = [];       // 'pending'|'green'|'yellow'|'red' per step
  let conditionDelta   = 0;        // accumulated condition change
  let greenHits        = 0;
  let yellowHits       = 0;
  let redHits          = 0;
  let consecutiveGreens = 0;       // for Perfect Torque
  let perfectBonusCount = 0;
  let xpBonusMultiplier = 1;
  let isComplete       = false;

  // Sequence state (for difficulty > 0.6)
  // We assign each step a "target position" within the bar
  // The player must hit them in order.
  // For simplicity, positions are evenly spaced with small jitter.
  const seqPositions  = [];  // array of percentages [0-100] where center of target is
  let   seqCurrentIdx = 0;   // which seq position is expected next (resets on break)
  if (useSequence) {
    for (let i = 0; i < totalSteps; i++) {
      const base  = 10 + (i / (totalSteps - 1 || 1)) * 80;
      const jitter = randomRange(-5, 5);
      seqPositions.push(clamp(base + jitter, 8, 92));
    }
  }

  // Sweep state (managed via requestAnimationFrame)
  let sweepPct        = 0;         // 0-100, current indicator position
  let sweepDir        = 1;         // 1 = left-to-right, -1 = right-to-left
  let lastTimestamp   = null;
  let rafId           = null;
  let inputBlocked    = false;     // brief cooldown after each tap

  // Pre-fill results as pending
  for (let i = 0; i < totalSteps; i++) stepResults.push('pending');


  // ════════════════════════════════════════════════════════════
  //  BUILD UI
  // ════════════════════════════════════════════════════════════

  container.innerHTML = '';
  container.style.cssText = [
    'padding: 16px',
    'display: flex',
    'flex-direction: column',
    'gap: 16px',
    'max-width: 560px',
    'margin: 0 auto',
    'font-family: var(--font-ui, sans-serif)',
    'user-select: none',
    '-webkit-user-select: none',
  ].join(';');

  // ── Header row ───────────────────────────────────────────────
  const headerRow = _el('div', {
    style: 'display:flex; justify-content:space-between; align-items:flex-start; gap:8px;',
  });

  const titleBlock = _el('div', {});
  const titleEl = _el('div', {
    style: 'font-size:15px; font-weight:700; color:var(--text-primary,#fff); margin-bottom:3px;',
    textContent: `Torquing: ${partData.name ?? 'Component'}`,
  });
  const specEl = _el('div', {
    style: 'font-family:var(--font-data,monospace); font-size:12px; color:var(--text-secondary,#aaa);',
    textContent: `Spec: ${torqueSpec} ft-lbs`,
  });
  titleBlock.appendChild(titleEl);
  titleBlock.appendChild(specEl);

  const stepCounterEl = _el('div', {
    style: [
      'font-family: var(--font-data, monospace)',
      'font-size: 13px',
      'font-weight: 700',
      'color: var(--text-primary, #fff)',
      'background: var(--bg-elevated, #1a1a1a)',
      'border: 1px solid var(--border, #333)',
      'border-radius: 6px',
      'padding: 4px 10px',
      'white-space: nowrap',
    ].join(';'),
    textContent: `Step 1/${totalSteps}`,
  });

  headerRow.appendChild(titleBlock);
  headerRow.appendChild(stepCounterEl);
  container.appendChild(headerRow);

  // Tool badges
  if (hasTorqueWrench || hasAngleGauge) {
    const toolBadges = _el('div', {
      style: 'display:flex; gap:6px; flex-wrap:wrap;',
    });
    if (hasTorqueWrench) {
      toolBadges.appendChild(_el('span', {
        style: 'font-family:var(--font-data,monospace); font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(78,127,255,0.15); color:#4e7fff; border:1px solid #4e7fff55;',
        textContent: '🔩 Torque Wrench: +15% time',
      }));
    }
    if (hasAngleGauge) {
      toolBadges.appendChild(_el('span', {
        style: 'font-family:var(--font-data,monospace); font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(34,197,94,0.12); color:#22c55e; border:1px solid #22c55e55;',
        textContent: '📐 Angle Gauge: +10% zone',
      }));
    }
    container.appendChild(toolBadges);
  }

  // ── Sweep bar wrapper ────────────────────────────────────────
  const barOuter = _el('div', {
    style: [
      'position: relative',
      'width: 100%',
      'border-radius: 8px',
      'overflow: visible',
      'padding-bottom: 6px',
    ].join(';'),
  });

  // Zone label row (above bar)
  const zoneLabelRow = _el('div', {
    style: 'display:flex; width:100%; margin-bottom:4px; position:relative;',
  });

  // Sequence markers container (sits above bar)
  const seqMarkerContainer = _el('div', {
    style: 'position:relative; height:20px; width:100%; margin-bottom:2px;',
  });

  if (useSequence) {
    for (let i = 0; i < totalSteps; i++) {
      const marker = _el('div', {
        className: 'pw-seq-marker',
        style: `left: ${seqPositions[i]}%;`,
        textContent: String(i + 1),
      });
      marker.dataset.seqIdx = String(i);
      seqMarkerContainer.appendChild(marker);
    }
    barOuter.appendChild(seqMarkerContainer);
  }

  // The actual bar
  const barEl = _el('div', {
    style: [
      'position: relative',
      'width: 100%',
      'height: 52px',
      'border-radius: 8px',
      'overflow: hidden',
      'border: 1px solid var(--border, #333)',
      'cursor: pointer',
      'background: var(--bg-elevated, #111)',
    ].join(';'),
  });

  // ── Zone segments (red | yellow | green | yellow | red) ──────
  // Positions: red from 0 → leftYellowStart, yellow, green center, yellow, red
  const greenStart  = 50 - greenPct / 2;  // % from left
  const greenEnd    = 50 + greenPct / 2;
  const leftYStart  = greenStart - yellowPct;
  const rightYEnd   = greenEnd   + yellowPct;

  // We draw via absolutely-positioned divs
  // RED left
  _appendZone(barEl, 0,          leftYStart,  '#ef444426', '#ef4444');
  // YELLOW left
  _appendZone(barEl, leftYStart, greenStart,  '#eab30826', '#eab308');
  // GREEN center
  _appendZone(barEl, greenStart, greenEnd,    '#22c55e30', '#22c55e');
  // YELLOW right
  _appendZone(barEl, greenEnd,   rightYEnd,   '#eab30826', '#eab308');
  // RED right
  _appendZone(barEl, rightYEnd,  100,         '#ef444426', '#ef4444');

  // ── Zone labels below bar ────────────────────────────────────
  const zoneLabels = _el('div', {
    style: 'display:flex; width:100%; justify-content:space-between; margin-top:4px;',
  });
  zoneLabels.appendChild(_el('span', { className: 'pw-zone-label', style: 'color:#ef4444; flex:1;', textContent: 'RED' }));
  zoneLabels.appendChild(_el('span', { className: 'pw-zone-label', style: 'color:#eab308; flex:0 0 auto; padding:0 8px;', textContent: 'YLW' }));
  zoneLabels.appendChild(_el('span', { className: 'pw-zone-label', style: 'color:#22c55e; flex:0 0 auto; padding:0 8px;', textContent: 'GRN' }));
  zoneLabels.appendChild(_el('span', { className: 'pw-zone-label', style: 'color:#eab308; flex:0 0 auto; padding:0 8px;', textContent: 'YLW' }));
  zoneLabels.appendChild(_el('span', { className: 'pw-zone-label', style: 'color:#ef4444; flex:1; text-align:right;', textContent: 'RED' }));

  // ── Sweep indicator ──────────────────────────────────────────
  const indicatorEl = _el('div', {
    style: [
      'position: absolute',
      'top: 0',
      'left: 0',
      'width: 4px',
      'height: 100%',
      'background: #fff',
      'border-radius: 2px',
      'box-shadow: 0 0 8px rgba(255,255,255,0.85)',
      'pointer-events: none',
      'z-index: 5',
    ].join(';'),
  });
  barEl.appendChild(indicatorEl);

  // ── TAP NOW label inside bar ─────────────────────────────────
  const tapLabelEl = _el('div', {
    style: [
      'position: absolute',
      'bottom: 6px',
      'left: 50%',
      'transform: translateX(-50%)',
      'font-family: var(--font-data, monospace)',
      'font-size: 11px',
      'font-weight: 700',
      'color: var(--text-secondary, #888)',
      'letter-spacing: 0.12em',
      'pointer-events: none',
      'z-index: 6',
    ].join(';'),
    textContent: '[ TAP NOW ]',
  });
  barEl.appendChild(tapLabelEl);

  barOuter.appendChild(barEl);
  barOuter.appendChild(zoneLabels);
  container.appendChild(barOuter);

  // ── Perfect Torque notice (hidden until triggered) ───────────
  const perfectNoticeEl = _el('div', {
    style: [
      'font-family: var(--font-data, monospace)',
      'font-size: 13px',
      'font-weight: 700',
      'color: #f59e0b',
      'text-align: center',
      'min-height: 20px',
      'opacity: 0',
      'transition: opacity 200ms',
    ].join(';'),
    textContent: '⚡ Perfect Torque!',
  });
  container.appendChild(perfectNoticeEl);

  // ── Sequence notice ──────────────────────────────────────────
  let seqNoticeEl = null;
  if (useSequence) {
    seqNoticeEl = _el('div', {
      style: [
        'font-family: var(--font-data, monospace)',
        'font-size: 12px',
        'color: var(--text-secondary, #aaa)',
        'text-align: center',
        'background: var(--bg-elevated, #111)',
        'border: 1px solid var(--border, #333)',
        'border-radius: 6px',
        'padding: 4px 10px',
      ].join(';'),
      textContent: `Sequence: hit positions 1 → ${totalSteps} in order`,
    });
    container.appendChild(seqNoticeEl);
  }

  // ── Result icons row ─────────────────────────────────────────
  const resultsWrap = _el('div', { className: 'pw-results-wrap' });
  const resultLabel = _el('span', {
    style: 'font-family:var(--font-data,monospace); font-size:12px; color:var(--text-secondary,#aaa); margin-right:4px;',
    textContent: 'Result:',
  });
  resultsWrap.appendChild(resultLabel);

  const resultIconEls = [];
  for (let i = 0; i < totalSteps; i++) {
    const ico = _el('span', {
      className: 'pw-result-icon',
      textContent: '—',
      style: 'color:var(--text-muted,#555);',
    });
    resultIconEls.push(ico);
    resultsWrap.appendChild(ico);
  }
  container.appendChild(resultsWrap);

  // ── Flavor text ───────────────────────────────────────────────
  const flavorEl = _el('div', {
    style: [
      'font-size: 13px',
      'font-style: italic',
      'color: var(--text-secondary, #aaa)',
      'min-height: 20px',
      'text-align: center',
      'padding: 4px 0',
    ].join(';'),
    textContent: `"${pickRandom(ALL_FLAVOR)}"`,
  });
  container.appendChild(flavorEl);


  // ════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════

  function _appendZone(parent, pctStart, pctEnd, bg, borderColor) {
    const zone = _el('div', {
      style: [
        'position: absolute',
        'top: 0',
        'height: 100%',
        `left: ${pctStart}%`,
        `width: ${pctEnd - pctStart}%`,
        `background: ${bg}`,
        `border-left: 1px solid ${borderColor}55`,
        `border-right: 1px solid ${borderColor}55`,
        'pointer-events: none',
        'z-index: 1',
      ].join(';'),
    });
    parent.appendChild(zone);
  }

  function _triggerAnimation(el, cls, duration) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    if (duration) {
      setTimeout(() => el.classList.remove(cls), duration);
    } else {
      el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
    }
  }

  function playAudio(name, opts = {}) {
    try {
      const am = window.audioManager;
      if (!am) return;
      am.play(name, opts);
    } catch (_) { /* audio not yet loaded */ }
  }

  function setFlavor(text, animate = true) {
    flavorEl.textContent = `"${text}"`;
    if (animate) {
      flavorEl.classList.remove('pw-flavor-in');
      void flavorEl.offsetWidth;
      flavorEl.classList.add('pw-flavor-in');
      flavorEl.addEventListener('animationend', () => flavorEl.classList.remove('pw-flavor-in'), { once: true });
    }
  }

  function updateStepCounter() {
    stepCounterEl.textContent = `Step ${Math.min(currentStep + 1, totalSteps)}/${totalSteps}`;
  }

  function spawnHitLabel(text, color) {
    const lbl = _el('div', {
      className: 'pw-hit-label-anim',
      style: `color:${color}; top:4px; left:50%; transform:translateX(-50%);`,
      textContent: text,
    });
    barOuter.style.position = 'relative';
    barOuter.appendChild(lbl);
    lbl.addEventListener('animationend', () => lbl.remove(), { once: true });
  }

  function updateSeqMarkers() {
    if (!useSequence) return;
    const markers = seqMarkerContainer.querySelectorAll('.pw-seq-marker');
    markers.forEach(m => {
      const idx = parseInt(m.dataset.seqIdx, 10);
      if (idx < seqCurrentIdx) {
        m.style.opacity = '0.25'; // already hit this session-step
      } else if (idx === seqCurrentIdx) {
        m.style.color   = '#22c55e';
        m.style.opacity = '1';
        m.style.textShadow = '0 0 8px #22c55e';
      } else {
        m.style.color   = 'var(--text-primary, #fff)';
        m.style.opacity = '1';
        m.style.textShadow = '';
      }
    });
  }

  function updateResultIcon(stepIdx, result) {
    const ico = resultIconEls[stepIdx];
    if (!ico) return;

    let sym, color;
    switch (result) {
      case 'green':  sym = '✓'; color = '#22c55e'; break;
      case 'yellow': sym = '○'; color = '#eab308'; break;
      case 'red':    sym = '✗'; color = '#ef4444'; break;
      default:       sym = '—'; color = 'var(--text-muted,#555)'; break;
    }
    ico.textContent = sym;
    ico.style.color = color;
    _triggerAnimation(ico, 'pw-step-pop');
  }

  function flashPerfectTorque() {
    perfectNoticeEl.style.opacity = '1';
    _triggerAnimation(barEl, 'pw-perfect-torque-flash', 700);
    playAudio('torque_click', { pitch: 1.3 });
    setTimeout(() => {
      perfectNoticeEl.style.opacity = '0';
    }, 1600);
  }


  // ════════════════════════════════════════════════════════════
  //  SWEEP ANIMATION LOOP (rAF-based, no CSS animation for movement)
  // ════════════════════════════════════════════════════════════

  function startSweep() {
    lastTimestamp = null;
    rafId = requestAnimationFrame(sweepTick);
  }

  function sweepTick(ts) {
    if (isComplete) return;

    if (lastTimestamp === null) lastTimestamp = ts;
    const elapsed = ts - lastTimestamp;
    lastTimestamp = ts;

    // sweepDuration is seconds for one full sweep; convert to pct/ms
    const pctPerMs = 100 / (sweepDuration * 1000);
    sweepPct += sweepDir * pctPerMs * elapsed;

    if (sweepPct >= 100) {
      sweepPct = 100;
      sweepDir = -1;
    } else if (sweepPct <= 0) {
      sweepPct = 0;
      sweepDir = 1;
    }

    // Position indicator (account for 4px width)
    indicatorEl.style.left = `calc(${sweepPct}% - ${sweepPct / 100 * 4}px)`;

    rafId = requestAnimationFrame(sweepTick);
  }


  // ════════════════════════════════════════════════════════════
  //  HIT RESOLUTION
  // ════════════════════════════════════════════════════════════

  function resolveHit() {
    if (isComplete || inputBlocked) return;

    const pos = sweepPct; // 0-100

    // ── Sequence check ───────────────────────────────────────
    if (useSequence) {
      const targetPos = seqPositions[seqCurrentIdx];
      // The "hit window" for sequence is the green zone AROUND the target position
      // not the bar's global green — the player must land near the target marker too.
      const seqHalfWindow = greenPct / 2 + yellowPct; // generous: green+yellow from target
      const seqGreenHalf  = greenPct / 2;
      const dist = Math.abs(pos - targetPos);

      if (dist > seqHalfWindow) {
        // Sequence break — not even close to current target
        seqCurrentIdx = 0;
        _triggerAnimation(barEl, 'pw-seq-shake', 320);
        spawnHitLabel('SEQUENCE BREAK', '#ef4444');
        setFlavor('Wrong bolt! Start the pattern over.');
        playAudio('miss');
        updateSeqMarkers();
        return; // do NOT advance step
      }

      // They hit near the right marker — now check green/yellow/red quality
      if (dist <= seqGreenHalf) {
        // Good and in sequence — proceed to normal green resolution
        seqCurrentIdx++;
        if (seqCurrentIdx < totalSteps) updateSeqMarkers();
        // fall through to zone classification below using seqGreenHalf
      } else {
        // Yellow-zone hit near the marker — acceptable but not perfect
        seqCurrentIdx++;
        if (seqCurrentIdx < totalSteps) updateSeqMarkers();
        registerHit('yellow', pos);
        return;
      }
    }

    // ── Zone classification (global bar zones) ────────────────
    let zone;
    if (pos >= greenStart && pos <= greenEnd) {
      zone = 'green';
    } else if ((pos >= leftYStart && pos < greenStart) ||
               (pos > greenEnd   && pos <= rightYEnd)) {
      zone = 'yellow';
    } else {
      zone = 'red';
    }

    registerHit(zone, pos);
  }

  function registerHit(zone, pos) {
    // Brief cooldown so rapid double-taps don't double-register
    inputBlocked = true;
    setTimeout(() => { inputBlocked = false; }, 120);

    stepResults[currentStep] = zone;
    updateResultIcon(currentStep, zone);

    switch (zone) {
      case 'green': {
        conditionDelta += stepValue;
        greenHits++;
        consecutiveGreens++;

        // Perfect Torque?
        if (consecutiveGreens >= nextPerfectAt) {
          perfectBonusCount++;
          xpBonusMultiplier += 1; // each perfect torque adds to XP multiplier
          flashPerfectTorque();
          consecutiveGreens = 0;
          nextPerfectAt = randomInt(3, 7);
        }

        _triggerAnimation(barEl, 'pw-hit-green', 420);
        spawnHitLabel('PERFECT', '#22c55e');
        setFlavor(pickRandom(ALL_FLAVOR));
        playAudio('torque_click');
        break;
      }

      case 'yellow': {
        conditionDelta += stepValue * 0.85;
        yellowHits++;
        consecutiveGreens = 0;

        _triggerAnimation(barEl, 'pw-hit-yellow', 380);
        spawnHitLabel('GOOD', '#eab308');
        setFlavor(pickRandom(ALL_FLAVOR));
        playAudio('ui_click');
        break;
      }

      case 'red': {
        const damage = randomRange(0.01, 0.03);
        conditionDelta -= damage;
        redHits++;
        consecutiveGreens = 0;

        _triggerAnimation(barEl, 'pw-hit-red', 500);
        spawnHitLabel('MISS', '#ef4444');
        setFlavor('Off spec. Try again.');
        playAudio('miss');
        break;
      }
    }

    currentStep++;

    if (currentStep >= totalSteps) {
      completeWork();
    } else {
      updateStepCounter();
      // Reset sequence index for next step (each step is its own sequence)
      seqCurrentIdx = 0;
      if (useSequence) updateSeqMarkers();
    }
  }


  // ════════════════════════════════════════════════════════════
  //  COMPLETION
  // ════════════════════════════════════════════════════════════

  function completeWork() {
    isComplete = true;
    cancelAnimationFrame(rafId);
    rafId = null;

    // Remove all input listeners
    container.removeEventListener('click',      handleClick);
    container.removeEventListener('touchstart', handleTouch);
    document.removeEventListener('keydown',     handleKeydown);

    // Clamp final condition
    const newCondition = parseFloat(
      clamp(startCondition + conditionDelta, 0.01, 0.95).toFixed(2)
    );

    // XP: baseXP * (greenHits / totalSteps) * perfectBonusMultiplier
    const greenRatio = greenHits / totalSteps;
    const xpEarned   = Math.max(1, Math.round(baseXP * greenRatio * xpBonusMultiplier));

    // Summary flavor
    setFlavor(
      greenHits === totalSteps
        ? "Perfect torque on every bolt. Beautiful work."
        : greenHits > totalSteps * 0.7
          ? "That's torqued to spec."
          : "Could be tighter, but it'll hold."
    );

    // Visual completion
    stepCounterEl.textContent = `Done!`;
    stepCounterEl.style.color = 'var(--condition-excellent, #10b981)';
    _triggerAnimation(barEl, 'pw-complete-bar', 900);
    indicatorEl.style.opacity = '0';
    tapLabelEl.textContent = '✅ COMPLETE';
    tapLabelEl.style.color = '#22c55e';

    // Summary line
    const summaryEl = _el('div', {
      style: [
        'font-family: var(--font-data, monospace)',
        'font-size: 12px',
        'color: var(--text-secondary, #aaa)',
        'text-align: center',
        'margin-top: 4px',
      ].join(';'),
      textContent: `${greenHits}/${totalSteps} perfect  ·  ${yellowHits} acceptable  ·  ${redHits} missed`,
    });
    container.appendChild(summaryEl);

    const logEntries = [
      `Torqued ${partData.name} — ${totalSteps} steps (${greenHits} perfect / ${yellowHits} good / ${redHits} missed)`,
      `Condition: ${Math.round(startCondition * 100)}% → ${Math.round(newCondition * 100)}%`,
      `Precision XP earned: +${xpEarned}${perfectBonusCount > 0 ? ` (${perfectBonusCount}× Perfect Torque!)` : ''}`,
    ];

    setTimeout(() => {
      onComplete({ newCondition, xpEarned, logEntries });
    }, 1200);
  }


  // ════════════════════════════════════════════════════════════
  //  INPUT HANDLERS
  // ════════════════════════════════════════════════════════════

  function handleClick(e) {
    e.preventDefault();
    resolveHit();
  }

  function handleTouch(e) {
    e.preventDefault();
    resolveHit();
  }

  function handleKeydown(e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      resolveHit();
    }
  }

  // Full-container tap (mobile-friendly)
  container.classList.add('pw-mobile-tap-area');
  container.addEventListener('click',      handleClick);
  container.addEventListener('touchstart', handleTouch, { passive: false });
  document.addEventListener('keydown',     handleKeydown);


  // ════════════════════════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════════════════════════

  if (useSequence) updateSeqMarkers();
  updateStepCounter();
  startSweep();
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
