// ════════════════════════════════════════════════════════════
//  rhythm-composer.js — Motif-centric session composition v2
//
//  Generates the ENTIRE wrench session up front as a single
//  composition[] array. The audio scheduler indexes into this
//  array by engine cycle count — no mutable _currentPattern,
//  no race conditions, no desync.
//
//  v2 changes:
//    • Trap beats replace seized-bolt hazard phase entirely
//    • Traps are active beats in the CALL that must be SKIPPED
//      during RESPONSE. Tapping a trap = bolt strips = penalty.
//    • Traps never appear during exposition (player learning)
//    • No more separate hazard cycles — traps are embedded in
//      normal call/response cycles for seamless gameplay flow
//
//  Usage:
//    import { composeWrenchSession } from './rhythm-composer.js';
//    const session = composeWrenchSession('ae86_valve_cover', 0.4, 8);
//    // session.composition[i] → { call, response, typed, traps, phase }
//
// ════════════════════════════════════════════════════════════

import { seededRNG } from './audio.js';

// ── Rhythmic Cell Catalog ────────────────────────────────────

const CELL = {
  QUARTER:     [true, false, false, false],
  TWO_EIGHTHS: [true, false, true,  false],
  REST:        [false, false, false, false],
  PUSH:        [true,  true,  false, false],
  ANTICIPATION:[false, false, true,  false],
  DOTTED:      [true,  false, false, true],
  SKIP:        [false, true,  false, false],
  GALLOP:      [true,  false, true,  true],
};

const MOTIF_PAIRS = [
  ['QUARTER',     'TWO_EIGHTHS', 0.0],
  ['TWO_EIGHTHS', 'QUARTER',     0.0],
  ['TWO_EIGHTHS', 'TWO_EIGHTHS', 0.0],
  ['QUARTER',     'QUARTER',     0.0],
  ['TWO_EIGHTHS', 'REST',        0.0],
  ['QUARTER',     'REST',        0.0],
  ['TWO_EIGHTHS', 'ANTICIPATION', 0.30],
  ['PUSH',        'TWO_EIGHTHS',  0.30],
  ['QUARTER',     'DOTTED',       0.30],
  ['DOTTED',      'QUARTER',      0.30],
  ['PUSH',        'REST',         0.30],
  ['TWO_EIGHTHS', 'PUSH',         0.35],
  ['ANTICIPATION','TWO_EIGHTHS',  0.35],
  ['DOTTED',      'TWO_EIGHTHS',  0.35],
  ['TWO_EIGHTHS', 'GALLOP',       0.60],
  ['PUSH',        'GALLOP',       0.60],
  ['GALLOP',      'QUARTER',      0.60],
  ['SKIP',        'TWO_EIGHTHS',  0.60],
  ['DOTTED',      'GALLOP',       0.65],
  ['GALLOP',      'REST',         0.65],
  ['SKIP',        'DOTTED',       0.70],
];

// ── Transformation Operators ─────────────────────────────────

function displace(cell)   { return [cell[3], cell[0], cell[1], cell[2]]; }
function invert(cell)     { const inv = cell.map(v => !v); if (cell[0]) inv[0] = true; return inv; }
function retrograde(cell) { return [cell[2], cell[3], cell[0], cell[1]]; }

const TRANSFORMS = [
  [displace,   1],
  [invert,     2],
  [retrograde, 2],
];

// ── Hold / Typed Pattern Helpers ─────────────────────────────

function buildTypedPattern(pattern, holds = []) {
  const typed = pattern.map(v => v ? { t: 'tap' } : null);
  for (const { start, len } of holds) {
    if (start < 0 || start + len > 8) continue;
    let valid = true;
    for (let i = start; i < start + len; i++) { if (!pattern[i]) { valid = false; break; } }
    if (!valid) continue;
    const endStep = start + len - 1;
    typed[start] = { t: 'hold', len, endStep };
    for (let j = start + 1; j < endStep; j++) typed[j] = { t: 'held', start };
    if (len > 1) typed[endStep] = { t: 'hold-end', start };
  }
  return typed;
}

function findHoldCandidates(pattern) {
  const candidates = [];
  let i = 0;
  while (i < pattern.length) {
    if (!pattern[i]) { i++; continue; }
    let runLen = 1;
    while (i + runLen < pattern.length && pattern[i + runLen]) runLen++;
    if (runLen >= 2) candidates.push({ start: i, maxLen: runLen });
    i += runLen;
  }
  return candidates;
}

// ── Trap Beat Selection ──────────────────────────────────────
//
// Traps are active beats in the CALL that must be SKIPPED during
// RESPONSE. Tapping a trap = bolt strips = progress penalty.
//
// Rules:
//   • Never trap anchors (step 0, step 4)
//   • 1 trap in development, 2 in variation/climax
//   • Never during exposition
//   • Never trap a beat that's part of a hold
//   • Prefer non-adjacent traps (two distinct decisions)

function selectTraps(pattern, count, holds, rng) {
  const anchors = new Set([0, 4]);
  const holdSteps = new Set();
  for (const h of holds) {
    for (let i = h.start; i < h.start + h.len; i++) holdSteps.add(i);
  }

  const eligible = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] && !anchors.has(i) && !holdSteps.has(i)) {
      eligible.push(i);
    }
  }
  if (eligible.length === 0) return [];

  // Shuffle with seeded RNG
  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selected = [shuffled[0]];
  if (count >= 2 && shuffled.length >= 2) {
    const nonAdj = shuffled.slice(1).find(s => Math.abs(s - selected[0]) > 1);
    selected.push(nonAdj ?? shuffled[1]);
  }
  return selected.slice(0, count);
}


