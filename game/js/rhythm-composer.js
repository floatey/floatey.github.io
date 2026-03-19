// ════════════════════════════════════════════════════════════
//  rhythm-composer.js — Motif-centric session composition
//
//  Generates the ENTIRE wrench session up front as a single
//  composition[] array. Both UI and audio scheduler index into
//  this same array → audio/visual desync eliminated by design.
//
//  Design basis:
//    • TaikoNation (Halina & Guzdial, FDG 2021) — patterning
//      coherence as predictor of player-perceived chart quality
//    • Rhythm Heaven "teach → test → twist" structure
//    • Classical motivic development (repetition, displacement,
//      inversion) applied to 4-step rhythmic cells
//    • DDRKirby Rhythm Quest devlog — repetition with variation
//      as the engine of mastery and satisfaction
//
//  Usage:
//    import { composeWrenchSession } from './rhythm-composer.js';
//    const session = composeWrenchSession('ae86_valve_cover', 0.4, 8);
//    // session.composition[cycleIndex] → { call, response, typed, phase }
//    // session.hazardCycles → Set<number>
//    // session.motifCells → [cellA, cellB]
//
// ════════════════════════════════════════════════════════════

import { seededRNG } from './audio.js';

// ── Rhythmic Cell Catalog ────────────────────────────────────
//
// Each cell is a 4-step array representing one beat of 16th notes.
// Two cells concatenated = one 8-step call phrase.
//
// Cells are tiered by difficulty to control complexity.
// Musical character notes help the composer select appropriate
// pairs (question + answer cells for a complete motif).

/** @type {Object<string, boolean[]>} */
const CELL = {
  // ── Tier 0 (difficulty 0.0–1.0, always available) ──────────
  QUARTER:     [true, false, false, false],  // ♩ — strong, grounded downbeat
  TWO_EIGHTHS: [true, false, true,  false],  // ♩♩ — driving, the bread-and-butter
  REST:        [false, false, false, false],  // silence — the strongest rhythmic tool

  // ── Tier 1 (difficulty ≥ 0.30) ─────────────────────────────
  PUSH:         [true,  true,  false, false], // ♬‿‿ — front-loaded energy burst
  ANTICIPATION: [false, false, true,  false], // ‿‿♩‿ — pickup into next beat
  DOTTED:       [true,  false, false, true],  // ♩.♬ — classic syncopation

  // ── Tier 2 (difficulty ≥ 0.60) ─────────────────────────────
  SKIP:   [false, true,  false, false],       // ‿♬‿‿ — offbeat surprise
  GALLOP: [true,  false, true,  true],        // ♩♬♬ — energetic flourish
};

// Which cells are available at each difficulty tier
const TIER_0 = ['QUARTER', 'TWO_EIGHTHS', 'REST'];
const TIER_1 = ['PUSH', 'ANTICIPATION', 'DOTTED'];
const TIER_2 = ['SKIP', 'GALLOP'];

// ── Musical pairing rules ────────────────────────────────────
//
// Not every cell pair makes a good motif. The "question" cell (beat 1–2)
// should have rhythmic weight; the "answer" cell (beat 3–4) should
// resolve or complement it. These pairings encode that.
//
// Format: [questionCell, answerCell, minDifficulty]
// The composer selects from this list based on difficulty and seed.

