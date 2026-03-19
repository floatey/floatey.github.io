// ════════════════════════════════════════════════════════════
//  mechanics/wrench.js — Wrench Work (Rhythm Tapper)
//
//  Usage:
//    startWrenchWork(partData, instanceState, container, onComplete,
//                   playerTools, skillLevel)
//
//  onComplete fires with: { newCondition, xpEarned, logEntries[], perfectRepair? }
//
//  playerTools shape:
//    impactWrench:           boolean
//    penetratingOil:         boolean  (true if charges > 0)
//    penetratingOilCharges:  number
//    consumeTool:            (toolId) => void
//
//  FILE LOCATION: game/js/mechanics/wrench.js
// ════════════════════════════════════════════════════════════

// FIX: correct relative path — this file lives one level below js/
import { randomInt, randomRange, pickRandom, clamp } from '../utils.js';

// ── One-time CSS injection ────────────────────────────────────
let _cssInjected = false;

function _injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;

  const style = document.createElement('style');
  style.id = 'wrench-mechanic-styles';
  style.textContent = `
    @keyframes ww-tap-press {
      0%   { transform: scale(1); }
      35%  { transform: scale(0.95); }
      100% { transform: scale(1); }
    }
    .ww-pressing {
      animation: ww-tap-press 120ms ease !important;
    }

    @keyframes ww-icon-bob {
      0%   { transform: translateY(0) rotate(0deg); }
      40%  { transform: translateY(-6px) rotate(-12deg); }
      100% { transform: translateY(0) rotate(0deg); }
    }
    .ww-icon-bob {
      animation: ww-icon-bob 140ms ease !important;
    }

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

    @keyframes ww-success-flash {
      0%   { box-shadow: 0 0 0 rgba(34,197,94,0); }
      30%  { box-shadow: 0 0 24px rgba(34,197,94,0.55); }
      100% { box-shadow: 0 0 0 rgba(34,197,94,0); }
    }
    .ww-success-flash {
      animation: ww-success-flash 600ms ease !important;
    }

    @keyframes ww-momentum-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.55; }
    }
    .ww-momentum-pulsing {
      animation: ww-momentum-pulse 700ms ease infinite;
    }

    @keyframes ww-complete-sweep {
      0%   { background: var(--condition-good); }
      40%  { background: #10b981; filter: brightness(1.6); }
      100% { background: var(--condition-excellent); filter: brightness(1); box-shadow: 0 0 18px rgba(16,185,129,0.4); }
    }
    .ww-complete-bar {
      animation: ww-complete-sweep 700ms ease forwards !important;
    }

    @keyframes ww-flavor-in {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .ww-flavor-in {
      animation: ww-flavor-in 200ms ease !important;
    }

    @keyframes ww-gold-shimmer {
      0%, 100% { box-shadow: 0 0 10px rgba(245,158,11,0.25); }
      50%       { box-shadow: 0 0 28px rgba(245,158,11,0.55); }
    }
    .ww-gold-shimmer {
      animation: ww-gold-shimmer 900ms ease infinite;
    }

    /* ── Impact Wrench burst flash ── */
    @keyframes ww-impact-burst {
      0%   { box-shadow: 0 0 0   rgba(245,158,11,0); filter: brightness(1); }
      20%  { box-shadow: 0 0 36px rgba(245,158,11,0.9); filter: brightness(2); }
      65%  { box-shadow: 0 0 18px rgba(245,158,11,0.45); filter: brightness(1.3); }
      100% { box-shadow: 0 0 0   rgba(245,158,11,0); filter: brightness(1); }
    }
    .ww-impact-burst {
      animation: ww-impact-burst 500ms ease !important;
    }

    /* ── Penetrating Oil applied flash ── */
    @keyframes ww-oil-applied {
      0%   { border-color: var(--border); }
      30%  { border-color: #a3e635; box-shadow: 0 0 18px rgba(163,230,53,0.55); }
      100% { border-color: var(--border); }
    }
    .ww-oil-applied {
      animation: ww-oil-applied 700ms ease !important;
    }

    /* ── Perfect Repair gold flash ── */
    @keyframes ww-perfect-repair {
      0%   { box-shadow: 0 0 0   rgba(245,158,11,0); filter: brightness(1); }
      20%  { box-shadow: 0 0 50px rgba(245,158,11,1.0); filter: brightness(2.5); }
      70%  { box-shadow: 0 0 28px rgba(245,158,11,0.6); filter: brightness(1.5); }
      100% { box-shadow: 0 0 0   rgba(245,158,11,0); filter: brightness(1); }
    }
    .ww-perfect-repair-flash {
      animation: ww-perfect-repair 900ms ease !important;
    }

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
 * @param {Function} onComplete     - Called with { newCondition, xpEarned, logEntries[], perfectRepair? }
 * @param {object}   playerTools    - { impactWrench, penetratingOil, penetratingOilCharges, consumeTool }
 * @param {number}   skillLevel     - Player's wrench skill level (1–20)
 */
export function startWrenchWork(
  partData,
  instanceState,
  container,
  onComplete,
  playerTools = {},
  skillLevel  = 1,
) {
  _injectCSS();

  // ── Tool flags ───────────────────────────────────────────────
  const hasImpactWrench   = !!(playerTools.impactWrench   ?? playerTools.impact_wrench);
  const oilCharges        = playerTools.penetratingOilCharges ?? 0;
  const hasPenetratingOil = oilCharges > 0;
  const consumeTool       = typeof playerTools.consumeTool === 'function'
    ? playerTools.consumeTool
    : () => {};

  // ── Skill bonuses ────────────────────────────────────────────
  // Tier: 1-5 → 0%, 6-10 → 10%, 11-15 → 20%, 16-20 → 30%
  const skillBonusPct = skillLevel <= 5  ? 0
                      : skillLevel <= 10 ? 10
                      : skillLevel <= 15 ? 20
                      :                   30;

  // ── Derived constants ────────────────────────────────────────
  const difficulty   = clamp(partData.difficulty ?? 0.5, 0, 1);
  let totalClicks    = Math.round(30 + difficulty * 70);   // 37 – 100
  const idealTempo   = 200 + (1.0 - difficulty) * 300;    // 230 – 470 ms
  const tolerance    = 80 + skillLevel * 2;               // ±ms: wider with skill
  const baseXP       = 10 + difficulty * 40;              // 14 – 46
  // Base click value boosted by skill efficiency bonus
  const baseClickVal = (1.0 / totalClicks) * (1 + skillBonusPct / 100);
  // Hazard warning duration: 1.5s base + 50ms per skill level
  const hazardDuration = 1500 + skillLevel * 50;

  // Penetrating oil flag — tracks if oil has been used this session
  let oilApplied = false;

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

  const IMPACT_WRENCH_FLAVOR = [
    '⚡ Impact burst!',
    '⚡ Braaap — 5× progress!',
    '⚡ Impact doing its thing.',
  ];

  const OIL_FLAVOR = [
    '🫗 Penetrating oil soaking in — resistance reduced.',
    '🫗 Oil applied. This one\'s giving now.',
  ];

  // ── Mutable state ────────────────────────────────────────────
  let progress        = 0;
  let clickCount      = 0;
  let lastClickTime   = 0;

  let comboCount      = 0;
  let totalComboSum   = 0;
  let totalComboSamples = 0;

  let criticalBonus   = 0;

  let inHazard        = false;
  let hazardClicked   = false;
  let hazardTimer     = null;
  let nextHazardAt    = randomInt(15, 30);
  let clicksSinceHazard = 0;

  let nextCriticalAt  = randomInt(8, 35);
  let clicksSinceCritical = 0;

  let nextFlavorAt    = randomInt(5, 10);
  let clicksSinceFlavor = 0;

  // Impact wrench: fires every 15th click
  let impactClickTracker = 0;

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

  container.style.userSelect = 'none';
  container.style.webkitUserSelect = 'none';

  const resistance = getResistance();

  // ── Header ───────────────────────────────────────────────────
  const headerRow = _el('div', {
    style: 'display:flex; justify-content:space-between; align-items:flex-start; gap:8px;',
  });

  const titleBlock = _el('div', {});
  titleBlock.appendChild(_el('div', {
    style: 'font-size:15px; font-weight:700; color:var(--text-primary,#fff); margin-bottom:2px;',
    textContent: `Wrenching: ${partData.name ?? 'Component'}`,
  }));
  titleBlock.appendChild(_el('div', {
    style: `font-family:var(--font-data,monospace); font-size:11px; color:${resistance.color}; letter-spacing:0.06em;`,
    textContent: `Resistance: ${resistance.label}`,
  }));
  headerRow.appendChild(titleBlock);

  // Skill / tool badges
  const badgeCol = _el('div', { style: 'display:flex; flex-direction:column; gap:4px; align-items:flex-end;' });
  if (skillLevel > 1) {
    const skillBadge = _el('span', {
      style: 'font-family:var(--font-data,monospace); font-size:10px; padding:2px 7px; border-radius:3px; background:rgba(78,127,255,0.12); color:#4e7fff; border:1px solid #4e7fff44;',
      textContent: `Lv.${skillLevel} ${skillBonusPct > 0 ? `+${skillBonusPct}%` : ''}`,
    });
    badgeCol.appendChild(skillBadge);
  }
  if (hasImpactWrench) {
    badgeCol.appendChild(_el('span', {
      style: 'font-family:var(--font-data,monospace); font-size:10px; padding:2px 7px; border-radius:3px; background:rgba(245,158,11,0.12); color:#f59e0b; border:1px solid #f59e0b44;',
      textContent: '⚡ Impact Wrench',
    }));
  }
  headerRow.appendChild(badgeCol);
  container.appendChild(headerRow);

  // ── Progress bar ─────────────────────────────────────────────
  const progressWrap = _el('div', {
    style: 'display:flex; flex-direction:column; gap:4px;',
  });

  const progressLabelRow = _el('div', {
    style: 'display:flex; justify-content:space-between; font-family:var(--font-data,monospace); font-size:11px; color:var(--text-secondary,#aaa);',
  });
  const progressPctEl = _el('span', { textContent: '0%' });
  const progressClicksEl = _el('span', { textContent: `0 / ${totalClicks} clicks` });
  progressLabelRow.appendChild(progressPctEl);
  progressLabelRow.appendChild(progressClicksEl);

  const progressTrack = _el('div', {
    style: [
      'width: 100%',
      'height: 14px',
      'border-radius: 7px',
      'background: var(--bg-elevated,#1a1a1a)',
      'border: 1px solid var(--border,#333)',
      'overflow: hidden',
    ].join(';'),
  });

  const progressBar = _el('div', {
    style: [
      'height: 100%',
      'width: 0%',
      'border-radius: 7px',
      'background: var(--condition-good,#22c55e)',
      'transition: width 80ms linear',
    ].join(';'),
  });

  progressTrack.appendChild(progressBar);
  progressWrap.appendChild(progressLabelRow);
  progressWrap.appendChild(progressTrack);
  container.appendChild(progressWrap);

  // ── Combo display ────────────────────────────────────────────
  const comboRow = _el('div', {
    style: 'display:flex; justify-content:space-between; align-items:center;',
  });

  const comboEl = _el('div', {
    style: 'font-family:var(--font-data,monospace); font-size:13px; color:var(--text-muted,#888);',
    textContent: 'COMBO x1.0',
  });
  const tempoEl = _el('div', {
    style: 'font-family:var(--font-data,monospace); font-size:11px; color:var(--text-muted,#666);',
    textContent: `Tempo: ${Math.round(idealTempo)}ms ±${tolerance}ms`,
  });
  comboRow.appendChild(comboEl);
  comboRow.appendChild(tempoEl);
  container.appendChild(comboRow);

  // ── Tap target ───────────────────────────────────────────────
  const tapTarget = _el('div', {
    className: 'ww-tap-target',
    style: [
      'display: flex',
      'flex-direction: column',
      'align-items: center',
      'justify-content: center',
      'gap: 8px',
      'padding: 28px 16px',
      'border-radius: 12px',
      'border: 2px solid var(--border,#333)',
      'background: var(--bg-card,#141414)',
      'cursor: pointer',
      'transition: border-color 200ms ease',
      'min-height: 130px',
    ].join(';'),
    tabIndex: '0',
  });

  const tapIcon  = _el('div', { style: 'font-size:36px; line-height:1;', textContent: '🔧' });
  const tapLabel = _el('div', {
    style: 'font-family:var(--font-data,monospace); font-size:14px; font-weight:700; letter-spacing:0.08em; color:var(--text-primary,#fff);',
    textContent: 'CLICK',
  });

  tapTarget.appendChild(tapIcon);
  tapTarget.appendChild(tapLabel);
  container.appendChild(tapTarget);

  // ── Penetrating Oil button (only if player has charges) ──────
  let oilBtn = null;
  if (hasPenetratingOil) {
    oilBtn = _el('button', {
      style: [
        'padding: 8px 14px',
        'font-family: var(--font-data,monospace)',
        'font-size: 12px',
        'font-weight: 700',
        'letter-spacing: 0.06em',
        'background: rgba(163,230,53,0.12)',
        'color: #a3e635',
        'border: 1px solid rgba(163,230,53,0.4)',
        'border-radius: 6px',
        'cursor: pointer',
        'transition: opacity 150ms ease',
        'align-self: flex-start',
      ].join(';'),
      textContent: `🫗 Use Penetrating Oil (${oilCharges} remaining)`,
    });

    oilBtn.addEventListener('click', applyPenetratingOil);
    container.appendChild(oilBtn);
  }

  // ── Flavor text ──────────────────────────────────────────────
  const flavorEl = _el('div', {
    style: [
      'font-style: italic',
      'font-size: 12px',
      'color: var(--text-muted,#777)',
      'text-align: center',
      'min-height: 1.4em',
      'padding: 0 4px',
    ].join(';'),
  });
  container.appendChild(flavorEl);


  // ════════════════════════════════════════════════════════════
  //  UI UPDATE HELPERS
  // ════════════════════════════════════════════════════════════

  function updateProgressDisplay() {
    const pct = Math.min(100, Math.round(progress * 100));
    progressBar.style.width   = `${pct}%`;
    progressPctEl.textContent = `${pct}%`;
    progressClicksEl.textContent = `${clickCount} / ${totalClicks} clicks`;
  }

  function updateComboDisplay() {
    const tier = getComboTier(comboCount);
    comboEl.textContent = `COMBO ${tier.label}`;
    comboEl.style.color = tier.color;
  }

  function setFlavor(text, animate = true) {
    flavorEl.textContent = `"${text}"`;
    if (animate) {
      flavorEl.classList.remove('ww-flavor-in');
      void flavorEl.offsetWidth;
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

  // FIX: correct audio sound names to match the audio.js registry
  function playAudio(name, opts = {}) {
    try {
      const am = window.audioManager;
      if (!am) return;
      if (name === 'ratchet') {
        am.playRatchet();
      } else {
        am.play(name, opts);
      }
    } catch (_) { /* audio not yet loaded */ }
  }


  // ════════════════════════════════════════════════════════════
  //  GAME SYSTEMS
  // ════════════════════════════════════════════════════════════

  function animateTap() {
    _triggerAnimation(tapTarget, 'ww-pressing');
    _triggerAnimation(tapIcon, 'ww-icon-bob');
  }

  function triggerCritical() {
    const multiplier = randomRange(3, 5);
    const jump = baseClickVal * multiplier;
    progress = Math.min(1.0, progress + jump);

    _triggerAnimation(progressBar, 'ww-critical-pop');
    setFlavor(pickRandom(CRITICAL_FLAVOR));
    criticalBonus = 3;

    playAudio('impact');

    nextCriticalAt      = randomInt(8, 35);
    clicksSinceCritical = 0;

    updateProgressDisplay();
  }

  /**
   * Impact Wrench: fires on every 15th click as an automatic 5× progress burst.
   * No player input required — the wrench does the work.
   */
  function triggerImpactBurst() {
    const jump = baseClickVal * 5;
    progress = Math.min(1.0, progress + jump);

    _triggerAnimation(tapTarget, 'ww-impact-burst');
    setFlavor(pickRandom(IMPACT_WRENCH_FLAVOR));

    playAudio('impact');
    updateProgressDisplay();
  }

  /**
   * Penetrating Oil: reduces total clicks needed by 30%.
   * Triggered once per repair by the [Use Oil] button.
   * Deducts one charge from state via consumeTool callback.
   */
  function applyPenetratingOil() {
    if (oilApplied || isComplete) return;
    oilApplied = true;

    // -30% resistance: the remaining progress gap shrinks by 30%
    const remaining = 1.0 - progress;
    progress = Math.min(1.0, progress + remaining * 0.30);

    // Consume charge via workbench callback
    consumeTool('penetrating_oil');

    // Hide the oil button (used up)
    if (oilBtn) {
      oilBtn.style.opacity = '0.4';
      oilBtn.disabled = true;
      oilBtn.textContent = '🫗 Oil Applied';
    }

    _triggerAnimation(tapTarget, 'ww-oil-applied');
    setFlavor(pickRandom(OIL_FLAVOR));
    updateProgressDisplay();

    if (progress >= 1.0) {
      completeWork();
    }
  }

  function startHazard() {
    inHazard      = true;
    hazardClicked = false;

    tapLabel.textContent = '⚠️  STUCK — HOLD';
    tapLabel.style.color = '#ef4444';
    tapIcon.textContent  = '🛑';
    tapTarget.classList.add('ww-hazard-active');

    playAudio('stuck');

    // hazardDuration is skill-scaled: longer warning for higher skill players
    hazardTimer = setTimeout(() => endHazard(!hazardClicked), hazardDuration);
  }

  function endHazard(success) {
    inHazard = false;
    clearTimeout(hazardTimer);

    tapTarget.classList.remove('ww-hazard-active');
    tapLabel.style.color = '';
    tapIcon.textContent  = '🔧';

    if (success) {
      tapLabel.textContent = 'CLICK';
      _triggerAnimation(tapTarget, 'ww-success-flash', 650);
      setFlavor(pickRandom(HAZARD_SUCCESS));
      setTimeout(updateComboDisplay, 650);
    } else {
      comboCount = 0;
      progress = Math.max(0, progress - 0.05);

      _triggerAnimation(progressBar, 'ww-shake');
      _triggerAnimation(progressBar, 'ww-loss');

      tapLabel.textContent = 'CLICK';
      setFlavor(pickRandom(HAZARD_FAIL));

      updateComboDisplay();
      updateProgressDisplay();
    }

    nextHazardAt      = randomInt(15, 30);
    clicksSinceHazard = 0;
  }

  function completeWork() {
    isComplete = true;

    tapTarget.removeEventListener('click', handleClick);
    tapTarget.removeEventListener('touchstart', handleTouch);

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

    playAudio('system_complete');

    // ── Result calculation ──
    const startCondition = instanceState.condition ?? 0.2;
    let   newCondition   = parseFloat(
      (startCondition + (1.0 - startCondition) * 0.70).toFixed(2)
    );

    const avgCombo = totalComboSamples > 0 ? totalComboSum / totalComboSamples : 1.0;
    let   xpEarned = Math.round(baseXP * avgCombo);

    // ── Perfect Repair proc (level 16+, 5% chance) ──────────────
    let perfectRepair = false;
    if (skillLevel >= 16 && Math.random() < 0.05) {
      perfectRepair = true;
      newCondition  = 1.00;
      xpEarned      = xpEarned * 2;   // double XP

      // Gold flash on the container
      setTimeout(() => {
        _triggerAnimation(tapTarget, 'ww-perfect-repair-flash', 900);
        setFlavor('⚡ PERFECT REPAIR — Restored to factory spec!');
        tapLabel.textContent = '⚡ PERFECT';
        tapLabel.style.color = '#f59e0b';
      }, 200);
    }

    const logEntries = [
      `Removed ${partData.name} — ${clickCount} clicks (avg combo x${avgCombo.toFixed(1)})`,
      `Condition: ${Math.round(startCondition * 100)}% → ${Math.round(newCondition * 100)}%`,
      `Wrench XP earned: +${xpEarned}`,
    ];

    if (oilApplied) {
      logEntries.push('Penetrating oil used — resistance reduced by 30%.');
    }
    if (perfectRepair) {
      logEntries.push('⚡ PERFECT REPAIR proc! Restored to factory spec! (2× XP)');
    }

    // 1-second delay so the player sees the completion flash
    setTimeout(() => {
      onComplete({ newCondition, xpEarned, logEntries, perfectRepair });
    }, perfectRepair ? 1400 : 1000);
  }


  // ════════════════════════════════════════════════════════════
  //  MAIN CLICK HANDLER
  // ════════════════════════════════════════════════════════════

  function processClick() {
    if (isComplete) return;

    const now = performance.now();

    if (inHazard) {
      hazardClicked = true;
      return;
    }

    clickCount++;
    clicksSinceHazard++;
    clicksSinceCritical++;
    clicksSinceFlavor++;

    // ── Impact Wrench: auto burst every 15th click ─────────────
    if (hasImpactWrench) {
      impactClickTracker++;
      if (impactClickTracker >= 15) {
        impactClickTracker = 0;
        triggerImpactBurst();
        if (progress >= 1.0) {
          completeWork();
          return;
        }
      }
    }

    let inRhythm = false;
    if (lastClickTime > 0) {
      const delta = now - lastClickTime;
      inRhythm = Math.abs(delta - idealTempo) <= tolerance;
    }
    lastClickTime = now;

    if (inRhythm) {
      comboCount++;
    } else if (clickCount > 1) {
      comboCount = 0;
    }

    const tier = getComboTier(comboCount);
    let effectiveMult = tier.multiplier;
    if (criticalBonus > 0) {
      effectiveMult += 0.5;
      criticalBonus--;
    }

    totalComboSum += effectiveMult;
    totalComboSamples++;

    progress = Math.min(1.0, progress + baseClickVal * effectiveMult);

    animateTap();
    updateComboDisplay();
    updateProgressDisplay();

    playAudio('ratchet');

    if (clicksSinceHazard >= nextHazardAt && !inHazard) {
      startHazard();
    }

    if (clicksSinceCritical >= nextCriticalAt) {
      triggerCritical();
    }

    if (clicksSinceFlavor >= nextFlavorAt) {
      setFlavor(pickRandom(ALL_FLAVOR));
      nextFlavorAt      = randomInt(5, 10);
      clicksSinceFlavor = 0;
    }

    if (progress >= 1.0) {
      completeWork();
    }
  }

  function handleClick(e) {
    e.preventDefault();
    processClick();
  }

  function handleTouch(e) {
    e.preventDefault();
    processClick();
  }

  tapTarget.addEventListener('click', handleClick);
  tapTarget.addEventListener('touchstart', handleTouch, { passive: false });

  // ── Initial render ───────────────────────────────────────────
  updateComboDisplay();
  updateProgressDisplay();
  setFlavor(pickRandom(ALL_FLAVOR), false);
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
