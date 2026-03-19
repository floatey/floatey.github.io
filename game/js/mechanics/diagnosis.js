// ════════════════════════════════════════════════════════════
//  mechanics/diagnosis.js — Diagnosis (Investigation Puzzle)
//
//  Usage:
//    startDiagnosis(scenario, vehicleParts, container, onComplete, playerTools, skillLevel)
//
//  onComplete fires with:
//    { correctPartId, wasCorrect, yenPenalty, xpEarned, logEntries, revealsScenario }
//
//  vehicleParts: the vehicle's full part instance data. If enriched by workbench.js
//  with template fields (name, replaceCost), those will be used; otherwise the
//  module falls back to ID-based humanization and a minimum yen penalty.
//
//  FILE LOCATION: game/js/mechanics/diagnosis.js
// ════════════════════════════════════════════════════════════

import { pickRandom } from '../utils.js';

// ── One-time CSS injection ────────────────────────────────────
let _cssInjected = false;

function _injectCSS() {
  if (_cssInjected) return;
  _cssInjected = true;

  const style = document.createElement('style');
  style.id = 'diagnosis-mechanic-styles';
  style.textContent = `

    /* ── Card flip reveal for tool clues ─────────────── */
    @keyframes dx-flip-in {
      0%   { transform: rotateY(90deg); opacity: 0; }
      100% { transform: rotateY(0deg);  opacity: 1; }
    }
    .dx-flip-in {
      animation: dx-flip-in 340ms cubic-bezier(0.22,0.61,0.36,1) forwards;
    }

    /* ── Correct option green pop ─────────────────────── */
    @keyframes dx-correct-pop {
      0%   { transform: scale(1);    }
      35%  { transform: scale(1.03); }
      100% { transform: scale(1);    }
    }
    .dx-option-correct-anim {
      animation: dx-correct-pop 420ms ease forwards;
      border-color: #22c55e !important;
      background-color: rgba(34,197,94,0.12) !important;
    }

    /* ── Wrong option red shake ───────────────────────── */
    @keyframes dx-wrong-shake {
      0%, 100% { transform: translateX(0); }
      18%, 54%, 82% { transform: translateX(-7px); }
      36%, 70%      { transform: translateX(7px); }
    }
    .dx-option-wrong-anim {
      animation: dx-wrong-shake 400ms ease;
      border-color: #ef4444 !important;
      background-color: rgba(239,68,68,0.12) !important;
    }

    /* ── Mechanic's Intuition glow on correct option ──── */
    @keyframes dx-intuition-pulse {
      0%, 100% {
        box-shadow:  0 0 0 1px rgba(251,191,36,0.15);
        border-color: rgba(251,191,36,0.28);
      }
      50% {
        box-shadow:  0 0 14px 2px rgba(251,191,36,0.38);
        border-color: rgba(251,191,36,0.72);
      }
    }
    .dx-intuition-glow {
      animation: dx-intuition-pulse 2.2s ease-in-out infinite;
      /* Subtly pulsing amber border — not text, not auto-solve */
    }

    /* ── Result block fade in ─────────────────────────── */
    @keyframes dx-result-in {
      from { opacity: 0; transform: translateY(7px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .dx-result-in {
      animation: dx-result-in 280ms ease forwards;
    }

    /* ── Checkmark pop ────────────────────────────────── */
    @keyframes dx-checkmark-pop {
      0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
      55%  { transform: scale(1.4) rotate(6deg);  opacity: 1; }
      100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
    }
    .dx-checkmark {
      display: inline-block;
      animation: dx-checkmark-pop 380ms cubic-bezier(0.34,1.56,0.64,1) forwards;
    }

    /* ── X-mark pop ───────────────────────────────────── */
    @keyframes dx-xmark-pop {
      0%   { transform: scale(0) rotate(20deg); opacity: 0; }
      55%  { transform: scale(1.4) rotate(-6deg); opacity: 1; }
      100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
    }
    .dx-xmark {
      display: inline-block;
      animation: dx-xmark-pop 320ms cubic-bezier(0.34,1.56,0.64,1) forwards;
    }

    /* ── Flavor / status text fade ────────────────────── */
    @keyframes dx-flavor-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .dx-flavor-in {
      animation: dx-flavor-in 220ms ease forwards;
    }

    /* ── Multi-layer reveal banner ────────────────────── */
    @keyframes dx-layer-reveal {
      0%   { opacity: 0; transform: scale(0.96); }
      100% { opacity: 1; transform: scale(1); }
    }
    .dx-layer-reveal {
      animation: dx-layer-reveal 380ms cubic-bezier(0.22,0.61,0.36,1) forwards;
    }

    /* ── Option card base + states ────────────────────── */
    .dx-option-card {
      cursor: pointer;
      transition: border-color 140ms ease, background-color 140ms ease;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
    }
    .dx-option-card:hover:not(.dx-eliminated) {
      border-color: var(--accent, #60a5fa) !important;
      background-color: rgba(96,165,250,0.07) !important;
    }
    .dx-option-card.dx-selected {
      border-color: var(--accent, #60a5fa) !important;
      background-color: rgba(96,165,250,0.10) !important;
    }
    .dx-option-card.dx-eliminated {
      cursor: not-allowed;
      opacity: 0.32;
      pointer-events: none;
      border-color: var(--border, #2a2a2a) !important;
      background-color: transparent !important;
    }

    /* ── Clue card states ─────────────────────────────── */
    .dx-clue-card {
      transition: border-color 200ms ease, opacity 200ms ease;
    }
    .dx-clue-revealed {
      border-color: rgba(34,197,94,0.45) !important;
    }
    .dx-clue-locked {
      opacity: 0.72;
    }

    /* ── Unlock button ────────────────────────────────── */
    .dx-unlock-btn {
      cursor: pointer;
      transition: opacity 120ms ease, transform 80ms ease;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      border: none;
      outline: none;
    }
    .dx-unlock-btn:hover { opacity: 0.80; }
    .dx-unlock-btn:active { transform: scale(0.96); }

    /* ── Submit button ────────────────────────────────── */
    .dx-submit-btn {
      cursor: pointer;
      transition: opacity 140ms ease, transform 80ms ease, filter 140ms ease;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      border: none;
      outline: none;
    }
    .dx-submit-btn:hover:not(:disabled) { opacity: 0.87; }
    .dx-submit-btn:active:not(:disabled) { transform: scale(0.97); }
    .dx-submit-btn:disabled {
      cursor: not-allowed;
      opacity: 0.30;
      filter: grayscale(0.4);
    }

    /* ── Mobile: stack clues above options ────────────── */
    @media (max-width: 580px) {
      .dx-two-col {
        flex-direction: column !important;
      }
      .dx-clue-col,
      .dx-options-col {
        width: 100% !important;
        min-width: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);
}


// ════════════════════════════════════════════════════════════
//  MODULE-LEVEL CONSTANTS
// ════════════════════════════════════════════════════════════

const FLAVOR_POOL = [
  "Something's not right. Think it through.",
  "Don't guess. Read the clues.",
  "The symptoms tell a story.",
  "What changed? What stayed the same?",
  "Process of elimination.",
  "Every clue matters. Use what you've got.",
  "Don't throw parts at it. Diagnose it.",
  "Look at what it's doing. Then look at what it's not doing.",
];

/** Tool clue definitions — keys must match scenario.clues object */
const TOOL_DEFS = [
  {
    clueKey: 'multimeter',
    label:   'Multimeter',
    // Support both camelCase and common alt spellings from playerTools
    toolIds: ['multimeter'],
  },
  {
    clueKey: 'compressionTester',
    label:   'Compression Tester',
    toolIds: ['compressionTester', 'compression_tester', 'compressiontester'],
  },
  {
    clueKey: 'boostLeakTester',
    label:   'Boost Leak Tester',
    toolIds: ['boostLeakTester', 'boost_leak_tester', 'boostleaktester'],
  },
];

const FREE_CLUE_TAGS = [
  '[VISUAL CHECK]',
  '[SCAN TOOL]',
  '[OBSERVATION]',
  '[LISTEN]',
  '[DATA]',
];


// ════════════════════════════════════════════════════════════
//  PURE HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════

/**
 * Convert a snake_case part ID to a human-readable name.
 * Used when vehicleParts does not carry template 'name' data.
 * e.g. "ae86_engine_iacv" → "Engine Iacv"
 */
function _humanizeId(partId) {
  const segments = String(partId).split('_');
  // Heuristic: if first segment looks like a chassis code (short, all alpha-num),
  // skip it; otherwise keep all segments.
  const isChassisPrefix = segments.length > 1 && segments[0].length <= 5 && /^[a-z0-9]+$/i.test(segments[0]);
  const relevant = isChassisPrefix ? segments.slice(1) : segments;
  return relevant
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Resolve a display name for a part, preferring vehicleParts enriched data. */
function _getPartName(partId, vehicleParts) {
  const inst = vehicleParts?.[partId];
  if (inst?.name) return inst.name;
  if (inst?.template?.name) return inst.template.name;
  return _humanizeId(partId);
}

/**
 * Resolve the replacement cost of a wrong-guess part.
 * Workbench.js should ideally merge template data into vehicleParts so that
 * vehicleParts[partId].replaceCost (or .template.replaceCost) is available.
 * Falls back to 50 ¥ minimum if not found.
 */
function _getPartCost(partId, vehicleParts) {
  const inst = vehicleParts?.[partId];
  if (typeof inst?.replaceCost === 'number') return inst.replaceCost;
  if (typeof inst?.template?.replaceCost === 'number') return inst.template.replaceCost;
  return 50;
}

/** Returns true if the player owns a given tool, checking all known ID variants. */
function _hasTool(playerTools, toolDef) {
  if (!playerTools) return false;
  return toolDef.toolIds.some(id => !!playerTools[id]);
}

/** Fisher-Yates shuffle — returns a new array. */
function _shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Audio helper — tolerates missing audioManager. */
function _playAudio(name) {
  try { window.audioManager?.play(name); } catch (_) { /* not ready */ }
}

/** Re-animate flavor text with a fresh fade-in. */
function _updateFlavor(el, text) {
  el.classList.remove('dx-flavor-in');
  void el.offsetWidth; // reflow
  el.textContent = `"${text}"`;
  el.classList.add('dx-flavor-in');
  el.addEventListener('animationend', () => el.classList.remove('dx-flavor-in'), { once: true });
}

/** Trigger a CSS class animation, cleaning it up after. */
function _triggerAnim(el, cls, durationMs) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  if (durationMs) {
    setTimeout(() => el.classList.remove(cls), durationMs);
  } else {
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  }
}


// ════════════════════════════════════════════════════════════
//  DOM BUILDER HELPERS
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

/** Column header label (small caps, muted). */
function _colLabel(text) {
  return _el('div', {
    style: [
      'font-size: 0.70rem',
      'letter-spacing: 0.14em',
      'color: var(--text-muted, #777)',
      'text-transform: uppercase',
      'margin-bottom: 4px',
    ].join(';'),
    textContent: text,
  });
}

/** Horizontal divider line. */
function _divider() {
  return _el('hr', {
    style: 'border:none; border-top:1px solid var(--border,#222); margin:2px 0;',
  });
}


// ════════════════════════════════════════════════════════════
//  CLUE CARD BUILDERS
// ════════════════════════════════════════════════════════════

/**
 * Build a free clue card — always visible, no unlock required.
 * @param {string} clueText
 * @param {string} tag — e.g. '[VISUAL CHECK]'
 */
function _buildFreeClueCard(clueText, tag) {
  const card = _el('div', {
    className: 'dx-clue-card',
    style: [
      'background: var(--card-bg, #141414)',
      'border: 1px solid var(--border, #2a2a2a)',
      'border-radius: 6px',
      'padding: 10px 13px',
      'display: flex',
      'flex-direction: column',
      'gap: 5px',
    ].join(';'),
  });

  const tagEl = _el('span', {
    style: [
      'font-size: 0.68rem',
      'letter-spacing: 0.12em',
      'color: var(--text-muted, #777)',
      'text-transform: uppercase',
    ].join(';'),
    textContent: tag,
  });

  const textEl = _el('p', {
    style: [
      'margin: 0',
      'font-size: 0.86rem',
      'color: var(--text-primary, #eee)',
      'line-height: 1.4',
    ].join(';'),
    textContent: clueText,
  });

  card.appendChild(tagEl);
  card.appendChild(textEl);
  return card;
}

/**
 * Build a tool-gated clue card.
 * - If player owns the tool → unlockable with a flip animation.
 * - If player lacks the tool → shows "Requires {Tool}" in muted text, stays locked.
 * Returns the card element (appends to parentCol, also registers click).
 */
function _buildToolClueCard(toolDef, clueText, owned, revealedSet) {
  const card = _el('div', {
    className: 'dx-clue-card dx-clue-locked',
    style: [
      'background: var(--card-bg, #141414)',
      'border: 1px solid var(--border, #2a2a2a)',
      'border-radius: 6px',
      'padding: 10px 13px',
      'display: flex',
      'flex-direction: column',
      'gap: 6px',
    ].join(';'),
  });

  // Lock header row
  const lockRow = _el('div', {
    style: 'display:flex; align-items:center; gap:7px;',
  });
  const lockIcon = _el('span', { textContent: '🔒', style: 'font-size:0.95rem;' });
  const toolName = _el('span', {
    style: [
      'font-size: 0.80rem',
      'font-weight: 600',
      'color: var(--text-secondary, #bbb)',
    ].join(';'),
    textContent: toolDef.label,
  });
  lockRow.appendChild(lockIcon);
  lockRow.appendChild(toolName);
  card.appendChild(lockRow);

  if (owned) {
    // ── Player owns the tool: show unlock button ──────────────
    const unlockBtn = _el('button', {
      className: 'dx-unlock-btn',
      style: [
        'display: inline-block',
        'padding: 5px 10px',
        'font-size: 0.76rem',
        'font-family: var(--font-ui, monospace)',
        'letter-spacing: 0.08em',
        'background: rgba(96,165,250,0.12)',
        'color: var(--accent, #60a5fa)',
        'border-radius: 4px',
        'align-self: flex-start',
        'cursor: pointer',
      ].join(';'),
      textContent: `Use ${toolDef.label}`,
    });
    card.appendChild(unlockBtn);

    unlockBtn.addEventListener('click', () => {
      // Already revealed → no-op
      if (revealedSet.has(toolDef.clueKey)) return;
      revealedSet.add(toolDef.clueKey);

      // Remove lock UI
      lockIcon.textContent = '🔓';
      unlockBtn.remove();
      card.classList.remove('dx-clue-locked');
      card.classList.add('dx-clue-revealed');

      // Build revealed clue content
      const tagEl = _el('span', {
        style: [
          'font-size: 0.68rem',
          'letter-spacing: 0.12em',
          'color: #4ade80',
          'text-transform: uppercase',
        ].join(';'),
        textContent: `[${toolDef.label.toUpperCase()}]`,
      });

      const textEl = _el('p', {
        style: [
          'margin: 0',
          'font-size: 0.86rem',
          'color: var(--text-primary, #eee)',
          'line-height: 1.4',
        ].join(';'),
        textContent: clueText,
      });

      const clueBody = _el('div', {
        className: 'dx-flip-in',
        style: 'display:flex; flex-direction:column; gap:4px;',
      });
      clueBody.appendChild(tagEl);
      clueBody.appendChild(textEl);
      card.appendChild(clueBody);
    });

  } else {
    // ── Player does NOT own the tool ─────────────────────────
    const requiresEl = _el('span', {
      style: [
        'font-size: 0.76rem',
        'color: var(--text-muted, #666)',
        'font-style: italic',
      ].join(';'),
      textContent: `Requires ${toolDef.label}`,
    });
    card.appendChild(requiresEl);
  }

  return card;
}

/**
 * Build the diagnostic tool inventory summary shown below the options.
 * Displays a ✓/○ per tool based on playerTools.
 */
function _buildToolInventory(playerTools) {
  const wrapper = _el('div', {
    style: [
      'margin-top: 6px',
      'display: flex',
      'flex-direction: column',
      'gap: 4px',
    ].join(';'),
  });

  const header = _el('div', {
    style: [
      'font-size: 0.68rem',
      'letter-spacing: 0.12em',
      'color: var(--text-muted, #777)',
      'text-transform: uppercase',
    ].join(';'),
    textContent: 'Diagnostic Tools:',
  });
  wrapper.appendChild(header);

  TOOL_DEFS.forEach(def => {
    const owned = _hasTool(playerTools, def);
    const row = _el('div', {
      style: 'display:flex; align-items:center; gap:6px; font-size:0.80rem;',
    });
    const icon = _el('span', {
      style: `color:${owned ? '#22c55e' : 'var(--text-muted,#666)'};`,
      textContent: owned ? '✓' : '○',
    });
    const label = _el('span', {
      style: `color:${owned ? 'var(--text-secondary,#ccc)' : 'var(--text-muted,#555)'};`,
      textContent: def.label,
    });
    row.appendChild(icon);
    row.appendChild(label);
    wrapper.appendChild(row);
  });

  return wrapper;
}


// ════════════════════════════════════════════════════════════
//  OPTION SELECTION HELPER
// ════════════════════════════════════════════════════════════

/**
 * Visually select one option and deselect all others.
 * Does not touch eliminated cards.
 */
function _selectOption(selectedId, optionCards, eliminatedSet) {
  for (const [partId, refs] of Object.entries(optionCards)) {
    if (eliminatedSet.has(partId)) continue;
    const isNowSelected = (partId === selectedId);
    refs.card.classList.toggle('dx-selected', isNowSelected);
    // Fill or clear the radio circle
    refs.radio.style.backgroundColor = isNowSelected
      ? 'var(--accent, #60a5fa)'
      : 'transparent';
    refs.radio.style.borderColor = isNowSelected
      ? 'var(--accent, #60a5fa)'
      : 'var(--text-muted, #888)';
  }
}


// ════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ════════════════════════════════════════════════════════════

/**
 * Render the Diagnosis mechanic into `container` and begin the interaction.
 *
 * @param {object}   scenario      - Diagnostic scenario object from the part tree JSON.
 * @param {object}   vehicleParts  - Vehicle part instance data (keyed by partId).
 *                                   If enriched by workbench with { name, replaceCost }
 *                                   per entry, those values are used; otherwise the
 *                                   module falls back to ID humanization and 50 ¥ minimum.
 * @param {Element}  container     - DOM element to render into.
 * @param {Function} onComplete    - Callback: { correctPartId, wasCorrect, yenPenalty,
 *                                   xpEarned, logEntries, revealsScenario }.
 * @param {object}   playerTools   - Map of owned tool IDs: { toolId: true }.
 * @param {number}   skillLevel    - Player's current diagnosis skill level (1–20).
 */
export function startDiagnosis(scenario, vehicleParts, container, onComplete, playerTools, skillLevel) {
  _injectCSS();

  // Accumulated results — shared across multi-layer scenarios
  const accumulated = {
    yenPenalty: 0,
    xpEarned:   0,
    logEntries: [],
  };

  _renderLayer(scenario, vehicleParts, container, playerTools, skillLevel, accumulated, onComplete, false);
}


// ════════════════════════════════════════════════════════════
//  SCENARIO LAYER RENDERER
//  Called once per diagnosis layer (including multi-layer chains).
// ════════════════════════════════════════════════════════════

function _renderLayer(
  scenario, vehicleParts, container, playerTools, skillLevel,
  accumulated, onComplete, isChainedLayer
) {
  // ── Clear container ──────────────────────────────────────────
  container.innerHTML = '';
  container.style.cssText = [
    'padding: 16px',
    'display: flex',
    'flex-direction: column',
    'gap: 14px',
    'max-width: 680px',
    'margin: 0 auto',
    'font-family: var(--font-ui, monospace)',
    'box-sizing: border-box',
  ].join(';');

  // ── Mutable interaction state ────────────────────────────────
  let selectedPartId = null;      // currently selected option
  let isFinished     = false;     // true after correct answer finalized
  let isProcessing   = false;     // true during wrong-answer animation window
  const eliminatedSet  = new Set();
  const revealedTools  = new Set();

  // ── Multimeter: auto-reveal one extra tool clue ──────────────
  // If player owns the Multimeter, one additional tool-gated clue is
  // pre-revealed at no cost (the Multimeter's own clue is excluded
  // to avoid redundancy — it reveals a *different* tool clue instead).
  if (_hasTool(playerTools, TOOL_DEFS.find(t => t.clueKey === 'multimeter'))) {
    const bonusDef = TOOL_DEFS.find(
      t => t.clueKey !== 'multimeter' && scenario.clues?.[t.clueKey] != null
    );
    if (bonusDef) revealedTools.add(bonusDef.clueKey);
  }

  // ── Derived constants ────────────────────────────────────────
  const useIntuition = (skillLevel ?? 0) >= 10;
  // XP: 20 base + 2 per extra wrong option (more distractors → harder)
  const xpForCorrect = 20 + Math.round((scenario.wrongOptions?.length ?? 2) * 2);

  // ── Shuffled options list ────────────────────────────────────
  const allOptionIds = _shuffle([
    scenario.correctDiagnosis,
    ...(scenario.wrongOptions ?? []),
  ]);


  // ════════════════════════════════════════════
  //  MULTI-LAYER INTRO BANNER
  // ════════════════════════════════════════════

  if (isChainedLayer) {
    const banner = _el('div', {
      className: 'dx-layer-reveal',
      style: [
        'background: rgba(251,191,36,0.08)',
        'border: 1px solid rgba(251,191,36,0.28)',
        'border-radius: 6px',
        'padding: 10px 14px',
        'color: #fbbf24',
        'font-size: 0.82rem',
        'font-weight: 600',
        'letter-spacing: 0.04em',
      ].join(';'),
      textContent: '⚠  Fixing that revealed another issue...',
    });
    container.appendChild(banner);
  }


  // ════════════════════════════════════════════
  //  HEADER — Symptom
  // ════════════════════════════════════════════

  const headerBlock = _el('div', { style: 'display:flex; flex-direction:column; gap:3px;' });

  headerBlock.appendChild(_el('div', {
    style: [
      'font-size: 0.68rem',
      'letter-spacing: 0.16em',
      'color: var(--text-muted, #777)',
      'text-transform: uppercase',
    ].join(';'),
    textContent: 'DIAGNOSIS',
  }));

  const symptomEl = _el('h2', {
    style: [
      'margin: 0',
      'font-size: 1.10rem',
      'font-weight: 700',
      'color: var(--text-primary, #f0f0f0)',
      'line-height: 1.35',
    ].join(';'),
    textContent: scenario.symptom,
  });

  headerBlock.appendChild(symptomEl);
  container.appendChild(headerBlock);
  container.appendChild(_divider());


  // ════════════════════════════════════════════
  //  TWO-COLUMN LAYOUT
  // ════════════════════════════════════════════

  const twoCol = _el('div', {
    className: 'dx-two-col',
    style: 'display:flex; gap:16px; align-items:flex-start;',
  });

  // ── Left column: Clues ────────────────────────────────────
  const clueCol = _el('div', {
    className: 'dx-clue-col',
    style: 'flex:1 1 0; min-width:0; display:flex; flex-direction:column; gap:9px;',
  });
  clueCol.appendChild(_colLabel('CLUES'));

  // Free clues
  const freeClues = scenario.clues?.free ?? [];
  freeClues.forEach((clueText, idx) => {
    const tag = FREE_CLUE_TAGS[idx % FREE_CLUE_TAGS.length];
    clueCol.appendChild(_buildFreeClueCard(clueText, tag));
  });

  // Tool-gated clues (skip if null for this scenario)
  TOOL_DEFS.forEach(def => {
    const clueText = scenario.clues?.[def.clueKey];
    if (clueText == null) return; // not applicable for this scenario
    const owned = _hasTool(playerTools, def);
    clueCol.appendChild(_buildToolClueCard(def, clueText, owned, revealedTools));
  });

  twoCol.appendChild(clueCol);

  // ── Right column: Options + Submit ───────────────────────
  const optionsCol = _el('div', {
    className: 'dx-options-col',
    style: 'flex:1 1 0; min-width:0; display:flex; flex-direction:column; gap:8px;',
  });
  optionsCol.appendChild(_colLabel('POSSIBLE CAUSES'));

  // Option cards
  const optionCards = {};  // partId → { card, radio, nameEl }

  allOptionIds.forEach(partId => {
    const partName  = _getPartName(partId, vehicleParts);
    const isCorrect = partId === scenario.correctDiagnosis;
    const showGlow  = useIntuition && isCorrect;

    const card = _el('div', {
      // Mechanic's Intuition: the correct card gets an amber pulse border
      // This is a VISUAL NUDGE only — not labeled, not auto-selected
      className: `dx-option-card${showGlow ? ' dx-intuition-glow' : ''}`,
      style: [
        'display: flex',
        'align-items: center',
        'gap: 10px',
        'padding: 10px 13px',
        'background: var(--card-bg, #141414)',
        'border: 1.5px solid var(--border, #2a2a2a)',
        'border-radius: 6px',
      ].join(';'),
    });

    const radio = _el('div', {
      style: [
        'width: 13px',
        'height: 13px',
        'border-radius: 50%',
        'border: 2px solid var(--text-muted, #888)',
        'flex-shrink: 0',
        'transition: background-color 130ms ease, border-color 130ms ease',
        'background-color: transparent',
      ].join(';'),
    });

    const nameEl = _el('span', {
      style: [
        'font-size: 0.88rem',
        'color: var(--text-primary, #eee)',
        'line-height: 1.3',
        'flex: 1',
      ].join(';'),
      textContent: partName,
    });

    card.appendChild(radio);
    card.appendChild(nameEl);

    optionCards[partId] = { card, radio, nameEl };

    card.addEventListener('click', () => {
      if (isFinished || isProcessing) return;
      if (eliminatedSet.has(partId)) return;  // Cannot re-select eliminated options

      selectedPartId = partId;
      _selectOption(selectedPartId, optionCards, eliminatedSet);
      submitBtn.disabled = false;
    });

    optionsCol.appendChild(card);
  });

  // Submit button
  const submitBtn = _el('button', {
    className: 'dx-submit-btn',
    style: [
      'width: 100%',
      'margin-top: 4px',
      'padding: 11px 16px',
      'background: var(--accent, #60a5fa)',
      'color: #000',
      'font-family: var(--font-ui, monospace)',
      'font-size: 0.80rem',
      'font-weight: 700',
      'letter-spacing: 0.12em',
      'text-transform: uppercase',
      'border-radius: 5px',
    ].join(';'),
    textContent: 'Submit Diagnosis',
  });
  submitBtn.disabled = true; // Cannot submit until an option is selected
  optionsCol.appendChild(submitBtn);

  // Tool inventory display
  optionsCol.appendChild(_buildToolInventory(playerTools));

  twoCol.appendChild(optionsCol);
  container.appendChild(twoCol);


  // ════════════════════════════════════════════
  //  FLAVOR TEXT
  // ════════════════════════════════════════════

  const flavorEl = _el('div', {
    style: [
      'font-style: italic',
      'color: var(--text-muted, #777)',
      'font-size: 0.80rem',
      'text-align: center',
      'padding: 2px 6px',
      'min-height: 1.2em',
    ].join(';'),
    textContent: `"${pickRandom(FLAVOR_POOL)}"`,
  });
  container.appendChild(flavorEl);


  // ════════════════════════════════════════════
  //  RESULT BLOCK (hidden until first attempt)
  // ════════════════════════════════════════════

  const resultEl = _el('div', {
    style: [
      'display: none',
      'border-radius: 6px',
      'padding: 11px 14px',
      'font-size: 0.86rem',
      'line-height: 1.45',
    ].join(';'),
  });
  container.appendChild(resultEl);

  function _showResult(html, isGood) {
    resultEl.innerHTML = html;
    resultEl.style.display = 'block';
    resultEl.style.background = isGood
      ? 'rgba(34,197,94,0.09)'
      : 'rgba(239,68,68,0.08)';
    resultEl.style.border = isGood
      ? '1px solid rgba(34,197,94,0.28)'
      : '1px solid rgba(239,68,68,0.22)';
    resultEl.style.color = isGood
      ? '#4ade80'
      : '#f87171';
    _triggerAnim(resultEl, 'dx-result-in');
  }


  // ════════════════════════════════════════════
  //  SUBMIT HANDLER
  // ════════════════════════════════════════════

  submitBtn.addEventListener('click', () => {
    if (isFinished || isProcessing) return;
    if (!selectedPartId) return;         // guard: cannot submit without selection
    if (submitBtn.disabled) return;

    const partId    = selectedPartId;
    const partName  = _getPartName(partId, vehicleParts);
    const isCorrect = (partId === scenario.correctDiagnosis);
    const refs      = optionCards[partId];

    if (isCorrect) {
      // ════════════════════════════════════
      //  CORRECT DIAGNOSIS
      // ════════════════════════════════════
      isFinished = true;
      submitBtn.disabled = true;

      _playAudio('aha');

      // Visual: green card + radio fill + checkmark icon
      refs.card.classList.remove('dx-selected', 'dx-intuition-glow');
      refs.card.classList.add('dx-option-correct-anim');
      refs.radio.style.backgroundColor = '#22c55e';
      refs.radio.style.borderColor     = '#22c55e';

      const checkEl = _el('span', {
        className: 'dx-checkmark',
        style: 'color:#22c55e; font-size:1.05rem; font-weight:900; margin-left:4px;',
        textContent: '✓',
      });
      refs.card.appendChild(checkEl);

      // Accumulate XP and log
      accumulated.xpEarned += xpForCorrect;
      accumulated.logEntries.push(
        `Diagnosed: ${partName} failure`,
        `Confirmed root cause — marked for repair`,
      );

      // Result message
      _showResult(
        `<strong>That's it.</strong> <em>${partName}</em> was the problem.` +
        `<span style="color:var(--text-muted,#777);margin-left:10px;">+${xpForCorrect} Diagnosis XP</span>`,
        true
      );

      _updateFlavor(flavorEl, "Nailed it. That's your culprit.");

      // Multi-layer or final completion
      const revealsNext = scenario.multiLayer?.revealsScenarioId ?? null;

      if (revealsNext) {
        accumulated.logEntries.push('Further inspection — additional issue uncovered');

        setTimeout(() => {
          onComplete({
            correctPartId:   scenario.correctDiagnosis,
            wasCorrect:      true,
            yenPenalty:      accumulated.yenPenalty,
            xpEarned:        accumulated.xpEarned,
            logEntries:      [...accumulated.logEntries],
            revealsScenario: revealsNext,
          });
        }, 1800);

      } else {
        // ── Perfect Repair proc (skill level 16+, 5% chance) ──
        const dxPerfectRepair = (skillLevel ?? 1) >= 16 && Math.random() < 0.05;
        if (dxPerfectRepair) {
          accumulated.xpEarned = accumulated.xpEarned * 2;
          accumulated.logEntries.push(
            '⚡ PERFECT REPAIR proc! Part diagnosed and instantly restored to factory spec! (2× XP)'
          );
          _showResult(
            `<strong>⚡ PERFECT REPAIR!</strong> <em>${_getPartName(scenario.correctDiagnosis, vehicleParts)}</em> restored to factory spec.` +
            `<span style="color:#f59e0b; margin-left:10px;">+${accumulated.xpEarned} XP (2×)</span>`,
            true
          );
        }

        setTimeout(() => {
          onComplete({
            correctPartId:   scenario.correctDiagnosis,
            wasCorrect:      true,
            yenPenalty:      accumulated.yenPenalty,
            xpEarned:        accumulated.xpEarned,
            logEntries:      [...accumulated.logEntries],
            revealsScenario: null,
            perfectRepair:   dxPerfectRepair,
          });
        }, dxPerfectRepair ? 1800 : 1400);
      }

    } else {
      // ════════════════════════════════════
      //  WRONG DIAGNOSIS
      // ════════════════════════════════════
      _playAudio('wrong');

      isProcessing = true;
      submitBtn.disabled = true;

      const penalty = _getPartCost(partId, vehicleParts);
      accumulated.yenPenalty += penalty;
      accumulated.logEntries.push(
        `Wrong diagnosis: replaced ${partName} — ¥${penalty.toLocaleString('en-US')} wasted`
      );

      // Visual: red shake animation
      refs.card.classList.remove('dx-selected');
      refs.radio.style.backgroundColor = 'transparent';
      refs.radio.style.borderColor     = 'var(--text-muted,#888)';
      _triggerAnim(refs.card, 'dx-option-wrong-anim');

      // Add X icon to wrong card (stays even after elimination)
      const xEl = _el('span', {
        className: 'dx-xmark',
        style: 'color:#ef4444; font-size:0.95rem; font-weight:900; margin-left:4px;',
        textContent: '✕',
      });
      refs.card.appendChild(xEl);

      // After shake animation: gray out permanently + show penalty message
      setTimeout(() => {
        refs.card.classList.remove('dx-option-wrong-anim');
        refs.card.classList.add('dx-eliminated');  // grayed, pointer-events: none
        eliminatedSet.add(partId);

        // Reset selected state so player must pick again
        selectedPartId = null;

        // Re-enable submit only when player makes a new selection
        // (submit stays disabled until a valid option is clicked)
        isProcessing = false;
        // submitBtn stays disabled (selectedPartId is null)

        // Penalty result message
        _showResult(
          `<strong>Nope.</strong> You replaced <em>${partName}</em> for nothing.` +
          `<span style="color:var(--text-muted,#777);display:block;margin-top:4px;">` +
          `Lost ¥${penalty.toLocaleString('en-US')} on unnecessary replacement.` +
          `</span>`,
          false
        );

        _updateFlavor(flavorEl, pickRandom(FLAVOR_POOL));
      }, 430);
    }
  });
}