const MOTIF_PAIRS = [
  // Tier 0 — simple, clean grooves
  ['QUARTER',     'TWO_EIGHTHS', 0.0],    // "boom — ta-ta"
  ['TWO_EIGHTHS', 'QUARTER',     0.0],    // "ta-ta — boom"
  ['TWO_EIGHTHS', 'TWO_EIGHTHS', 0.0],    // "ta-ta — ta-ta" (steady drive)
  ['QUARTER',     'QUARTER',     0.0],    // "boom — boom" (slow, deliberate)
  ['TWO_EIGHTHS', 'REST',        0.0],    // "ta-ta — ..." (breath)
  ['QUARTER',     'REST',        0.0],    // "boom — ..." (sparse)

  // Tier 1 — adds syncopation and push
  ['TWO_EIGHTHS', 'ANTICIPATION', 0.30],  // "ta-ta — ..ta." (pickup)
  ['PUSH',        'TWO_EIGHTHS',  0.30],  // "da-da. — ta-ta" (front energy)
  ['QUARTER',     'DOTTED',       0.30],  // "boom — ta..ta" (syncopated answer)
  ['DOTTED',      'QUARTER',      0.30],  // syncopation → resolution
  ['PUSH',        'REST',         0.30],  // aggressive start, breathing space
  ['TWO_EIGHTHS', 'PUSH',         0.35],  // driving → punchy
  ['ANTICIPATION','TWO_EIGHTHS',  0.35],  // pickup into drive
  ['DOTTED',      'TWO_EIGHTHS',  0.35],  // syncopation → steady

  // Tier 2 — offbeats and flourishes
  ['TWO_EIGHTHS', 'GALLOP',       0.60],  // drive → flourish
  ['PUSH',        'GALLOP',       0.60],  // energy → energy
  ['GALLOP',      'QUARTER',      0.60],  // flourish → resolution
  ['SKIP',        'TWO_EIGHTHS',  0.60],  // surprise → ground
  ['DOTTED',      'GALLOP',       0.65],  // syncopation → flourish
  ['GALLOP',      'REST',         0.65],  // burst then breathe
  ['SKIP',        'DOTTED',       0.70],  // full offbeat madness
];


// ── Transformation Operators ─────────────────────────────────
//
// These take a 4-step cell and return a new 4-step cell.
// Used during Development, Variation, and Climax phases to
// evolve the motif while maintaining recognisability.

/** Shift all active steps right by 1 (wraps). Creates anticipation. */
function displace(cell) {
  return [cell[3], cell[0], cell[1], cell[2]];
}

/** Flip active/rest. Anchor step 0 stays active if it was. */
function invert(cell) {
  const inv = cell.map(v => !v);
  // Preserve downbeat anchor — a cell with no beat-1 sounds accidental
  if (cell[0]) inv[0] = true;
  return inv;
}

/** Swap the two halves of the cell: [a,b,c,d] → [c,d,a,b]. */
function retrograde(cell) {
  return [cell[2], cell[3], cell[0], cell[1]];
}

// Pool of transforms, weighted by how "different" they sound.
// Each entry: [transformFn, minPhase]
// minPhase: 0=exposition, 1=development, 2=variation, 3=climax
const TRANSFORMS = [
  [displace,   1],
  [invert,     2],
  [retrograde, 2],
];


// ── Hold Placement ───────────────────────────────────────────
//
// Holds are NOT probabilistic. They are composed into specific
// cycles at specific positions derived from the cell structure.
//
// Rule: a hold can only exist where 2+ consecutive steps are active.
// We scan the 8-step pattern for "hold-eligible" runs and place
// holds at pre-determined phase-appropriate positions.

/**
 * Build a typed pattern (the format wrench.js expects) from an 8-step
 * boolean array and optional hold specifications.
 *
 * @param {boolean[]} pattern — 8-step active/rest array
 * @param {Array<{start:number, len:number}>} holds — hold specs
 * @returns {Array<null|{t:string, [key]:*}>} — typed pattern
 */
function buildTypedPattern(pattern, holds = []) {
  // Start with all taps
  const typed = pattern.map(v => v ? { t: 'tap' } : null);

  // Apply hold specs
  for (const { start, len } of holds) {
    if (start < 0 || start + len > 8) continue;
    // Verify all steps in the hold are active
    let valid = true;
    for (let i = start; i < start + len; i++) {
      if (!pattern[i]) { valid = false; break; }
    }
    if (!valid) continue;

    const endStep = start + len - 1;
    typed[start] = { t: 'hold', len, endStep };
    for (let j = start + 1; j < endStep; j++) {
      typed[j] = { t: 'held', start };
    }
    if (len > 1) {
      typed[endStep] = { t: 'hold-end', start };
    }
  }

  return typed;
}

