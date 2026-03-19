// ════════════════════════════════════════════════════════════
//  mechanics/wrench.js — Wrench Work (Rhythm Tapper)
//
//  Usage:
//    startWrenchWork(partData, instanceState, container, onComplete)
//
//  onComplete fires with: { newCondition, xpEarned, logEntries[] }
// ════════════════════════════════════════════════════════════

import { randomInt, randomRange, pickRandom, clamp } from '../utils.js';

// ── One-time CSS injection ────────────────────────────────────
// Wrench-specific keyframes and utility classes not in game.css
let _cssInjected = false;

function _injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;

  const style = document.createElement('style');
  style.id = 'wrench-mechanic-styles';
  style.textContent = `

    /* ── Tap target press feedback ── */
    @keyframes ww-tap-press {
      0%   { transform: scale(1); }
      35%  { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    .ww-pressing {
      animation: ww-tap-press 120ms ease !important;
    }

    /* ── Tap icon bob ── */
    @keyframes ww-icon-bob {
      0%   { transform: translateY(0) rotate(0deg); }
      40%  { transform: translateY(-6px) rotate(-12deg); }
      100% { transform: translateY(0) rotate(0deg); }
    }
    .ww-icon-bob {
      animation: ww-icon-bob 140ms ease !important;
    }

    /* ── Hazard border flash ── */
    @keyframes ww-hazard-flash {
      0%, 100% {
        border-color: #ef4444;
        box-shadow: 0 0 14px rgba(239,68,68,0.35);
      }
      50% {
        border-color: #fca5a5;
        box-shadow: 0 0 32px rgba(239,68,68,0.65);
      }
    }
    .ww-hazard-active {
      animation: ww-hazard-flash 380ms ease infinite !important;
    }

    /* ── Critical click: progress bar scales up briefly ── */
    @keyframes ww-critical-pop {
      0%   { transform: scaleY(1)   scaleX(1);   filter: brightness(1); }
      25%  { transform: scaleY(1.5) scaleX(1.01); filter: brightness(1.8); }
      65%  { transform: scaleY(1.2) scaleX(1);   filter: brightness(1.3); }
      100% { transform: scaleY(1)   scaleX(1);   filter: brightness(1); }
    }
    .ww-critical-pop {
      animation: ww-critical-pop 380ms ease !important;
      transform-origin: left center;
    }

    /* ── Hazard fail: progress bar shakes red ── */
    @keyframes ww-shake {
      0%         { transform: translateX(0); }
      15%, 45%, 75% { transform: translateX(-5px); }
      30%, 60%, 90% { transform: translateX(5px); }
      100%       { transform: translateX(0); }
    }
    @keyframes ww-loss-flash {
      0%   { background-color: var(--condition-good); }
      30%  { background-color: #ef4444; }
      100% { background-color: var(--condition-good); }
    }
    .ww-shake   { animation: ww-shake      300ms ease !important; }
    .ww-loss    { animation: ww-loss-flash 550ms ease !important; }

    /* ── Hazard success: brief green pulse on target ── */
    @keyframes ww-success-flash {
      0%   { box-shadow: 0 0 0 rgba(34,197,94,0); }
      30%  { box-shadow: 0 0 24px rgba(34,197,94,0.55); }
      100% { box-shadow: 0 0 0 rgba(34,197,94,0); }
    }
    .ww-success-flash {
      animation: ww-success-flash 600ms ease !important;
    }

    /* ── Momentum bar in-rhythm pulse ── */
    @keyframes ww-momentum-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.55; }
    }
    .ww-momentum-pulsing {
      animation: ww-momentum-pulse 700ms ease infinite;
    }

    /* ── Completion: progress bar sweeps to full green ── */
    @keyframes ww-complete-sweep {
      0%   { background: var(--condition-good); }
      40%  { background: #10b981; filter: brightness(1.6); }
      100% { background: var(--condition-excellent); filter: brightness(1); box-shadow: 0 0 18px rgba(16,185,129,0.4); }
    }
    .ww-complete-bar {
      animation: ww-complete-sweep 700ms ease forwards !important;
    }

    /* ── Flavor text fade-up on change ── */
    @keyframes ww-flavor-in {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .ww-flavor-in {
      animation: ww-flavor-in 200ms ease !important;
    }

    /* ── x3.0 gold shimmer on tap target border ── */
    @keyframes ww-gold-shimmer {
      0%, 100% { box-shadow: 0 0 10px rgba(245,158,11,0.25); }
      50%       { box-shadow: 0 0 28px rgba(245,158,11,0.55); }
    }
    .ww-gold-shimmer {
      animation: ww-gold-shimmer 900ms ease infinite;
    }

    /* ── Tap target base ── */
    .ww-tap-target {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
      outline: none;
    }
    .ww-tap-target:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

  `;
  document.head.appendChild(style);
}