// ════════════════════════════════════════════════════════════
//  Main Composition Function
// ════════════════════════════════════════════════════════════

export function composeWrenchSession(partId, difficulty, totalCycles) {
  const rng = seededRNG(partId + 'wrench_compose');
  const diff = Math.max(0, Math.min(1, difficulty));

  // ── 1. Select motif ────────────────────────────────────
  const availablePairs = MOTIF_PAIRS.filter(([, , minDiff]) => diff >= minDiff);
  const [cellAName, cellBName] = availablePairs[Math.floor(rng() * availablePairs.length)];
  const cellA = [...CELL[cellAName]];
  const cellB = [...CELL[cellBName]];
  const motif = [...cellA, ...cellB];
  motif[0] = true;

  // ── 2. Select transforms ──────────────────────────────
  const avT = TRANSFORMS.filter(([, mp]) => diff < 0.35 ? mp <= 1 : diff < 0.60 ? mp <= 2 : true);
  const transformA = avT[Math.floor(rng() * avT.length)];
  const transformB = avT[Math.floor(rng() * avT.length)];

  // ── 3. Phase boundaries ───────────────────────────────
  const N = Math.max(4, totalCycles);
  const phaseEnd = {
    exposition:  Math.ceil(N * 0.25),
    development: Math.ceil(N * 0.50),
    variation:   Math.ceil(N * 0.75),
    climax:      N,
  };

  // ── 4. Trap interval ──────────────────────────────────
  const trapInterval = 3 + Math.floor(rng() * 3); // every 3–5 cycles

  // ── 5. Compose each cycle ─────────────────────────────
  const composition = [];
  let patternsSinceTrap = 0;

  for (let ci = 0; ci < N; ci++) {
    let phase;
    if (ci < phaseEnd.exposition)       phase = 'exposition';
    else if (ci < phaseEnd.development) phase = 'development';
    else if (ci < phaseEnd.variation)   phase = 'variation';
    else                                phase = 'climax';

    let qCell = [...cellA];
    let aCell = [...cellB];

    // ── Transforms per phase ─────────────────────────────
    switch (phase) {
      case 'exposition': break;
      case 'development': {
        const newA = transformA[0](aCell);
        if (JSON.stringify(newA) === JSON.stringify(aCell)) qCell = transformA[0](qCell);
        else aCell = newA;
        break;
      }
      case 'variation': {
        const fn = (ci % 2 === 0 ? transformA : transformB)[0];
        const newAV = fn(aCell);
        if (JSON.stringify(newAV) === JSON.stringify(aCell)) qCell = fn(qCell);
        else aCell = newAV;
        if (rng() < 0.40) qCell = transformB[0](qCell);
        break;
      }
      case 'climax': {
        const newAC = transformA[0](aCell);
        if (JSON.stringify(newAC) === JSON.stringify(aCell)) qCell = transformA[0](qCell);
        else aCell = newAC;
        if (rng() < 0.65) qCell = transformB[0](qCell);
        break;
      }
    }

    // Assemble call
    const call = [...qCell, ...aCell];
    call[0] = true;
    if (diff >= 0.20 && !call[4] && !(call[3] && call[5])) call[4] = true;

    // Response
    const response = [...call];
    if (phase !== 'exposition') {
      const cc = phase === 'development' ? 0.25 : phase === 'variation' ? 0.40 : 0.50;
      if (rng() < cc) { response[6] = !call[6]; response[7] = !call[7]; }
    }

    // Holds
    const holds = [];
    if (phase === 'variation' || phase === 'climax') {
      const cands = findHoldCandidates(call);
      if (cands.length > 0) {
        const best = cands.reduce((a, b) => b.maxLen > a.maxLen ? b : a);
        const maxH = phase === 'climax' ? Math.min(best.maxLen, 3) : Math.min(best.maxLen, 2);
        if (maxH >= 2) holds.push({ start: best.start, len: maxH });
      }
    }

    // ── Traps ─────────────────────────────────────────────
    let traps = [];
    patternsSinceTrap++;
    if (phase !== 'exposition' && patternsSinceTrap >= trapInterval) {
      const trapCount = phase === 'development' ? 1 : 2;
      traps = selectTraps(call, trapCount, holds, rng);
      if (traps.length > 0) patternsSinceTrap = 0;
    }

    // Build typed pattern, then null out trap positions
    const typed = buildTypedPattern(call, holds);
    const trapSet = new Set(traps);
    for (let i = 0; i < typed.length; i++) {
      if (trapSet.has(i)) typed[i] = null;
    }

    // Build typed response pattern from the (potentially varied) response array.
    // Holds are anchored to the call shape; traps are skipped in response too.
    const typedResponse = buildTypedPattern(response, holds);
    for (let i = 0; i < typedResponse.length; i++) {
      if (trapSet.has(i)) typedResponse[i] = null;
    }

    composition.push({ call, response, typed, typedResponse, holds, traps, phase });
  }

  return { motifCells: [cellAName, cellBName], motif, composition };
}