/**
 * Find hold-eligible runs in an 8-step pattern.
 * Returns array of { start, maxLen } for runs of 2+ consecutive active steps.
 */
function findHoldCandidates(pattern) {
  const candidates = [];
  let i = 0;
  while (i < pattern.length) {
    if (!pattern[i]) { i++; continue; }
    let runLen = 1;
    while (i + runLen < pattern.length && pattern[i + runLen]) runLen++;
    if (runLen >= 2) {
      candidates.push({ start: i, maxLen: runLen });
    }
    i += runLen;
  }
  return candidates;
}


// ════════════════════════════════════════════════════════════
//  Main Composition Function
// ════════════════════════════════════════════════════════════

/**
 * composeWrenchSession(partId, difficulty, totalCycles)
 *
 * Pre-composes the entire wrench repair session as a deterministic
 * sequence of call/response cycles with progressive development.
 *
 * @param {string} partId       — e.g. "ae86_valve_cover_gasket"
 * @param {number} difficulty   — 0.0–1.0
 * @param {number} totalCycles  — number of non-hazard cycles (4–10)
 * @returns {{ motifCells: string[], composition: Object[], hazardCycles: Set<number>, hazardInterval: number }}
 */
export function composeWrenchSession(partId, difficulty, totalCycles) {
  const rng = seededRNG(partId + 'wrench_compose');
  const diff = Math.max(0, Math.min(1, difficulty));

  // ── 1. Select motif (two cells) ──────────────────────────

  // Filter pairs available at this difficulty
  const availablePairs = MOTIF_PAIRS.filter(([, , minDiff]) => diff >= minDiff);

  // Deterministic selection from available pairs
  const pairIdx = Math.floor(rng() * availablePairs.length);
  const [cellAName, cellBName] = availablePairs[pairIdx];
  const cellA = [...CELL[cellAName]];
  const cellB = [...CELL[cellBName]];

  // The motif: cellA (beat 1-2) + cellB (beat 3-4) = 8 steps
  const motif = [...cellA, ...cellB];

  // Ensure anchor at step 0 (the "1") — always active
  motif[0] = true;

  // ── 2. Select transformation pool ────────────────────────

  // Pick 2 transforms seeded for this part — these are the transforms
  // that will be used across the session (consistency)
  const availableTransforms = TRANSFORMS.filter(([, minPhase]) => {
    // At low difficulty, only displacement is available
    if (diff < 0.35) return minPhase <= 1;
    if (diff < 0.60) return minPhase <= 2;
    return true;
  });

  const transformA = availableTransforms[Math.floor(rng() * availableTransforms.length)];
  const transformB = availableTransforms[Math.floor(rng() * availableTransforms.length)];

  // ── 3. Determine phase boundaries ────────────────────────

  const N = Math.max(4, totalCycles);
  const phaseEnd = {
    exposition:  Math.ceil(N * 0.25),
    development: Math.ceil(N * 0.50),
    variation:   Math.ceil(N * 0.75),
    climax:      N,
  };

  // ── 4. Determine hazard placement ────────────────────────

  const hazardInterval = 3 + Math.floor(rng() * 3); // 3–5
  const hazardCycles = new Set();
  let patternsSinceHazard = 0;

  // Pre-compute hazard cycles so total cycle count accounts for them
  // Hazards are inserted BETWEEN composed cycles
  const totalWithHazards = [];
  let composedIdx = 0;
  for (let i = 0; composedIdx < N; i++) {
    patternsSinceHazard++;
    if (patternsSinceHazard >= hazardInterval && composedIdx > 0 && composedIdx < N - 1) {
      hazardCycles.add(i);
      patternsSinceHazard = 0;
      // Hazard cycle doesn't consume a composed cycle
    } else {
      totalWithHazards.push(composedIdx);
      composedIdx++;
    }
  }

  // ── 5. Compose each cycle ────────────────────────────────

  const composition = [];

  for (let ci = 0; ci < N; ci++) {
    let phase;
    if (ci < phaseEnd.exposition)       phase = 'exposition';
    else if (ci < phaseEnd.development) phase = 'development';
    else if (ci < phaseEnd.variation)   phase = 'variation';
    else                                phase = 'climax';

    // Start from the base motif each cycle
    let qCell = [...cellA]; // question (beat 1-2)
    let aCell = [...cellB]; // answer (beat 3-4)

    // ── Phase-specific transformations ──────────────────

    switch (phase) {
      case 'exposition':
        // Pure motif, no transforms. Player learns the rhythm.
        break;

      case 'development': {
        // Transform the answer cell only — the question stays familiar.
        // The player recognises the start but gets a new ending.
        const [transformFn] = transformA;
        const newA = transformFn(aCell);
        // If transform was a no-op (e.g. displacing a REST cell), apply to
        // the question cell instead — ensures every phase sounds different.
        if (JSON.stringify(newA) === JSON.stringify(aCell)) {
          qCell = transformFn(qCell);
        } else {
          aCell = newA;
        }
        break;
      }

      case 'variation': {
        // Transform the answer cell with a different transform.
        // Alternate between transforms every other cycle for variety.
        const [fn] = (ci % 2 === 0) ? transformA : transformB;
        const newAV = fn(aCell);
        if (JSON.stringify(newAV) === JSON.stringify(aCell)) {
          // No-op on answer — transform question instead
          qCell = fn(qCell);
        } else {
          aCell = newAV;
        }

        // Occasionally transform the question too (40% chance, seeded)
        if (rng() < 0.40) {
          const [qFn] = transformB;
          qCell = qFn(qCell);
        }
        break;
      }

      case 'climax': {
        // Both cells may transform. Maximum development.
        const [fnA] = transformA;
        const [fnB] = transformB;
        const newAC = fnA(aCell);
        if (JSON.stringify(newAC) === JSON.stringify(aCell)) {
          qCell = fnA(qCell);
        } else {
          aCell = newAC;
        }
        if (rng() < 0.65) {
          qCell = fnB(qCell);
        }
        break;
      }
    }

    // Assemble 8-step call pattern
    const call = [...qCell, ...aCell];
    // Always enforce anchor on step 0
    call[0] = true;
    // Enforce secondary anchor on step 4 (the "3" of the phrase) for 60%+ difficulty
    if (diff >= 0.20 && !call[4]) {
      // Only add if it doesn't create anti-pattern (3 consecutive)
      if (!(call[3] && call[5])) call[4] = true;
    }

    // ── Response pattern ──────────────────────────────────
    // In Exposition: response = exact copy of call (pure echo)
    // In Development+: response may have a "cadence" — last 2 steps differ
    const response = [...call];

    if (phase !== 'exposition') {
      // Turnaround / cadence on last 2 steps
      // Probability increases with phase progression
      const cadenceChance = phase === 'development' ? 0.25 :
                            phase === 'variation'   ? 0.40 : 0.50;
      if (rng() < cadenceChance) {
        response[6] = !call[6];
        response[7] = !call[7];
      }
    }

    // ── Hold placement ────────────────────────────────────
    const holds = [];

    if (phase === 'variation' || phase === 'climax') {
      const candidates = findHoldCandidates(call);

      if (candidates.length > 0) {
        // Pick the longest eligible run
        const best = candidates.reduce((a, b) => b.maxLen > a.maxLen ? b : a);

        // Hold length: 2 in variation, 2–3 in climax
        const maxHold = phase === 'climax' ? Math.min(best.maxLen, 3) : Math.min(best.maxLen, 2);

        if (maxHold >= 2) {
          holds.push({ start: best.start, len: maxHold });
        }
      }
    }

    // Build the typed pattern (what wrench.js uses for input evaluation)
    const typed = buildTypedPattern(call, holds);

    composition.push({
      call,
      response,
      typed,
      holds,
      phase,
    });
  }

  return {
    motifCells: [cellAName, cellBName],
    motif,
    composition,
    hazardCycles,
    hazardInterval,
  };
}