// ════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ════════════════════════════════════════════════════════════

/**
 * Render the Wrench Work mechanic into `container` and begin the interaction.
 *
 * @param {object}   partData       - Part definition (name, difficulty, flavorText, …)
 * @param {object}   instanceState  - Part instance state (condition, repairProgress, …)
 * @param {Element}  container      - DOM element to render into
 * @param {Function} onComplete     - Called with { newCondition, xpEarned, logEntries[] }
 */
export function startWrenchWork(partData, instanceState, container, onComplete) {
  _injectCSS();

  // ── Derived constants ────────────────────────────────────────
  const difficulty    = clamp(partData.difficulty ?? 0.5, 0, 1);
  const totalClicks   = Math.round(30 + difficulty * 70);   // 37 – 93
  const idealTempo    = 200 + (1.0 - difficulty) * 300;     // 230 – 470 ms
  const tolerance     = 80;                                  // ±ms
  const baseXP        = 10 + difficulty * 40;               // 14 – 46
  const baseClickVal  = 1.0 / totalClicks;                   // per-click base progress

  // flavor text pools
  const GENERIC_FLAVOR = [
    'Keep the rhythm.',
    'Steady hands.',
    "Almost there... don't rush it.",
    'Three uggas in... almost there.',
    "This bolt's fighting back.",
    'Good torque.',
    "Nice and easy.",
    "Feel that? It's giving.",
  ];
  const partFlavors = Array.isArray(partData.flavorText) && partData.flavorText.length
    ? partData.flavorText
    : [];
  const ALL_FLAVOR = [...partFlavors, ...GENERIC_FLAVOR];

  const CRITICAL_FLAVOR = [
    'CRACK — it broke free!',
    'There we go.',
    'Like butter.',
    'Finally.',
    "That's the one.",
  ];

  const HAZARD_SUCCESS = [
    'Backed it off, good call.',
    'Smart. Let it breathe.',
    'Easy does it. Momentum held.',
  ];
  const HAZARD_FAIL = [
    'Stripped it. Back up and try again.',
    'Too eager — momentum lost.',
    "Easy! You just made it worse.",
  ];

  // ── Mutable state ────────────────────────────────────────────
  let progress        = 0;
  let clickCount      = 0;
  let lastClickTime   = 0;       // performance.now() timestamp

  let comboCount      = 0;       // consecutive in-tempo hits
  let totalComboSum   = 0;       // sum of effective multipliers (for avg XP calc)
  let totalComboSamples = 0;

  let criticalBonus   = 0;       // clicks remaining with +0.5 bonus after a critical

  let inHazard        = false;
  let hazardClicked   = false;
  let hazardTimer     = null;
  let nextHazardAt    = randomInt(15, 30);
  let clicksSinceHazard = 0;

  let nextCriticalAt  = randomInt(8, 35);
  let clicksSinceCritical = 0;

  let nextFlavorAt    = randomInt(5, 10);
  let clicksSinceFlavor = 0;

  let isComplete      = false;


  // ── Resistance label ─────────────────────────────────────────
  function getResistance() {
    if (difficulty < 0.30)  return { label: 'LOW',      color: 'var(--condition-good)' };
    if (difficulty < 0.60)  return { label: 'MODERATE', color: 'var(--condition-poor)' };
    if (difficulty < 0.85)  return { label: 'HIGH',     color: 'var(--condition-critical)' };
    return                         { label: 'SEIZED',   color: 'var(--condition-destroyed)' };
  }

  // ── Combo tier lookup ────────────────────────────────────────
  function getComboTier(count) {
    if (count >= 15) return { multiplier: 3.0, label: 'x3.0', color: '#f59e0b' };
    if (count >= 10) return { multiplier: 2.5, label: 'x2.5', color: '#f59e0b' };
    if (count >= 6)  return { multiplier: 2.0, label: 'x2.0', color: '#22c55e' };
    if (count >= 3)  return { multiplier: 1.5, label: 'x1.5', color: '#60a5fa' };
    return                  { multiplier: 1.0, label: 'x1.0', color: 'var(--text-muted)' };
  }


  // ════════════════════════════════════════════════════════════
  //  BUILD UI
  // ════════════════════════════════════════════════════════════

  container.innerHTML = '';
  container.style.cssText = [
    'padding: 16px',
    'display: flex',
    'flex-direction: column',
    'gap: 14px',
    'max-width: 560px',
    'margin: 0 auto',
    'font-family: var(--font-ui)',
  ].join(';');

  // Prevent text selection while rapidly tapping
  container.style.userSelect = 'none';
  container.style.webkitUserSelect = 'none';

  const resistance = getResistance();

  // ── Header ───────────────────────────────────────────────────
  const headerRow = _el('div', {
    style: 'display:flex; justify-content:space-between; align-items:flex-start; gap:8px;',
  });

  const partInfoCol = _el('div', { style: 'min-width:0; flex:1;' });
  const partLabel   = _el('div', {
    style: 'font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); font-family:var(--font-data);',
    textContent: 'Removing',
  });
  const partName    = _el('div', {
    style: 'font-size:15px; font-weight:700; color:var(--text-primary); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
    textContent: partData.name,
  });
  const resistRow   = _el('div', {
    style: 'font-size:12px; color:var(--text-secondary); margin-top:5px; font-family:var(--font-data);',
  });
  resistRow.append('Resistance: ');
  const resistLabel = _el('span', {
    style: `color:${resistance.color}; font-weight:700;`,
    textContent: resistance.label,
  });
  // "SEIZED" pulses
  if (difficulty >= 0.85) {
    resistLabel.style.animation = 'ww-hazard-flash 800ms ease infinite';
  }
  resistRow.appendChild(resistLabel);
  partInfoCol.append(partLabel, partName, resistRow);

  const comboCol      = _el('div', { style: 'text-align:right; flex-shrink:0;' });
  const comboTagLine  = _el('div', {
    style: 'font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); font-family:var(--font-data);',
    textContent: 'Combo',
  });
  const comboBig      = _el('div', {
    style: 'font-size:26px; font-weight:800; font-family:var(--font-data); color:var(--text-muted); line-height:1; margin-top:1px;',
    textContent: 'x1.0',
  });
  comboCol.append(comboTagLine, comboBig);

  headerRow.append(partInfoCol, comboCol);
  container.appendChild(headerRow);


  // ── Tap target ───────────────────────────────────────────────
  const tapTarget = _el('button', {
    className: 'ww-tap-target',
    style: [
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'flex-direction:column',
      'gap:6px',
      'width:100%',
      'min-height:160px',
      'background:var(--bg-secondary)',
      'border:2px solid var(--border)',
      'border-radius:var(--radius-md)',
      'cursor:pointer',
      'padding:16px',
      'transition:border-color 220ms ease, box-shadow 220ms ease',
      'position:relative',
    ].join(';'),
  });

  const tapIcon  = _el('span', {
    style: 'font-size:42px; display:block; line-height:1; transition:transform 120ms ease;',
    textContent: '🔧',
  });
  const tapLabel = _el('span', {
    style: 'font-size:13px; font-weight:800; letter-spacing:0.1em; text-transform:uppercase; color:var(--text-secondary); transition:color 200ms ease;',
    textContent: 'CLICK',
  });
  tapTarget.append(tapIcon, tapLabel);
  container.appendChild(tapTarget);


  // ── Progress bar ─────────────────────────────────────────────
  const progressSection = _el('div', { style: 'display:flex; flex-direction:column; gap:5px;' });
  const progressMeta    = _el('div', {
    style: 'display:flex; justify-content:space-between; font-size:12px; color:var(--text-secondary); font-family:var(--font-data);',
  });
  const progressLabelTxt = _el('span', { textContent: 'Progress' });
  const progressPct      = _el('span', { textContent: '0%' });
  progressMeta.append(progressLabelTxt, progressPct);

  const progressTrack = _el('div', {
    style: 'height:18px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden;',
  });
  const progressBar = _el('div', {
    style: [
      'height:100%',
      'width:0%',
      'background:var(--condition-good)',
      'border-radius:var(--radius-sm)',
      'transition:width 90ms ease',
      'transform-origin:left center',
    ].join(';'),
  });
  progressTrack.appendChild(progressBar);
  progressSection.append(progressMeta, progressTrack);
  container.appendChild(progressSection);


  // ── Momentum bar ─────────────────────────────────────────────
  const momentumSection  = _el('div', { style: 'display:flex; flex-direction:column; gap:5px;' });
  const momentumMeta     = _el('div', {
    style: 'display:flex; justify-content:space-between; font-size:12px; color:var(--text-secondary); font-family:var(--font-data);',
  });
  const momentumTxt     = _el('span', { textContent: '⚡ Momentum' });
  const rhythmLabel     = _el('span', { style: 'color:var(--text-muted);', textContent: 'rhythm: —' });
  momentumMeta.append(momentumTxt, rhythmLabel);

  const momentumTrack = _el('div', {
    style: 'height:9px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden;',
  });
  const momentumBar = _el('div', {
    style: [
      'height:100%',
      'width:0%',
      'background:var(--text-muted)',
      'border-radius:var(--radius-sm)',
      'transition:width 250ms ease, background 300ms ease',
    ].join(';'),
  });
  momentumTrack.appendChild(momentumBar);
  momentumSection.append(momentumMeta, momentumTrack);
  container.appendChild(momentumSection);


  // ── Flavor text ──────────────────────────────────────────────
  const flavorEl = _el('div', {
    style: [
      'font-style:italic',
      'color:var(--text-secondary)',
      'font-size:13px',
      'min-height:22px',
      'text-align:center',
      'padding:2px 0',
      'line-height:1.5',
    ].join(';'),
    textContent: `"${pickRandom(ALL_FLAVOR)}"`,
  });
  container.appendChild(flavorEl);


  // ════════════════════════════════════════════════════════════
  //  UI UPDATE HELPERS
  // ════════════════════════════════════════════════════════════

  function updateComboDisplay() {
    const tier = getComboTier(comboCount);
    comboBig.textContent = tier.label;
    comboBig.style.color = tier.color;

    // Tap target border colour by combo tier
    tapTarget.style.borderColor = tier.color === 'var(--text-muted)' ? 'var(--border)' : tier.color;

    // x3 gold shimmer
    if (comboCount >= 15) {
      tapTarget.classList.add('ww-gold-shimmer');
    } else {
      tapTarget.classList.remove('ww-gold-shimmer');
    }

    // Momentum bar width + color
    // Scale: 0 → 0%, hits 3 → ~15%, 6 → 30%, 10 → 50%, 15 → 75%, 20+ → 100%
    const momentumPct = Math.min(100, (comboCount / 20) * 100);
    momentumBar.style.width = `${momentumPct}%`;
    momentumBar.style.background = tier.color;

    // Rhythm label + pulse
    if (comboCount >= 3) {
      const rhythmWord =
        comboCount >= 15 ? 'PERFECT' :
        comboCount >= 10 ? 'GREAT'   : 'GOOD';
      rhythmLabel.textContent = `rhythm: ${rhythmWord}`;
      rhythmLabel.style.color = tier.color;
      momentumBar.classList.add('ww-momentum-pulsing');
    } else {
      rhythmLabel.textContent = 'rhythm: —';
      rhythmLabel.style.color = 'var(--text-muted)';
      momentumBar.classList.remove('ww-momentum-pulsing');
    }
  }

  function updateProgressDisplay() {
    const pct = Math.min(100, Math.round(progress * 100));
    progressBar.style.width = `${pct}%`;
    progressPct.textContent = `${pct}%`;
  }

  function setFlavor(text, animate = true) {
    flavorEl.textContent = `"${text}"`;
    if (animate) {
      flavorEl.classList.remove('ww-flavor-in');
      void flavorEl.offsetWidth; // force reflow to restart animation
      flavorEl.classList.add('ww-flavor-in');
      flavorEl.addEventListener('animationend', () => flavorEl.classList.remove('ww-flavor-in'), { once: true });
    }
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
      if (window.audioManager) window.audioManager.play(name, opts);
    } catch (_) { /* audio module not yet loaded */ }
  }


  // ════════════════════════════════════════════════════════════
  //  GAME SYSTEMS
  // ════════════════════════════════════════════════════════════

  // ── Tap target press feedback (every click) ──────────────────
  function animateTap() {
    // Target scale
    _triggerAnimation(tapTarget, 'ww-pressing');
    // Icon bob
    _triggerAnimation(tapIcon, 'ww-icon-bob');
  }


  // ── Critical Click ───────────────────────────────────────────
  function triggerCritical() {
    // Progress jump: 3× – 5× a normal click value
    const multiplier = randomRange(3, 5);
    const jump = baseClickVal * multiplier;
    progress = Math.min(1.0, progress + jump);

    // Visual: progress bar pops
    _triggerAnimation(progressBar, 'ww-critical-pop');

    // Flavor
    setFlavor(pickRandom(CRITICAL_FLAVOR));

    // Combo bonus for next 3 clicks
    criticalBonus = 3;

    // Sound — higher pitch ratchet
    playAudio('impact');

    // Reset timer
    nextCriticalAt      = randomInt(8, 35);
    clicksSinceCritical = 0;

    updateProgressDisplay();
  }


  // ── Hazard Interrupt ─────────────────────────────────────────
  function startHazard() {
    inHazard      = true;
    hazardClicked = false;

    tapLabel.textContent = '⚠️  STUCK — HOLD';
    tapLabel.style.color = '#ef4444';
    tapIcon.textContent  = '🛑';
    tapTarget.classList.add('ww-hazard-active');

    playAudio('stuck');

    hazardTimer = setTimeout(() => endHazard(!hazardClicked), 1500);
  }

  function endHazard(success) {
    inHazard = false;
    clearTimeout(hazardTimer);

    tapTarget.classList.remove('ww-hazard-active');
    tapLabel.style.color = '';
    tapIcon.textContent  = '🔧';

    if (success) {
      // ── SUCCESS: momentum preserved ──
      tapLabel.textContent = 'CLICK';
      _triggerAnimation(tapTarget, 'ww-success-flash', 650);
      setFlavor(pickRandom(HAZARD_SUCCESS));
      // Restore combo-appropriate border (slight delay so flash is visible first)
      setTimeout(updateComboDisplay, 650);
    } else {
      // ── FAILURE: lose combo + 5% progress ──
      comboCount = 0;

      progress = Math.max(0, progress - 0.05);

      // Shake + colour flash the progress bar
      _triggerAnimation(progressBar, 'ww-shake');
      _triggerAnimation(progressBar, 'ww-loss');

      tapLabel.textContent = 'CLICK';
      setFlavor(pickRandom(HAZARD_FAIL));

      updateComboDisplay();
      updateProgressDisplay();
    }

    // Reset hazard timer
    nextHazardAt      = randomInt(15, 30);
    clicksSinceHazard = 0;
  }


  // ── Completion ───────────────────────────────────────────────
  function completeWork() {
    isComplete = true;

    // Stop listening
    tapTarget.removeEventListener('click', handleClick);
    tapTarget.removeEventListener('touchstart', handleTouch);

    // Visual
    progress = 1.0;
    updateProgressDisplay();
    _triggerAnimation(progressBar, 'ww-complete-bar', 1000);

    tapTarget.style.cursor  = 'default';
    tapTarget.style.opacity = '0.55';
    tapTarget.style.borderColor = 'var(--condition-excellent)';
    tapTarget.classList.remove('ww-gold-shimmer');
    tapIcon.textContent  = '✅';
    tapLabel.textContent = 'DONE';
    tapLabel.style.color = 'var(--condition-excellent)';

    const actionWords = ['sorted', 'off', 'done', 'free'];
    setFlavor(`Done. ${partData.name} is ${pickRandom(actionWords)}.`);

    playAudio('systemComplete');

    // ── Result calculation ──
    // Condition improvement: start + (1 - start) * 0.70
    const startCondition = instanceState.condition ?? 0.2;
    const newCondition   = parseFloat(
      (startCondition + (1.0 - startCondition) * 0.70).toFixed(2)
    );

    // Average combo multiplier across all clicks
    const avgCombo = totalComboSamples > 0 ? totalComboSum / totalComboSamples : 1.0;
    const xpEarned = Math.round(baseXP * avgCombo);

    const logEntries = [
      `Removed ${partData.name} — ${totalClicks} clicks (avg combo x${avgCombo.toFixed(1)})`,
      `Condition: ${Math.round(startCondition * 100)}% → ${Math.round(newCondition * 100)}%`,
      `Wrench XP earned: +${xpEarned}`,
    ];

    // 1-second delay: let the player savour the completion flash
    setTimeout(() => {
      onComplete({ newCondition, xpEarned, logEntries });
    }, 1000);
  }


  // ════════════════════════════════════════════════════════════
  //  MAIN CLICK HANDLER
  // ════════════════════════════════════════════════════════════

  function processClick() {
    if (isComplete) return;

    const now = performance.now();

    // ── Hazard intercept ──
    if (inHazard) {
      hazardClicked = true;          // endHazard() will handle the FAIL path
      return;
    }

    clickCount++;
    clicksSinceHazard++;
    clicksSinceCritical++;
    clicksSinceFlavor++;

    // ── Rhythm check ──
    let inRhythm = false;
    if (lastClickTime > 0) {
      const delta = now - lastClickTime;
      inRhythm = Math.abs(delta - idealTempo) <= tolerance;
    }
    lastClickTime = now;

    if (inRhythm) {
      comboCount++;
    } else if (clickCount > 1) {
      // First click never penalised — no reference delta yet
      comboCount = 0;
    }

    // ── Effective multiplier (combo + possible critical bonus) ──
    const tier = getComboTier(comboCount);
    let effectiveMult = tier.multiplier;
    if (criticalBonus > 0) {
      effectiveMult += 0.5;
      criticalBonus--;
    }

    // Accumulate for avg combo XP calculation
    totalComboSum += effectiveMult;
    totalComboSamples++;

    // ── Progress ──
    progress = Math.min(1.0, progress + baseClickVal * effectiveMult);

    // ── Per-click feedback (non-negotiable per GDD §13 #4) ──
    animateTap();
    updateComboDisplay();
    updateProgressDisplay();

    // Sound: slightly randomised pitch each click
    playAudio('ratchet', { pitch: 0.88 + Math.random() * 0.28 });

    // ── Hazard check (variable interval 15–30 clicks) ──
    if (clicksSinceHazard >= nextHazardAt && !inHazard) {
      startHazard();
    }

    // ── Critical click check (variable interval 8–35 clicks) ──
    if (clicksSinceCritical >= nextCriticalAt) {
      triggerCritical();
    }

    // ── Flavor rotation (every 5–10 clicks) ──
    if (clicksSinceFlavor >= nextFlavorAt) {
      setFlavor(pickRandom(ALL_FLAVOR));
      nextFlavorAt      = randomInt(5, 10);
      clicksSinceFlavor = 0;
    }

    // ── Completion check ──
    if (progress >= 1.0) {
      completeWork();
    }
  }

  function handleClick(e) {
    e.preventDefault();
    processClick();
  }

  function handleTouch(e) {
    // Prevent double-tap zoom and ghost mouse events
    e.preventDefault();
    processClick();
  }

  tapTarget.addEventListener('click', handleClick);
  tapTarget.addEventListener('touchstart', handleTouch, { passive: false });


  // ── Initial render ───────────────────────────────────────────
  updateComboDisplay();
  updateProgressDisplay();
  // Seed flavor text without animation on first render
  setFlavor(pickRandom(ALL_FLAVOR), false);
}


// ════════════════════════════════════════════════════════════
//  LOCAL HELPERS
// ════════════════════════════════════════════════════════════

/**
 * Minimal element factory — keeps UI construction readable.
 * @param {string} tag
 * @param {object} [props]  - style (string), className, textContent, innerHTML, + any attr
 * @returns {HTMLElement}
 */
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
