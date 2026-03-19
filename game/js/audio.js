// ════════════════════════════════════════════════════════════════════════════
//  audio.js — Procedural Audio Engine v2  (Web Audio API)
//  JDM Restoration Garage
//
//  Zero audio files. Every sound synthesised at runtime from oscillators,
//  filtered noise, and gain envelopes.
//
//  ── PUBLIC API ─────────────────────────────────────────────────────────────
//
//  Core manager (drop-in replacement for file-based version):
//
//    import { AudioManager, RhythmEngine, renderAudioControls } from './audio.js';
//
//    const audio = new AudioManager();
//    audio.init();                              // call on first user gesture
//
//  Legacy one-shot sounds (unchanged from v1):
//    audio.playRatchet()                        // wrench — each click
//    audio.play('impact')                       // wrench — critical click
//    audio.play('stuck')                        // wrench — hazard
//    audio.play('torque_click')                 // precision — green zone
//    audio.play('miss')                         // precision — red zone miss
//    audio.play('aha')                          // diagnosis — correct
//    audio.play('wrong')                        // diagnosis — incorrect
//    const h = audio.play('sand_loop',{loop:true})  // bodywork — hold
//    audio.stop(h)
//    audio.play('system_complete')
//    audio.play('engine_start')
//    audio.playRarityReveal(5)
//    audio.playClick()
//
//  New rhythm mechanic sounds:
//    audio.playWrenchCallBeat(pitch?)           // call-phase guide beat
//    audio.playWrenchComboBump(level)           // combo level 1–4 milestone
//    audio.playWrenchSequenceBreak()            // missed rest / broken combo
//    audio.playBodyworkPad(freq, duration, vol?)// sustaining zone pad tone
//    audio.playBodyworkZonePerfect()            // zone released at perfect time
//    audio.playBodyworkZoneRush()               // zone released too early
//    audio.startBodyworkRust()                  // → handle; call .stop() after
//    audio.playDiagScanPulse(isFault, baseFreq) // one beat of the scan stream
//    audio.playDiagCorrectFlag()
//    audio.playDiagWrongFlag()
//    audio.playDiagFalseFlag()
//    audio.playPrecisionTick(isOnBeat)          // pendulum tick sound
//    audio.playPrecisionWindowChime()           // tap-window entry chirp
//    audio.playPrecisionBeatSnap(step, total)   // each torque beat in sequence
//    audio.playPrecisionSequenceComplete(lock?) // full sequence done
//    audio.playPrecisionSequenceBreak()
//    audio.playPrecisionResonance(count)        // Torque Lock chord note; count 1-5
//    audio.playPrecisionCriticalSnap()          // final critical torque click
//
//  RhythmEngine — beat scheduler + procedural map generation:
//    import { RhythmEngine } from './audio.js';
//    const engine = new RhythmEngine(audioManager);
//    const map    = RhythmEngine.generateMap(partId, difficulty, 'wrench');
//    engine.start(map, onBeatCallback);
//    engine.stop();
//    engine.pause();
//    engine.resume();
//
// ════════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════════
//
//  MUSIC THEORY REFERENCE FOR RHYTHM MAP GENERATION
//
//  This section documents every musical principle used by generateMap() and
//  the four mechanic-specific pattern generators.  If you need to hand-tune
//  a rhythm map or add a new mechanic, read this first.
//
// ────────────────────────────────────────────────────────────────────────────
//  1. THE 16-STEP GRID
// ────────────────────────────────────────────────────────────────────────────
//
//  All mechanics use a 16-step grid per bar of 4/4 time.  Each step is one
//  sixteenth note.  Step indices run 0–15.
//
//  The grid maps to Western rhythm notation like this:
//
//    Step:  0  1  2  3 | 4  5  6  7 | 8  9 10 11 | 12 13 14 15
//    Beat:  1  e  +  a | 2  e  +  a | 3  e  +  a |  4  e  +  a
//    Name: [downbeat]  [upbeat 2]   [downbeat 3] [upbeat 4]
//
//  Step 0 is the "1" — the strongest beat in the bar.
//  Step 8 is the "3" — second-strongest.
//  Steps 4 and 12 are "2" and "4" (the backbeats, where a snare would sit).
//  Steps 2, 6, 10, 14 are the "+" (upbeats / eighth notes off the beat).
//  All odd steps (1,3,5...) are sixteenth-note subdivisions.
//
//  WHY 16 STEPS?
//  Sixteen is the smallest subdivision where syncopation, groove, and
//  anticipation can all be expressed.  Eight steps (eighth notes only) is too
//  coarse — patterns feel simple and childlike.  Thirty-two steps at typical
//  BPMs would require <100ms precision per step, which is beyond most players.
//  Sixteen steps at 80–160 BPM gives step durations of 94–188ms, well within
//  the human "groove window" of ±20ms.
//
// ────────────────────────────────────────────────────────────────────────────
//  2. ANCHOR BEATS — what must ALWAYS fire
// ────────────────────────────────────────────────────────────────────────────
//
//  Anchors are steps that should (almost) always be active regardless of
//  density or difficulty.  They provide the rhythmic skeleton that makes a
//  pattern feel like music rather than random noise.
//
//  Primary anchors:   0, 8        (the "1" and "3" — downbeats)
//  Secondary anchors: 4, 12       (the "2" and "4" — backbeats)
//
//  Rules:
//  - Steps 0 and 8 should be active in ≥90% of patterns.
//  - Steps 4 and 12 are active in ≥60% of patterns.
//  - If a pattern has ANY active steps, step 0 must be active.
//    A bar with no beat on "1" sounds like it started mid-bar.
//
//  Exception: The Wrench hazard "silence" event deliberately kills anchors —
//  the abrupt absence of the familiar downbeat is what signals danger.
//
// ────────────────────────────────────────────────────────────────────────────
//  3. DENSITY — how many steps to fill per 16
// ────────────────────────────────────────────────────────────────────────────
//
//  Density is the fraction of active steps in a 16-step pattern.
//
//  Density ≤ 0.25 (≤4 steps):   Sparse. Feels deliberate and tense.
//                                 Use at low difficulty, or for Precision
//                                 where each hit must be individually felt.
//  Density 0.25–0.50 (4–8 steps): Groovy. The "pocket". Most patterns should
//                                 live here. Enough rhythm to feel musical,
//                                 few enough rests to feel like breathing.
//  Density 0.50–0.65 (8–10 steps): Dense. Energetic. Appropriate at high
//                                 difficulty. Starts to feel physically
//                                 demanding to execute.
//  Density > 0.65 (>10 steps):   Busy. Only for very short patterns or bursts.
//                                 Sustained patterns above 65% feel like
//                                 random noise rather than rhythm.
//  Density = 1.0 (all 16 steps): Machine gun. Never use. There is no rhythm
//                                 here — just continuous sound.
//
//  The generateMap() density formula:
//    density = 0.25 + (difficulty × 0.40)   → range 0.25–0.65
//
//  This maps difficulty 0.1 → density 0.29 (very sparse)
//              difficulty 0.5 → density 0.45 (comfortable)
//              difficulty 1.0 → density 0.65 (demanding)
//
// ────────────────────────────────────────────────────────────────────────────
//  4. AVOIDING ANTI-PATTERNS
// ────────────────────────────────────────────────────────────────────────────
//
//  Certain step combinations are "anti-patterns" — they sound bad or are
//  physically impossible to execute cleanly:
//
//  a) THREE-OR-MORE CONSECUTIVE ACTIVE STEPS (e.g. steps 3,4,5,6 all active)
//     At 120 BPM, three consecutive sixteenths = 375ms of continuous rapid
//     tapping.  This feels like a machine gun burst, not a groove.  Cap at
//     two consecutive active steps.  (Exception: intentional "roll" patterns
//     at low difficulty where the tempo is slow enough, <90 BPM.)
//
//  b) ISOLATED SINGLE STEPS SURROUNDED BY RESTS (e.g. only step 7 active)
//     A lone sixteenth-note off the beat with no neighbours sounds accidental.
//     If a non-anchor step is active, it should have at least one active
//     neighbour within 2 steps, OR be on a secondary anchor (4 or 12).
//
//  c) ALL RESTS IN THE FIRST HALF (steps 0–7 empty)
//     The player is waiting with no feedback.  Always have at least the
//     anchor at step 0.
//
//  d) IDENTICAL PATTERNS EVERY CYCLE
//     The pattern should vary slightly every 2–3 repetitions.  The variation
//     formula in generateMap() shifts 1–2 non-anchor steps between cycles
//     using the seeded RNG, keeping anchors fixed.
//
// ────────────────────────────────────────────────────────────────────────────
//  5. SYNCOPATION — the source of groove
// ────────────────────────────────────────────────────────────────────────────
//
//  Syncopation is an active step on a "weak" beat (the off-beats and
//  sixteenth subdivisions) rather than only on strong beats.
//
//  Low syncopation (only steps 0,4,8,12 active): sounds like a march.
//  Moderate syncopation (adds steps 2,6,10,14): sounds like a groove.
//  High syncopation (adds steps 3,5,9,11,13): sounds like jazz or funk.
//
//  The groove sweet spot for this game:
//    Core pattern    = steps 0, 8 (always)
//    Backbeat groove = steps 4, 12 (±60% chance)
//    First syncopation layer = steps 2, 6, 10, 14 (±difficulty × 50%)
//    Second layer = steps 3, 5, 9, 11, 13 (±difficulty × 25%)
//    Avoid: steps 1, 7, 15 (on the boundary of bar lines — these are
//    genuinely hard to feel and sound accidental in this BPM range)
//
//  Syncopation guidelines per mechanic:
//    Wrench (call/response): moderate syncopation on the call, player echoes
//    Bodywork (hold-flow):   light syncopation, prefer even spacing (legato feel)
//    Diagnostic (scan):      syncopation encodes fault "signatures" — consistent
//                            signature per fault type, regardless of difficulty
//    Precision (pendulum):   low syncopation — the sequence is what varies,
//                            not the beat.  The pendulum IS the beat.
//
// ────────────────────────────────────────────────────────────────────────────
//  6. BPM AND DIFFICULTY MAPPING
// ────────────────────────────────────────────────────────────────────────────
//
//  BPM (beats per minute) controls the physical pace of the mechanic.
//  Formula: BPM = 72 + Math.round(difficulty × 96)
//
//  difficulty 0.0 →  72 BPM  (very slow; tutorial-friendly)
//  difficulty 0.3 →  101 BPM (comfortable; AE86 level)
//  difficulty 0.6 →  130 BPM (moderate; FC/S13 level)
//  difficulty 0.9 →  158 BPM (demanding; FD/R34 level)
//  difficulty 1.0 →  168 BPM (absolute max; hardest FD parts only)
//
//  Sixteenth-note step duration in ms = 60000 / BPM / 4
//
//  At  72 BPM: step = 208ms  (very relaxed, plenty of time)
//  At 120 BPM: step = 125ms  (comfortable for experienced players)
//  At 160 BPM: step = 94ms   (demanding; requires anticipation)
//
//  TIMING WINDOWS per mechanic (fraction of step duration):
//    Wrench taps:      ±0.25 × stepDuration  (i.e. ±50ms at 120 BPM)
//    Bodywork holds:   ±0.30 × stepDuration  (more forgiving)
//    Diagnostic flags: ±0.35 × stepDuration  (identification is the challenge)
//    Precision taps:   ±0.20 × stepDuration  (tightest — precision IS the game)
//
//  These scale with Skill level via SKILL_WINDOW_BONUS[level] below.
//
// ────────────────────────────────────────────────────────────────────────────
//  7. SCALES AND TONALITY PER MECHANIC
// ────────────────────────────────────────────────────────────────────────────
//
//  Each mechanic uses a different scale or tonal system for its melodic/
//  harmonic content.  The choice is deliberately matched to the emotional
//  character of the work.
//
//  WRENCH — Pentatonic minor (Eb pentatonic minor):
//    Eb3(155Hz)  Gb3(185Hz)  Ab3(208Hz)  Bb3(233Hz)  Db4(277Hz)
//    Eb4(311Hz)  Gb4(370Hz)  Ab4(415Hz)  ...
//    Why: Pentatonic has no half-steps — every interval is consonant.
//    In the context of aggressive ratchet sounds (already noisy), a
//    smooth scale prevents dissonance clashes.  The minor quality suits
//    the physical effort of the work.
//
//  BODYWORK — D major pentatonic (bright, open):
//    D4(294Hz)  E4(330Hz)  F#4(370Hz)  A4(440Hz)  B4(494Hz)
//    D5(587Hz)  E5(659Hz)  ...
//    Why: Major pentatonic sounds warmer and more flowing than minor.
//    Bodywork is meditative — sanding and polishing.  The D major
//    tonal centre (not C, not A) is slightly unusual and avoids the
//    cliché "happy video game music" quality of C major.
//    Voice leading rule: each zone maps to the next scale degree.
//    Circular zones return to the root.  Long sweeps ascend to the
//    fifth and back.  Rust zones play the flat-seven (C4, 261Hz) —
//    a note outside the scale that implies tension resolved by the
//    following zone completing.
//
//  DIAGNOSTIC — Chromatic tension/resolution pair:
//    Normal signal: A3(220Hz) — stable, steady
//    Fault signal:  Eb4(311Hz) — this is a tritone above A3.
//    The tritone (augmented fourth / diminished fifth) is the most
//    dissonant interval in Western music.  Every culture that uses
//    the major/minor system perceives the tritone as "wrong" or
//    "unresolved".  It was called "diabolus in musica" (the devil in
//    music) in medieval theory and was avoided in counterpoint.
//    For the diagnostic mechanic this is perfect: the fault signal
//    literally sounds like something has gone wrong to any listener,
//    regardless of musical training.
//    Decoy faults use a minor second (Bb3, 233Hz) — close but not
//    as harsh.  The player must distinguish tritone from minor second.
//
//  PRECISION — Stacked fifth intervals building a power chord:
//    Beat 1 of sequence: C3 (130Hz) — the root
//    Beat 2:             G3 (196Hz) — the fifth (adds power)
//    Beat 3:             C4 (261Hz) — the octave (doubles root)
//    Beat 4:             E4 (330Hz) — the major third (adds brightness)
//    Beat 5:             G4 (392Hz) — the fifth again (completes chord)
//    The chord C3-G3-C4-E4-G4 is a C major chord in open voicing.
//    Why open voicing: the wide spacing between notes gives each beat
//    a distinct pitch character, making it easy to feel the sequence
//    building even without musical training.  Close voicings
//    (notes within one octave) would blur together at high repetition.
//    Torque Lock chord = all 5 notes sounding simultaneously.
//    This is the same chord the system_complete arpeggio outlines —
//    intentional thematic link.
//
// ────────────────────────────────────────────────────────────────────────────
//  8. CALL-AND-RESPONSE STRUCTURE (Wrench specific)
// ────────────────────────────────────────────────────────────────────────────
//
//  The Wrench mechanic uses two 8-step phrases: call (engine plays) and
//  response (player echoes).  This is a fundamental structure in folk,
//  jazz, and gospel music — a question followed by an answer.
//
//  Call phrase (steps 0–7):  The engine demonstrates the pattern.
//  Rest beat  (1 step gap):  A moment of silence that acts as a "?"
//  Response phrase (steps 0–7 of the next pass): Player reproduces it.
//
//  For musical coherence, the call and response share the same 8-step
//  seed but the response pattern may add a "turnaround" — a variation
//  in the last 2 steps that leads back to the next call's first beat.
//
//  Turnarounds: with 30% probability (seeded), the response's steps 6–7
//  are inverted relative to the call (active→rest or rest→active).
//  This is the musical equivalent of a question ending differently than
//  expected — it keeps the player alert.
//
//  Hazard placement: hazards are ONLY placed at the end of a response
//  phrase (between step 7 of response and step 0 of next call).  This
//  preserves musical phrase structure and prevents hazards from
//  interrupting the middle of a musical idea, which would feel arbitrary.
//
// ────────────────────────────────────────────────────────────────────────────
//  9. SWING AND HUMAN TIMING PERCEPTION
// ────────────────────────────────────────────────────────────────────────────
//
//  "Straight" rhythm: every sixteenth note is exactly equally spaced.
//  "Swing" rhythm: the "+" (upbeat) of each beat is delayed by ~30%.
//    In 16th-note terms: even steps (0,2,4,...) play on time.
//    Odd steps (1,3,5,...) are delayed by swingRatio × stepDuration.
//
//  Common swing ratios:
//    swingRatio = 0.0:   straight (perfectly even)
//    swingRatio = 0.08:  very light swing (barely perceptible)
//    swingRatio = 0.15:  light groove (most electronic music)
//    swingRatio = 0.30:  medium swing (jazz, hip-hop)
//    swingRatio = 0.50:  hard swing (triplet feel — even-odd pairs
//                        become 2:1 ratio, classical triplet feel)
//
//  For this game: swingRatio = 0.12 is used for Wrench and Bodywork.
//  Diagnostic and Precision use swingRatio = 0.0 (straight) because:
//    - Diagnostic: the scan signal must be metrically precise to encode
//      fault signatures accurately.
//    - Precision: the pendulum is the definition of metronomic time.
//
//  The swingOffset(step, stepDuration, swingRatio) function below
//  returns the time offset in seconds for any given step.
//
//  WHY SWING MATTERS FOR FEEL:
//  Straight 16th-note grids at >120 BPM sound mechanical and stressful.
//  Even 12% swing makes the same pattern feel "alive".  In Rhythm Heaven,
//  this is achieved through animation timing — the character's movement
//  has a slight delay on the upbeat that makes the action feel weighted.
//  In our audio system, swing applies to the beat scheduler's note times,
//  which means the sound the player is responding to already has groove in
//  it.  The player naturally mirrors the groove in their taps.
//
// ────────────────────────────────────────────────────────────────────────────
//  10. SEEDED RANDOMNESS AND PART IDENTITY
// ────────────────────────────────────────────────────────────────────────────
//
//  Every part in the game has a unique partId string (e.g. "fd3s_apex_seal_f1").
//  The rhythm map for each part is deterministically generated from this ID
//  using a seeded PRNG (pseudo-random number generator).  The same partId
//  always produces the same rhythm map.
//
//  This gives each part a "musical identity" — the FD's apex seal will
//  always have the same pattern each time you repair it.  Players will begin
//  to recognise parts by their rhythm.  This is intentional game design:
//  familiarity breeds mastery, and mastery is what the skill leveling rewards.
//
//  The hash function used (seededRNG) is a variant of the mulberry32 PRNG:
//    https://github.com/bryc/code/blob/master/jshash/PRNGs.md#mulberry32
//  It produces high-quality pseudo-random sequences from a 32-bit seed.
//  The seed is derived from the partId string by summing char codes with a
//  polynomial roll (FNV-1a variant):
//    seed = partId.split('').reduce((h,c) => (h^c.charCodeAt(0))*0x01000193, 0x811c9dc5)
//
//  VARIATION ACROSS CYCLES:
//  The same map is used for all cycles but the variation generator uses
//  a different "cycle offset" seed to produce 1–2 step mutations per cycle.
//  This prevents full pattern mastery too quickly while keeping the core
//  identity of the part consistent.
//
// ════════════════════════════════════════════════════════════════════════════


// ── Low-level helpers ────────────────────────────────────────────────────────

/** Uniform random float in [min, max) */
function rand(min, max) {
  return min + Math.random() * (max - min);
}

/** Pick a random element from an array */
function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Create a mono white-noise AudioBuffer.
 * First and last 256 samples are windowed to zero for seamless looping.
 */
function noiseBuffer(ctx, duration) {
  const len  = Math.max(256, Math.ceil(ctx.sampleRate * duration));
  const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
  const d    = buf.getChannelData(0);
  const ramp = Math.min(256, Math.floor(len * 0.05));
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  for (let i = 0; i < ramp; i++) {
    const t = i / ramp;
    d[i]           *= t;
    d[len - 1 - i] *= t;
  }
  return buf;
}

/** ADSR envelope: silence → attack → hold → exponential decay */
function adsr(param, ctx, { t = 0, attack = 0.002, hold = 0.01, decay = 0.1, peak = 1 } = {}) {
  const now = t || ctx.currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(0.0001, now);
  param.linearRampToValueAtTime(peak, now + attack);
  param.setValueAtTime(peak, now + attack + hold);
  param.exponentialRampToValueAtTime(0.0001, now + attack + hold + decay);
}

/** Create a BiquadFilter node */
function filter(ctx, type, freq, Q = 1) {
  const f     = ctx.createBiquadFilter();
  f.type      = type;
  f.frequency.value = freq;
  f.Q.value   = Q;
  return f;
}

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

/**
 * seededRNG(seed) → () => float [0,1)
 *
 * Deterministic PRNG seeded from a string.  Uses FNV-1a hash to produce a
 * 32-bit integer seed, then mulberry32 for the sequence.
 *
 * Same input string always → same sequence of random numbers.
 * Used to ensure every part has a consistent, reproducible rhythm map.
 *
 * @param   {string} seed — typically partId + mechanicType
 * @returns {function(): number}
 */
export function seededRNG(seed) {
  // FNV-1a 32-bit hash
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h  = Math.imul(h, 0x01000193);
  }
  h = h >>> 0; // unsigned 32-bit

  // mulberry32
  return function () {
    h += 0x6d2b79f5;
    let z = h;
    z  = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * swingOffset(step, stepDuration, swingRatio) → seconds
 *
 * Returns the time offset to apply to a given step for a swung grid.
 * Even steps (0,2,4...) are on-time (offset 0).
 * Odd steps (1,3,5...) are delayed by swingRatio × stepDuration.
 *
 * @param {number} step          — 0–15
 * @param {number} stepDuration  — seconds per 16th note
 * @param {number} swingRatio    — 0.0 (straight) to 0.5 (hard triplet swing)
 */
function swingOffset(step, stepDuration, swingRatio) {
  return (step % 2 === 1) ? stepDuration * swingRatio : 0;
}


// ── Scale definitions ────────────────────────────────────────────────────────
//
// Frequencies in Hz for each scale used by the rhythm mechanics.
// See Music Theory Reference §7 for rationale.

const SCALES = {
  // Wrench: Eb pentatonic minor  (see theory §7)
  wrench: [155.56, 184.99, 207.65, 233.08, 277.18,
           311.13, 369.99, 415.30, 466.16, 554.37],

  // Bodywork: D major pentatonic  (see theory §7)
  bodywork: [293.66, 329.63, 369.99, 440.00, 493.88,
             587.33, 659.25, 739.99, 880.00, 987.77],
  bodywork_rust: 261.63, // flat-seven (C4) for rust zone tension

  // Diagnostic: tritone-based pair  (see theory §7)
  diag_normal: 220.00,  // A3
  diag_fault:  311.13,  // Eb4 — tritone above A3
  diag_decoy:  233.08,  // Bb3 — minor second above A3 (subtle tension)

  // Precision: open C major voicing per beat  (see theory §7)
  precision: [130.81, 196.00, 261.63, 329.63, 392.00], // C3 G3 C4 E4 G4
};

// Timing window bonuses per skill level (fraction of step duration)
const SKILL_WINDOW_BONUS = {
  wrench:     [0, 0, 0, 0, 0, 0.05, 0.05, 0.05, 0.10, 0.10, 0.15, 0.15, 0.15, 0.20, 0.20, 0.20, 0.25, 0.25, 0.25, 0.25, 0.25],
  bodywork:   [0, 0, 0, 0, 0, 0.05, 0.05, 0.08, 0.10, 0.10, 0.15, 0.15, 0.20, 0.20, 0.20, 0.20, 0.25, 0.25, 0.25, 0.25, 0.25],
  diagnostic: [0, 0, 0, 0, 0, 0.04, 0.04, 0.06, 0.08, 0.08, 0.10, 0.10, 0.12, 0.12, 0.14, 0.14, 0.16, 0.16, 0.18, 0.18, 0.20],
  precision:  [0, 0, 0, 0, 0, 0.03, 0.03, 0.05, 0.05, 0.06, 0.08, 0.08, 0.08, 0.10, 0.10, 0.10, 0.12, 0.12, 0.12, 0.12, 0.12],
};


// ── Sound synthesisers ───────────────────────────────────────────────────────
//
// Each synthesiser: (ctx, out, vol, pitch) => handle | null
//
//   ctx   — AudioContext
//   out   — destination node (master gain)
//   vol   — per-call volume scalar 0–1
//   pitch — frequency multiplier (1.0 = normal)
//
// Returns null for one-shots, { stop() } for looping sounds.
// All oscillators use absolute timestamps so they clean up even if
// stop() is never called.  Looping sounds MUST be stopped by the caller.

const SYNTHS = {

  // ─────────────────────────────────────────────────────────────────────────
  //  LEGACY ONE-SHOT SOUNDS  (v1 — unchanged)
  // ─────────────────────────────────────────────────────────────────────────

  // ── ratchet variants ─────────────────────────────────────────────────────
  //
  // Metallic click = short bandpass-filtered noise burst (high-freq "tick")
  // + a sine thud with fast pitch drop (low-freq "thunk").
  // Three variants differ only in tuning so rapid clicks feel varied.

  _ratchet(ctx, out, vol, pitch, at) {
    const now = at || ctx.currentTime;

    const tickBuf  = noiseBuffer(ctx, 0.07);
    const tick     = ctx.createBufferSource();
    tick.buffer    = tickBuf;
    const tickBP   = filter(ctx, 'bandpass', 4200 * pitch, 2.2);
    const tickHP   = filter(ctx, 'highpass',  1800 * pitch, 0.7);
    const tickGain = ctx.createGain();
    adsr(tickGain.gain, ctx, { t: now, attack: 0.001, hold: 0.003, decay: 0.045, peak: 0.55 * vol });
    tick.connect(tickBP); tickBP.connect(tickHP); tickHP.connect(tickGain); tickGain.connect(out);
    tick.start(now); tick.stop(now + 0.07);

    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(170 * pitch, now);
    thud.frequency.exponentialRampToValueAtTime(55 * pitch, now + 0.055);
    const thudGain = ctx.createGain();
    adsr(thudGain.gain, ctx, { t: now, attack: 0.001, hold: 0.004, decay: 0.048, peak: 0.38 * vol });
    thud.connect(thudGain); thudGain.connect(out);
    thud.start(now); thud.stop(now + 0.08);

    return null;
  },

  ratchet_1(ctx, out, vol, pitch, at) { return SYNTHS._ratchet(ctx, out, vol, pitch * 1.00, at); },
  ratchet_2(ctx, out, vol, pitch, at) { return SYNTHS._ratchet(ctx, out, vol, pitch * 1.09, at); },
  ratchet_3(ctx, out, vol, pitch, at) { return SYNTHS._ratchet(ctx, out, vol, pitch * 0.92, at); },


  // ── impact — critical click / bolt breaking free ──────────────────────────
  //
  // Heavier than ratchet: low boom + metallic crack + short mid ring.

  impact(ctx, out, vol, pitch) {
    const now = ctx.currentTime;

    const boom = ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(110 * pitch, now);
    boom.frequency.exponentialRampToValueAtTime(28 * pitch, now + 0.18);
    const boomGain = ctx.createGain();
    adsr(boomGain.gain, ctx, { attack: 0.001, hold: 0.008, decay: 0.16, peak: 0.72 * vol });
    boom.connect(boomGain); boomGain.connect(out);
    boom.start(now); boom.stop(now + 0.22);

    const crackBuf  = noiseBuffer(ctx, 0.12);
    const crack     = ctx.createBufferSource();
    crack.buffer    = crackBuf;
    const crackHP   = filter(ctx, 'highpass', 2200 * pitch, 0.8);
    const crackGain = ctx.createGain();
    adsr(crackGain.gain, ctx, { attack: 0.001, hold: 0.004, decay: 0.09, peak: 0.48 * vol });
    crack.connect(crackHP); crackHP.connect(crackGain); crackGain.connect(out);
    crack.start(now); crack.stop(now + 0.13);

    const ring = ctx.createOscillator();
    ring.type = 'square';
    ring.frequency.value = 370 * pitch;
    const ringBP   = filter(ctx, 'bandpass', 370 * pitch, 9);
    const ringGain = ctx.createGain();
    adsr(ringGain.gain, ctx, { attack: 0.001, hold: 0.015, decay: 0.19, peak: 0.18 * vol });
    ring.connect(ringBP); ringBP.connect(ringGain); ringGain.connect(out);
    ring.start(now); ring.stop(now + 0.28);

    return null;
  },


  // ── stuck — hazard interrupt / seized bolt ────────────────────────────────
  //
  // Gritty buzzing + low "straining" sawtooth tone. Conveys strain.

  stuck(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    const dur = 0.5;

    const noiseBuf  = noiseBuffer(ctx, dur + 0.05);
    const noise     = ctx.createBufferSource();
    noise.buffer    = noiseBuf;
    const noiseBP   = filter(ctx, 'bandpass', 260 * pitch, 0.7);
    const noiseLP   = filter(ctx, 'lowpass',  750 * pitch, 0.9);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.52 * vol, now + 0.025);
    noiseGain.gain.setValueAtTime(0.52 * vol, now + dur - 0.12);
    noiseGain.gain.linearRampToValueAtTime(0, now + dur);

    const lfo     = ctx.createOscillator();
    lfo.type      = 'sawtooth';
    lfo.frequency.value = 44 * pitch;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value  = 0.25;
    lfo.connect(lfoGain);
    lfoGain.connect(noiseGain.gain);

    noise.connect(noiseBP); noiseBP.connect(noiseLP); noiseLP.connect(noiseGain); noiseGain.connect(out);
    noise.start(now); noise.stop(now + dur + 0.06);
    lfo.start(now);   lfo.stop(now + dur + 0.06);

    const strain     = ctx.createOscillator();
    strain.type      = 'sawtooth';
    strain.frequency.value = 75 * pitch;
    const strainLP   = filter(ctx, 'lowpass', 190, 0.6);
    const strainGain = ctx.createGain();
    adsr(strainGain.gain, ctx, { attack: 0.02, hold: dur - 0.14, decay: 0.1, peak: 0.28 * vol });
    strain.connect(strainLP); strainLP.connect(strainGain); strainGain.connect(out);
    strain.start(now); strain.stop(now + dur + 0.06);

    return null;
  },


  // ── torque_click — precision green zone ──────────────────────────────────

  torque_click(ctx, out, vol, pitch) {
    const now = ctx.currentTime;

    const noiseBuf  = noiseBuffer(ctx, 0.055);
    const noise     = ctx.createBufferSource();
    noise.buffer    = noiseBuf;
    const bp        = filter(ctx, 'bandpass', 5800 * pitch, 3.2);
    const noiseGain = ctx.createGain();
    adsr(noiseGain.gain, ctx, { attack: 0.001, hold: 0.002, decay: 0.032, peak: 0.48 * vol });
    noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(out);
    noise.start(now); noise.stop(now + 0.06);

    const tock = ctx.createOscillator();
    tock.type  = 'sine';
    tock.frequency.setValueAtTime(840 * pitch, now);
    tock.frequency.exponentialRampToValueAtTime(280 * pitch, now + 0.042);
    const tockGain = ctx.createGain();
    adsr(tockGain.gain, ctx, { attack: 0.001, hold: 0.003, decay: 0.038, peak: 0.28 * vol });
    tock.connect(tockGain); tockGain.connect(out);
    tock.start(now); tock.stop(now + 0.06);

    return null;
  },


  // ── miss — precision red zone ─────────────────────────────────────────────

  miss(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type  = 'square';
    osc.frequency.setValueAtTime(210 * pitch, now);
    osc.frequency.linearRampToValueAtTime(130 * pitch, now + 0.22);
    const lp   = filter(ctx, 'lowpass', 440, 0.8);
    const gain = ctx.createGain();
    adsr(gain.gain, ctx, { attack: 0.003, hold: 0.13, decay: 0.09, peak: 0.38 * vol });
    osc.connect(lp); lp.connect(gain); gain.connect(out);
    osc.start(now); osc.stop(now + 0.32);
    return null;
  },


  // ── aha — diagnosis correct ───────────────────────────────────────────────
  //
  // Two triangle-wave chime notes ascending: E5 → A5.

  aha(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    [[659, 0], [880, 0.12]].forEach(([freq, delay]) => {
      const t   = now + delay;
      const osc = ctx.createOscillator();
      osc.type  = 'triangle';
      osc.frequency.value = freq * pitch;
      const g = ctx.createGain();
      adsr(g.gain, ctx, { t, attack: 0.012, hold: 0.04, decay: 0.32, peak: 0.32 * vol });
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.42);
    });
    return null;
  },


  // ── wrong — diagnosis incorrect ───────────────────────────────────────────

  wrong(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type  = 'sawtooth';
    osc.frequency.setValueAtTime(280 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(110 * pitch, now + 0.28);
    const lp   = filter(ctx, 'lowpass', 520, 0.8);
    const gain = ctx.createGain();
    adsr(gain.gain, ctx, { attack: 0.004, hold: 0.16, decay: 0.1, peak: 0.38 * vol });
    osc.connect(lp); lp.connect(gain); gain.connect(out);
    osc.start(now); osc.stop(now + 0.35);
    return null;
  },


  // ── sand_loop — bodywork hold (legacy) ───────────────────────────────────
  //
  // Continuous sanding/abrasive sound with slow stroke LFO.
  // Returns { stop() } handle. Caller must call stop().

  sand_loop(ctx, out, vol) {
    const dur = 4.0;
    const buf = noiseBuffer(ctx, dur);
    const src = ctx.createBufferSource();
    src.buffer    = buf;
    src.loop      = true;
    src.loopStart = 0.1;
    src.loopEnd   = dur - 0.1;

    const bp1  = filter(ctx, 'bandpass', 2100, 0.75);
    const bp2  = filter(ctx, 'bandpass', 3900, 1.1);
    const lp   = filter(ctx, 'lowpass',  5500, 0.7);
    const merge = ctx.createGain();
    merge.gain.value = 1;

    const lfo     = ctx.createOscillator();
    lfo.type      = 'sine';
    lfo.frequency.value = 2.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value  = 0.14;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.28 * vol;

    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    src.connect(bp1);  bp1.connect(merge);
    src.connect(bp2);  bp2.connect(merge);
    merge.connect(lp); lp.connect(masterGain); masterGain.connect(out);
    src.start(); lfo.start();

    return {
      stop() {
        try { src.stop(); } catch (_) { /* already stopped */ }
        try { lfo.stop(); } catch (_) { /* already stopped */ }
      }
    };
  },


  // ── system_complete ───────────────────────────────────────────────────────
  //
  // Four-note ascending arpeggio: C5 E5 G5 C6 — outlines C major chord,
  // thematically linked to Precision's Torque Lock voicing (see theory §7).

  system_complete(ctx, out, vol, pitch) {
    const now   = ctx.currentTime;
    const notes = [523.25, 659.26, 783.99, 1046.50]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const t       = now + i * 0.12;
      const isFinal = i === notes.length - 1;

      const osc1 = ctx.createOscillator();
      osc1.type  = 'sine';
      osc1.frequency.value = freq * pitch;
      const g1 = ctx.createGain();
      adsr(g1.gain, ctx, { t, attack: 0.012, hold: 0.04, decay: isFinal ? 0.7 : 0.42, peak: 0.26 * vol });
      osc1.connect(g1); g1.connect(out);
      osc1.start(t); osc1.stop(t + (isFinal ? 0.9 : 0.6));

      const osc2 = ctx.createOscillator();
      osc2.type  = 'triangle';
      osc2.frequency.value = freq * 2 * pitch;
      const g2 = ctx.createGain();
      adsr(g2.gain, ctx, { t, attack: 0.012, hold: 0.02, decay: isFinal ? 0.5 : 0.28, peak: 0.07 * vol });
      osc2.connect(g2); g2.connect(out);
      osc2.start(t); osc2.stop(t + 0.55);
    });
    return null;
  },


  // ── engine_start ──────────────────────────────────────────────────────────
  //
  // Three phases: Crank → Catch → Idle.
  // See original comments above the synthesiser.

  engine_start(ctx, out, vol, pitch) {
    const now = ctx.currentTime;

    // Phase 1: Crank
    const crankDuration = 2.1;
    const crankPulseHz  = 6.5;
    const pulseCount    = Math.floor(crankDuration * crankPulseHz);
    const crankBuf      = noiseBuffer(ctx, 0.15);
    for (let i = 0; i < pulseCount; i++) {
      const t        = now + i / crankPulseHz;
      const progress = i / pulseCount;
      const src = ctx.createBufferSource();
      src.buffer = crankBuf;
      const bp = filter(ctx, 'bandpass', (110 + i * 2) * pitch, 0.55);
      const lp = filter(ctx, 'lowpass',  380 * pitch, 0.7);
      const g  = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime((0.18 + progress * 0.28) * vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(out);
      src.start(t); src.stop(t + 0.15);
    }

    // Phase 2: Catch
    const catchT    = now + crankDuration;
    const catchBuf  = noiseBuffer(ctx, 0.28);
    const catchSrc  = ctx.createBufferSource();
    catchSrc.buffer = catchBuf;
    const catchBP   = filter(ctx, 'bandpass', 180 * pitch, 0.6);
    const catchGain = ctx.createGain();
    catchGain.gain.setValueAtTime(0, catchT);
    catchGain.gain.linearRampToValueAtTime(0.65 * vol, catchT + 0.018);
    catchGain.gain.exponentialRampToValueAtTime(0.0001, catchT + 0.28);
    catchSrc.connect(catchBP); catchBP.connect(catchGain); catchGain.connect(out);
    catchSrc.start(catchT); catchSrc.stop(catchT + 0.3);

    const pop = ctx.createOscillator();
    pop.type  = 'sine';
    pop.frequency.setValueAtTime(180 * pitch, catchT);
    pop.frequency.exponentialRampToValueAtTime(60 * pitch, catchT + 0.22);
    const popGain = ctx.createGain();
    adsr(popGain.gain, ctx, { t: catchT, attack: 0.003, hold: 0.01, decay: 0.2, peak: 0.45 * vol });
    pop.connect(popGain); popGain.connect(out);
    pop.start(catchT); pop.stop(catchT + 0.3);

    // Phase 3: Idle
    const idleT   = catchT + 0.22;
    const idleDur = 3.6;
    const firingHz  = 13 * pitch;
    const firing    = ctx.createOscillator();
    firing.type     = 'sawtooth';
    firing.frequency.setValueAtTime(firingHz * 1.18, idleT);
    firing.frequency.linearRampToValueAtTime(firingHz * 0.87, idleT + 0.9);
    firing.frequency.linearRampToValueAtTime(firingHz,        idleT + 1.8);
    const firingLP   = filter(ctx, 'lowpass', 130, 0.55);
    const firingGain = ctx.createGain();
    firingGain.gain.setValueAtTime(0, idleT);
    firingGain.gain.linearRampToValueAtTime(0.32 * vol, idleT + 0.35);
    firingGain.gain.setValueAtTime(0.32 * vol, idleT + idleDur - 0.5);
    firingGain.gain.linearRampToValueAtTime(0, idleT + idleDur);
    firing.connect(firingLP); firingLP.connect(firingGain); firingGain.connect(out);
    firing.start(idleT); firing.stop(idleT + idleDur + 0.05);

    const rumbleBuf  = noiseBuffer(ctx, idleDur + 0.1);
    const rumbleSrc  = ctx.createBufferSource();
    rumbleSrc.buffer = rumbleBuf;
    const rumbleLP   = filter(ctx, 'lowpass', 200, 0.5);
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0, idleT);
    rumbleGain.gain.linearRampToValueAtTime(0.28 * vol, idleT + 0.4);
    rumbleGain.gain.setValueAtTime(0.28 * vol, idleT + idleDur - 0.5);
    rumbleGain.gain.linearRampToValueAtTime(0, idleT + idleDur);
    rumbleSrc.connect(rumbleLP); rumbleLP.connect(rumbleGain); rumbleGain.connect(out);
    rumbleSrc.start(idleT); rumbleSrc.stop(idleT + idleDur + 0.1);

    const hissHz  = 620 * pitch;
    const hiss    = ctx.createOscillator();
    hiss.type     = 'triangle';
    hiss.frequency.setValueAtTime(hissHz * 1.2, idleT);
    hiss.frequency.linearRampToValueAtTime(hissHz, idleT + 1.5);
    const hissLP   = filter(ctx, 'bandpass', hissHz, 3);
    const hissGain = ctx.createGain();
    hissGain.gain.setValueAtTime(0, idleT);
    hissGain.gain.linearRampToValueAtTime(0.10 * vol, idleT + 0.5);
    hissGain.gain.setValueAtTime(0.10 * vol, idleT + idleDur - 0.4);
    hissGain.gain.linearRampToValueAtTime(0, idleT + idleDur);
    hiss.connect(hissLP); hissLP.connect(hissGain); hissGain.connect(out);
    hiss.start(idleT); hiss.stop(idleT + idleDur + 0.05);

    return null;
  },


  // ── gacha reveals ─────────────────────────────────────────────────────────

  gacha_3(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    [[440, 0], [659.26, 0.16]].forEach(([freq, delay]) => {
      const t   = now + delay;
      const osc = ctx.createOscillator();
      osc.type  = 'triangle';
      osc.frequency.value = freq * pitch;
      const g = ctx.createGain();
      adsr(g.gain, ctx, { t, attack: 0.013, hold: 0.04, decay: 0.44, peak: 0.3 * vol });
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.55);
    });
    return null;
  },

  gacha_4(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    [[523.25, 0], [659.26, 0.11], [783.99, 0.22]].forEach(([freq, delay]) => {
      const t = now + delay;
      const osc1 = ctx.createOscillator();
      osc1.type  = 'sine';
      osc1.frequency.value = freq * pitch;
      const g1 = ctx.createGain();
      adsr(g1.gain, ctx, { t, attack: 0.012, hold: 0.035, decay: 0.55, peak: 0.28 * vol });
      osc1.connect(g1); g1.connect(out);
      osc1.start(t); osc1.stop(t + 0.65);
      const osc2 = ctx.createOscillator();
      osc2.type  = 'triangle';
      osc2.frequency.value = freq * 2 * pitch;
      const g2 = ctx.createGain();
      adsr(g2.gain, ctx, { t, attack: 0.012, hold: 0.02, decay: 0.35, peak: 0.07 * vol });
      osc2.connect(g2); g2.connect(out);
      osc2.start(t); osc2.stop(t + 0.45);
    });
    const shimmerT   = now + 0.34;
    const shimmerBuf = noiseBuffer(ctx, 0.22);
    const shimmerSrc = ctx.createBufferSource();
    shimmerSrc.buffer = shimmerBuf;
    const shimmerHP   = filter(ctx, 'highpass', 4800, 0.8);
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0, shimmerT);
    shimmerGain.gain.linearRampToValueAtTime(0.14 * vol, shimmerT + 0.025);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, shimmerT + 0.2);
    shimmerSrc.connect(shimmerHP); shimmerHP.connect(shimmerGain); shimmerGain.connect(out);
    shimmerSrc.start(shimmerT); shimmerSrc.stop(shimmerT + 0.24);
    return null;
  },

  gacha_5(ctx, out, vol, pitch) {
    const now = ctx.currentTime;

    const buildBuf  = noiseBuffer(ctx, 0.6);
    const buildSrc  = ctx.createBufferSource();
    buildSrc.buffer = buildBuf;
    const buildLP   = filter(ctx, 'lowpass', 280, 0.6);
    const buildGain = ctx.createGain();
    buildGain.gain.setValueAtTime(0, now);
    buildGain.gain.linearRampToValueAtTime(0.38 * vol, now + 0.44);
    buildGain.gain.linearRampToValueAtTime(0, now + 0.58);
    buildSrc.connect(buildLP); buildLP.connect(buildGain); buildGain.connect(out);
    buildSrc.start(now); buildSrc.stop(now + 0.62);

    const riseSrc  = ctx.createBufferSource();
    riseSrc.buffer = noiseBuffer(ctx, 0.4);
    const riseHP   = filter(ctx, 'highpass', 3500, 0.9);
    const riseGain = ctx.createGain();
    riseGain.gain.setValueAtTime(0, now + 0.1);
    riseGain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.48);
    riseGain.gain.linearRampToValueAtTime(0, now + 0.52);
    riseSrc.connect(riseHP); riseHP.connect(riseGain); riseGain.connect(out);
    riseSrc.start(now + 0.1); riseSrc.stop(now + 0.55);

    const hitT     = now + 0.50;
    const hitFreqs = [261.63, 392.00, 523.25, 659.26, 783.99];
    hitFreqs.forEach((freq, i) => {
      const type = i < 2 ? 'sine' : 'triangle';
      const peak = (0.24 - i * 0.025) * vol;
      const tail = 1.1 + (hitFreqs.length - i) * 0.05;
      const osc  = ctx.createOscillator();
      osc.type   = type;
      osc.frequency.value = freq * pitch;
      const g = ctx.createGain();
      adsr(g.gain, ctx, { t: hitT, attack: 0.014, hold: 0.035, decay: tail, peak });
      osc.connect(g); g.connect(out);
      osc.start(hitT); osc.stop(hitT + tail + 0.2);
    });

    [0, 0.07, 0.16].forEach((delay, i) => {
      const t   = hitT + delay;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 0.18);
      const hp  = filter(ctx, 'highpass', (3800 + i * 900) * pitch, 0.9);
      const g   = ctx.createGain();
      const pk  = (0.22 - i * 0.06) * vol;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(pk, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      src.connect(hp); hp.connect(g); g.connect(out);
      src.start(t); src.stop(t + 0.2);
    });

    [[1046.50, 0.38], [1318.51, 0.52], [1567.98, 0.68]].forEach(([freq, delay]) => {
      const t   = hitT + delay;
      const osc = ctx.createOscillator();
      osc.type  = 'sine';
      osc.frequency.value = freq * pitch;
      const g = ctx.createGain();
      adsr(g.gain, ctx, { t, attack: 0.01, hold: 0.02, decay: 0.45, peak: 0.10 * vol });
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.52);
    });

    return null;
  },


  // ── ui_click ──────────────────────────────────────────────────────────────

  ui_click(ctx, out, vol, pitch) {
    const now       = ctx.currentTime;
    const noiseBuf  = noiseBuffer(ctx, 0.04);
    const noise     = ctx.createBufferSource();
    noise.buffer    = noiseBuf;
    const bp        = filter(ctx, 'bandpass', 1100 * pitch, 2.8);
    const noiseGain = ctx.createGain();
    adsr(noiseGain.gain, ctx, { attack: 0.001, hold: 0.002, decay: 0.022, peak: 0.22 * vol });
    noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(out);
    noise.start(now); noise.stop(now + 0.04);

    const tone     = ctx.createOscillator();
    tone.type      = 'sine';
    tone.frequency.value = 460 * pitch;
    const toneGain = ctx.createGain();
    adsr(toneGain.gain, ctx, { attack: 0.001, hold: 0.003, decay: 0.018, peak: 0.10 * vol });
    tone.connect(toneGain); toneGain.connect(out);
    tone.start(now); tone.stop(now + 0.04);

    return null;
  },


  // ─────────────────────────────────────────────────────────────────────────
  //  RHYTHM MECHANIC SOUNDS  (v2 — new)
  // ─────────────────────────────────────────────────────────────────────────

  // ── wrench_call_beat ──────────────────────────────────────────────────────
  //
  // The "teaching" beat played during the call phase of Wrench Work.
  // Distinctly more prominent than a regular ratchet — the player needs
  // to hear the call clearly to echo it back.
  //
  // Structurally: same noise-tick + thud as _ratchet, but with a short
  // metallic ring layered on top.  The ring gives it "presence" — it
  // occupies its own frequency space above the click noise and can be
  // clearly heard through other ambient sounds.

  wrench_call_beat(ctx, out, vol, pitch, at) {
    const now = at || ctx.currentTime;

    // The base ratchet (reuse at slightly higher gain)
    SYNTHS._ratchet(ctx, out, vol * 0.85, pitch, now);

    // Metallic overtone ring — distinguishes "call" from player click
    const ring = ctx.createOscillator();
    ring.type  = 'triangle';
    ring.frequency.setValueAtTime(2400 * pitch, now);
    ring.frequency.exponentialRampToValueAtTime(1100 * pitch, now + 0.06);
    const ringBP   = filter(ctx, 'bandpass', 1800 * pitch, 4);
    const ringGain = ctx.createGain();
    adsr(ringGain.gain, ctx, { t: now, attack: 0.001, hold: 0.005, decay: 0.055, peak: 0.22 * vol });
    ring.connect(ringBP); ringBP.connect(ringGain); ringGain.connect(out);
    ring.start(now); ring.stop(now + 0.09);

    return null;
  },


  // ── wrench_trap_beat ──────────────────────────────────────────────────────
  //
  // Played for trap beats during the call phase.  Same ratchet transient as
  // the normal call beat (so it reads as part of the rhythm) but the consonant
  // triangle ring is replaced by dissonant layers so the player can tell "skip
  // this" from "tap this" purely by ear:
  //   1. Sawtooth buzz Eb4→Eb3 (tritone descent, 70 ms)
  //      The tritone is the most dissonant interval in the Eb pentatonic minor
  //      scale already used for Wrench (theory §7).
  //   2. Square ping at 880 Hz (highpassed, 28 ms decay) — electric "zap".

  wrench_trap_beat(ctx, out, vol, pitch, at) {
    const now = at || ctx.currentTime;
    SYNTHS._ratchet(ctx, out, vol * 0.90, pitch, now);

    const buzz     = ctx.createOscillator();
    buzz.type      = 'sawtooth';
    buzz.frequency.setValueAtTime(311 * pitch, now);
    buzz.frequency.exponentialRampToValueAtTime(155 * pitch, now + 0.07);
    const buzzBP   = filter(ctx, 'bandpass', 230 * pitch, 3.5);
    const buzzGain = ctx.createGain();
    adsr(buzzGain.gain, ctx, { t: now, attack: 0.001, hold: 0.004, decay: 0.065, peak: 0.30 * vol });
    buzz.connect(buzzBP); buzzBP.connect(buzzGain); buzzGain.connect(out);
    buzz.start(now); buzz.stop(now + 0.10);

    const ping     = ctx.createOscillator();
    ping.type      = 'square';
    ping.frequency.value = 880 * pitch;
    const pingHP   = filter(ctx, 'highpass', 700 * pitch, 1.5);
    const pingGain = ctx.createGain();
    adsr(pingGain.gain, ctx, { t: now, attack: 0.001, hold: 0.002, decay: 0.028, peak: 0.12 * vol });
    ping.connect(pingHP); pingHP.connect(pingGain); pingGain.connect(out);
    ping.start(now); ping.stop(now + 0.05);

    return null;
  },


  // ── wrench_combo_bump ─────────────────────────────────────────────────────
  //
  // Two-note ascending interval played at each combo level milestone.
  // Level 1→2: minor third (E4→G4, ratio 6:5)
  // Level 2→3: perfect fourth (G4→C5, ratio 4:3)
  // Level 3→4: perfect fifth  (C5→G5, ratio 3:2)
  //
  // Intervals grow in musical "power" as the combo climbs, sonically
  // mirroring the increasing momentum.  Fifths and fourths are the
  // most consonant intervals after the octave (see theory §7).
  //
  // The 'pitch' parameter here encodes the combo level (1–4) as a
  // multiplier: pass 1.0/2.0/3.0/4.0 for levels 1–4.

  wrench_combo_bump(ctx, out, vol, pitch) {
    const now   = ctx.currentTime;
    const level = Math.round(Math.max(1, Math.min(4, pitch)));
    // Interval pairs per level: [low, high] in Hz
    const pairs = [
      null,
      [329.63, 392.00],  // level 1: E4–G4 (minor third)
      [392.00, 523.25],  // level 2: G4–C5 (perfect fourth)
      [523.25, 783.99],  // level 3: C5–G5 (perfect fifth)
      [523.25, 1046.50], // level 4: C5–C6 (octave — most powerful)
    ];
    const [f1, f2] = pairs[level];
    [[f1, 0], [f2, 0.08]].forEach(([freq, delay]) => {
      const t   = now + delay;
      const osc = ctx.createOscillator();
      osc.type  = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      adsr(g.gain, ctx, { t, attack: 0.008, hold: 0.015, decay: 0.14, peak: 0.18 * vol });
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.22);
    });
    return null;
  },


  // ── wrench_sequence_break ─────────────────────────────────────────────────
  //
  // Quick descending slide communicating "wrong" — tapped on a rest beat,
  // or missed a called beat.  Tonally unpleasant without being harsh.

  wrench_sequence_break(ctx, out, vol) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type  = 'square';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(88, now + 0.16);
    const lp   = filter(ctx, 'lowpass', 600, 0.7);
    const gain = ctx.createGain();
    adsr(gain.gain, ctx, { attack: 0.002, hold: 0.04, decay: 0.11, peak: 0.30 * vol });
    osc.connect(lp); lp.connect(gain); gain.connect(out);
    osc.start(now); osc.stop(now + 0.25);
    return null;
  },


  // ── metronome_tick — count-in beat ───────────────────────────────────────
  //
  // A clean woodblock-style click used during the 4-beat count-in before
  // the first Wrench pattern.  Two tiers:
  //   pitch = 1  → normal beat  (high, short)
  //   pitch = 2  → accent beat  (lower, slightly heavier — signals the "1" coming)
  //
  // Structurally: bandpass noise burst (the "wood" of the woodblock) +
  // a short sine pitch drop (body resonance).  Kept deliberately dry so
  // it doesn't bleed into the pattern that follows.

  metronome_tick(ctx, out, vol, pitch) {
    const now      = ctx.currentTime;
    const isAccent = pitch >= 2;

    // Transient click — bandpass filtered noise
    const noiseBuf  = noiseBuffer(ctx, 0.04);
    const noise     = ctx.createBufferSource();
    noise.buffer    = noiseBuf;
    const bp        = filter(ctx, 'bandpass', isAccent ? 1400 : 2200, 2.5);
    const noiseGain = ctx.createGain();
    adsr(noiseGain.gain, ctx, { attack: 0.001, hold: 0.002, decay: 0.028, peak: 0.45 * vol });
    noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(out);
    noise.start(now); noise.stop(now + 0.05);

    // Body resonance — accent is lower/longer (more weight)
    const tone     = ctx.createOscillator();
    tone.type      = 'sine';
    tone.frequency.setValueAtTime(isAccent ? 280 : 420, now);
    tone.frequency.exponentialRampToValueAtTime(isAccent ? 90 : 180, now + 0.055);
    const toneGain = ctx.createGain();
    adsr(toneGain.gain, ctx, {
      attack: 0.001, hold: 0.004,
      decay:  isAccent ? 0.065 : 0.040,
      peak:   (isAccent ? 0.38 : 0.24) * vol,
    });
    tone.connect(toneGain); toneGain.connect(out);
    tone.start(now); tone.stop(now + 0.09);

    return null;
  },


  // ── bodywork_pad ──────────────────────────────────────────────────────────
  //
  // The core of the Bodywork mechanic's soundscape: a sustaining pad tone
  // that represents one zone being worked.
  //
  // Two slightly detuned sine oscillators (±4 cents) create a natural
  // chorus effect.  A soft LFO at 0.4 Hz swells the amplitude gently.
  // A lowpass filter at 900 Hz keeps it warm and non-fatiguing.
  //
  // 'pitch' encodes a FREQUENCY RATIO against A4 (440 Hz) as the reference.
  // Pass the actual Hz value directly — the synth ignores the "1.0 = normal"
  // convention and treats pitch as an absolute frequency.  The AudioManager
  // playBodyworkPad() method handles this.
  //
  // 'vol' encodes both volume (0–1) and duration via a compound encoding:
  //   vol  = actualVolume (0–1)
  //   pitch = targetFrequency (Hz, bypasses ratio convention)
  //
  // duration is passed via the AudioManager's internal call, not through
  // the SYNTHS interface.  The synth itself plays for 4 seconds max and
  // the handle's stop() method fades it out early if needed.
  //
  // Returns a { stop() } handle.

  bodywork_pad(ctx, out, vol, pitch) {
    const freq = pitch; // absolute Hz (see above)

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type  = 'sine';
    osc2.type  = 'sine';
    // Detune ±4 cents: 2^(4/1200) ≈ 1.00231
    osc1.frequency.value = freq * 1.00231;
    osc2.frequency.value = freq * 0.99770;

    const lp   = filter(ctx, 'lowpass', 900, 0.8);
    const gain = ctx.createGain();

    const lfo      = ctx.createOscillator();
    lfo.type       = 'sine';
    lfo.frequency.value = 0.4;
    const lfoGain  = ctx.createGain();
    lfoGain.gain.value = 0.06; // ±6% amplitude swell

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.20 * vol, now + 0.25); // soft attack

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(gain);
    gain.connect(out);

    osc1.start(now); osc2.start(now); lfo.start(now);

    // Schedule auto-stop at 4s (will be stopped earlier by caller via handle)
    const autoStop = now + 4.0;
    osc1.stop(autoStop); osc2.stop(autoStop); lfo.stop(autoStop);

    return {
      stop(fadeTime = 0.15) {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0.0001, t + fadeTime);
        try { osc1.stop(t + fadeTime + 0.02); } catch (_) { /* already stopped */ }
        try { osc2.stop(t + fadeTime + 0.02); } catch (_) { /* already stopped */ }
        try { lfo.stop(t + fadeTime + 0.02);  } catch (_) { /* already stopped */ }
      }
    };
  },


  // ── bodywork_zone_perfect ─────────────────────────────────────────────────
  //
  // A brief, clean resolution sound when a zone hold is released at the
  // perfect moment — the ring expansion completing exactly as the hold ends.
  // Uses the same tonal space as the pad melody but with a brighter attack.

  bodywork_zone_perfect(ctx, out, vol) {
    const now = ctx.currentTime;
    // Short chime: sine at root of D major pentatonic (D5, 587 Hz)
    const osc = ctx.createOscillator();
    osc.type  = 'sine';
    osc.frequency.value = 587.33;
    const shimmer = ctx.createOscillator();
    shimmer.type  = 'triangle';
    shimmer.frequency.value = 1174.66; // D6 octave up
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    adsr(gain1.gain, ctx, { attack: 0.008, hold: 0.01, decay: 0.22, peak: 0.28 * vol });
    adsr(gain2.gain, ctx, { attack: 0.008, hold: 0.005, decay: 0.14, peak: 0.08 * vol });
    osc.connect(gain1);      gain1.connect(out);
    shimmer.connect(gain2);  gain2.connect(out);
    osc.start(now);     osc.stop(now + 0.3);
    shimmer.start(now); shimmer.stop(now + 0.22);
    return null;
  },


  // ── bodywork_zone_rush ────────────────────────────────────────────────────
  //
  // Small penalty sound for releasing a zone hold too early.
  // Short downward wobble — communicates "not quite" without harshness.

  bodywork_zone_rush(ctx, out, vol) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type  = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(294, now + 0.12);
    const gain = ctx.createGain();
    adsr(gain.gain, ctx, { attack: 0.003, hold: 0.04, decay: 0.08, peak: 0.18 * vol });
    osc.connect(gain); gain.connect(out);
    osc.start(now); osc.stop(now + 0.2);
    return null;
  },


  // ── bodywork_rust ─────────────────────────────────────────────────────────
  //
  // Looping friction/grinding sound for rust zones — a harsher variant of
  // sand_loop.  The coarser bandpass bands and faster LFO communicate the
  // extra physical effort rust zones require.
  //
  // Also adds a subtle tone at 261 Hz (C4 = the "flat-seven" outside the
  // D major pentatonic scale — see theory §7) for harmonic tension.
  //
  // Returns { stop() } handle. Caller must call stop().

  bodywork_rust(ctx, out, vol) {
    const dur = 4.0;
    const buf = noiseBuffer(ctx, dur);
    const src = ctx.createBufferSource();
    src.buffer    = buf;
    src.loop      = true;
    src.loopStart = 0.1;
    src.loopEnd   = dur - 0.1;

    // Coarser bands than sand_loop
    const bp1   = filter(ctx, 'bandpass',  900, 0.6);
    const bp2   = filter(ctx, 'bandpass', 2400, 0.8);
    const hp    = filter(ctx, 'highpass', 1200, 0.5);
    const merge = ctx.createGain();
    merge.gain.value = 1;

    // Faster LFO (irregular grinding feel)
    const lfo     = ctx.createOscillator();
    lfo.type      = 'sawtooth'; // sawtooth gives asymmetric "scratch" feel
    lfo.frequency.value = 4.8;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value  = 0.20;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.24 * vol;

    // Tension tone (C4 flat-seven)
    const tenseTone = ctx.createOscillator();
    tenseTone.type  = 'sine';
    tenseTone.frequency.value = 261.63;
    const toneLP   = filter(ctx, 'lowpass', 500, 0.8);
    const toneGain = ctx.createGain();
    toneGain.gain.value = 0.06 * vol;

    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    src.connect(bp1);  bp1.connect(merge);
    src.connect(bp2);  bp2.connect(merge);
    merge.connect(hp); hp.connect(masterGain); masterGain.connect(out);
    tenseTone.connect(toneLP); toneLP.connect(toneGain); toneGain.connect(out);

    src.start(); lfo.start(); tenseTone.start();

    return {
      stop() {
        try { src.stop();       } catch (_) { /* already stopped */ }
        try { lfo.stop();       } catch (_) { /* already stopped */ }
        try { tenseTone.stop(); } catch (_) { /* already stopped */ }
      }
    };
  },


  // ── diag_scan_pulse ───────────────────────────────────────────────────────
  //
  // One beat of the diagnostic scan stream.  Plays a short tone at the
  // "normal signal" frequency or the "fault" frequency depending on the
  // isFault flag, which is encoded in the pitch parameter:
  //   pitch = 1.0 → normal signal  (A3, 220 Hz)
  //   pitch = 2.0 → real fault     (Eb4, 311 Hz — tritone)
  //   pitch = 3.0 → decoy fault    (Bb3, 233 Hz — minor second)
  //
  // See theory §7 for the tritone/minor-second rationale.

  diag_scan_pulse(ctx, out, vol, pitch, at) {
    const now  = at || ctx.currentTime;
    const type = Math.round(pitch); // 1, 2, or 3
    const freq = type === 2 ? SCALES.diag_fault
               : type === 3 ? SCALES.diag_decoy
               :               SCALES.diag_normal;

    const osc = ctx.createOscillator();
    osc.type  = 'square';
    osc.frequency.value = freq;

    const lp   = filter(ctx, 'lowpass', freq * 3, 0.7);
    const gain = ctx.createGain();
    // Normal pulse: short clean blip.  Fault: slightly longer + louder.
    const duration = type === 1 ? 0.055 : 0.08;
    const peak     = type === 1 ? 0.18 * vol : 0.26 * vol;
    adsr(gain.gain, ctx, { t: now, attack: 0.004, hold: duration - 0.015, decay: 0.03, peak });

    osc.connect(lp); lp.connect(gain); gain.connect(out);
    osc.start(now); osc.stop(now + duration + 0.04);
    return null;
  },


  // ── diag_correct_flag ────────────────────────────────────────────────────
  //
  // Short confirming beep: two ascending tones (A4→E5, a perfect fifth).
  // The fifth is the most "confirming" interval — assertive, not sentimental.

  diag_correct_flag(ctx, out, vol) {
    const now = ctx.currentTime;
    [[440, 0], [659.26, 0.07]].forEach(([freq, delay]) => {
      const t   = now + delay;
      const osc = ctx.createOscillator();
      osc.type  = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      adsr(g.gain, ctx, { t, attack: 0.005, hold: 0.018, decay: 0.09, peak: 0.22 * vol });
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.15);
    });
    return null;
  },


  // ── diag_wrong_flag ───────────────────────────────────────────────────────
  //
  // Wrong button pressed — identified the wrong fault type.
  // Dissonant minor second descent (D4→C#4): closely pitched, clashing.

  diag_wrong_flag(ctx, out, vol) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type  = 'sawtooth';
    osc.frequency.setValueAtTime(293.66, now);    // D4
    osc.frequency.linearRampToValueAtTime(277.18, now + 0.18); // C#4 (minor second below)
    const lp   = filter(ctx, 'lowpass', 600, 0.75);
    const gain = ctx.createGain();
    adsr(gain.gain, ctx, { attack: 0.004, hold: 0.10, decay: 0.10, peak: 0.30 * vol });
    osc.connect(lp); lp.connect(gain); gain.connect(out);
    osc.start(now); osc.stop(now + 0.28);
    return null;
  },


  // ── diag_false_flag ───────────────────────────────────────────────────────
  //
  // Pressed a button when no fault was at the window — false alarm.
  // Quick noise burst without any tonal content: communicates an error
  // without the "wrong diagnosis" of diag_wrong_flag.

  diag_false_flag(ctx, out, vol) {
    const now    = ctx.currentTime;
    const noiseBuf = noiseBuffer(ctx, 0.06);
    const src    = ctx.createBufferSource();
    src.buffer   = noiseBuf;
    const hp     = filter(ctx, 'highpass', 3000, 0.9);
    const gain   = ctx.createGain();
    adsr(gain.gain, ctx, { attack: 0.002, hold: 0.01, decay: 0.045, peak: 0.24 * vol });
    src.connect(hp); hp.connect(gain); gain.connect(out);
    src.start(now); src.stop(now + 0.07);
    return null;
  },


  // ── precision_tick ────────────────────────────────────────────────────────
  //
  // The core pendulum metronome sound.
  //
  // On-beat (pendulum crossing center, left→right):
  //   Triangle oscillator at 700 Hz — bright, clean, easy to locate in time.
  //
  // Off-beat (pendulum reaching extreme, about to reverse):
  //   Softer triangle at 480 Hz — audible but subdued.  Marks the arc's
  //   turning point so the player can anticipate the next center crossing.
  //
  // The auditory contrast between the two ticks is deliberate: the high
  // tick marks "tap here", the low tick marks "turning point, tap coming".
  //
  // pitch param: 1.0 = on-beat center, 0.0 = off-beat extreme (turning point)

  precision_tick(ctx, out, vol, pitch) {
    const now      = ctx.currentTime;
    const isOnBeat = pitch >= 0.5;
    const freq     = isOnBeat ? 700 : 480;
    const peak     = isOnBeat ? 0.35 * vol : 0.15 * vol;
    const decay    = isOnBeat ? 0.040 : 0.060;

    const osc  = ctx.createOscillator();
    osc.type   = 'triangle';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    adsr(gain.gain, ctx, { attack: 0.001, hold: 0.002, decay, peak });
    osc.connect(gain); gain.connect(out);
    osc.start(now); osc.stop(now + decay + 0.02);
    return null;
  },


  // ── precision_window_chime ────────────────────────────────────────────────
  //
  // A very brief chirp that fires as the pendulum enters the valid tap window.
  // Gives players an audio cue for when to tap, supplementing the visual glow.
  // Must be short enough not to mask the tap's own feedback sound.
  // Frequency: 880 Hz (A5) — above the ratchet/mechanical sounds, easy to hear.

  precision_window_chime(ctx, out, vol) {
    const now  = ctx.currentTime;
    const osc  = ctx.createOscillator();
    osc.type   = 'sine';
    osc.frequency.value = 880;
    const gain = ctx.createGain();
    adsr(gain.gain, ctx, { attack: 0.002, hold: 0.004, decay: 0.022, peak: 0.12 * vol });
    osc.connect(gain); gain.connect(out);
    osc.start(now); osc.stop(now + 0.035);
    return null;
  },


  // ── precision_beat_snap ───────────────────────────────────────────────────
  //
  // Each successful beat completion in a torque sequence.
  // Pitch RISES with each step: root → G → octave → major third → fifth.
  // This maps to the C major open voicing documented in theory §7.
  //
  // The rising pitch sequence creates musical tension that resolves
  // only when the sequence completes — the Zeigarnik effect applied to
  // pitch: the incomplete chord wants completion.
  //
  // pitch param encodes step index (0–4, maps to SCALES.precision array).
  // Pass the raw step index (0-based).

  precision_beat_snap(ctx, out, vol, pitch) {
    const now   = ctx.currentTime;
    const step  = Math.round(Math.max(0, Math.min(4, pitch)));
    const freq  = SCALES.precision[step]; // C3 G3 C4 E4 G4

    // Sharp noise component (the "click" feel of the torque wrench)
    const noiseBuf  = noiseBuffer(ctx, 0.05);
    const noiseSrc  = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const nbp       = filter(ctx, 'bandpass', 4500, 2.5);
    const noiseGain = ctx.createGain();
    adsr(noiseGain.gain, ctx, { attack: 0.001, hold: 0.002, decay: 0.030, peak: 0.35 * vol });
    noiseSrc.connect(nbp); nbp.connect(noiseGain); noiseGain.connect(out);
    noiseSrc.start(now); noiseSrc.stop(now + 0.06);

    // Tone component (the musical pitch building the chord)
    const osc  = ctx.createOscillator();
    osc.type   = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    // Later steps in the sequence ring out longer (builds chord)
    const decay = 0.15 + step * 0.08;
    adsr(gain.gain, ctx, { attack: 0.004, hold: 0.010, decay, peak: 0.22 * vol });
    osc.connect(gain); gain.connect(out);
    osc.start(now); osc.stop(now + decay + 0.08);

    return null;
  },


  // ── precision_sequence_complete ──────────────────────────────────────────
  //
  // A full N-beat torque sequence was completed.
  //
  // Normal completion: short ascending two-note resolution (C4→G4, fifth).
  // Torque Lock entry (isTorqueLock encoded as pitch=2.0): the same fifth
  // but with a brief chord bloom — all three root/fifth/octave notes sound
  // together, then fade. More dramatic than the normal snap.

  precision_sequence_complete(ctx, out, vol, pitch) {
    const now        = ctx.currentTime;
    const isTorqueLock = pitch >= 1.5;

    if (isTorqueLock) {
      // Bloom: C4 G4 C5 together
      [[261.63, 0], [392.00, 0.025], [523.25, 0.05]].forEach(([freq, delay]) => {
        const t   = now + delay;
        const osc = ctx.createOscillator();
        osc.type  = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        adsr(g.gain, ctx, { t, attack: 0.010, hold: 0.02, decay: 0.45, peak: 0.22 * vol });
        osc.connect(g); g.connect(out);
        osc.start(t); osc.stop(t + 0.55);
      });
    } else {
      // Normal: clean two-note fifth
      [[523.25, 0], [783.99, 0.07]].forEach(([freq, delay]) => {
        const t   = now + delay;
        const osc = ctx.createOscillator();
        osc.type  = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        adsr(g.gain, ctx, { t, attack: 0.007, hold: 0.012, decay: 0.22, peak: 0.20 * vol });
        osc.connect(g); g.connect(out);
        osc.start(t); osc.stop(t + 0.32);
      });
    }
    return null;
  },


  // ── precision_sequence_break ─────────────────────────────────────────────
  //
  // Sequence broken — tapped out of the valid window.
  // If in Torque Lock, the built-up chord collapses (played as a downward
  // arpeggio of the same notes, then silence).
  // If not in Torque Lock, a simple descending two-note fall.
  //
  // pitch param: 1.0 = normal break, 2.0 = Torque Lock break (more dramatic)

  precision_sequence_break(ctx, out, vol, pitch) {
    const now           = ctx.currentTime;
    const isTorqueLock  = pitch >= 1.5;

    if (isTorqueLock) {
      // Chord collapse: C5 G4 C4 in fast descending arpeggio
      [[523.25, 0], [392.00, 0.04], [261.63, 0.08]].forEach(([freq, delay]) => {
        const t   = now + delay;
        const osc = ctx.createOscillator();
        osc.type  = 'sawtooth';
        osc.frequency.value = freq;
        const lp   = filter(ctx, 'lowpass', freq * 2.5, 0.7);
        const g    = ctx.createGain();
        adsr(g.gain, ctx, { t, attack: 0.002, hold: 0.01, decay: 0.12, peak: 0.18 * vol });
        osc.connect(lp); lp.connect(g); g.connect(out);
        osc.start(t); osc.stop(t + 0.18);
      });
    } else {
      // Simple descending slide: C5 → G4
      const osc = ctx.createOscillator();
      osc.type  = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.18);
      const gain = ctx.createGain();
      adsr(gain.gain, ctx, { attack: 0.003, hold: 0.05, decay: 0.10, peak: 0.22 * vol });
      osc.connect(gain); gain.connect(out);
      osc.start(now); osc.stop(now + 0.26);
    }
    return null;
  },


  // ── precision_resonance ───────────────────────────────────────────────────
  //
  // One sustained chord note that accumulates during Torque Lock.
  // Each completed sequence while in Torque Lock adds one note from the
  // C major open voicing (see theory §7).  Notes accumulate and sustain
  // together, building a chord that grows more "complete" with each sequence.
  //
  // pitch param = sequence count while in Torque Lock (1–5).
  //   count 1 → C3  (130 Hz) — just the root
  //   count 2 → G3  (196 Hz) — root + fifth
  //   count 3 → C4  (261 Hz) — root + fifth + octave
  //   count 4 → E4  (330 Hz) — adds the major third
  //   count 5 → G4  (392 Hz) — full C major chord in open voicing
  //
  // Returns a { stop() } handle — the caller holds all active resonance
  // handles and stops them on sequence break or Torque Lock exit.

  precision_resonance(ctx, out, vol, pitch) {
    const count = Math.round(Math.max(1, Math.min(5, pitch)));
    const freq  = SCALES.precision[count - 1]; // C3 G3 C4 E4 G4
    const now   = ctx.currentTime;

    const osc  = ctx.createOscillator();
    osc.type   = 'sine';
    osc.frequency.value = freq;

    // Soft LFO swell — gives the resonance an "alive" quality
    const lfo      = ctx.createOscillator();
    lfo.type       = 'sine';
    lfo.frequency.value = 0.25;
    const lfoGain  = ctx.createGain();
    lfoGain.gain.value  = 0.04;

    const lp   = filter(ctx, 'lowpass', freq * 4, 0.8);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14 * vol, now + 0.4); // slow fade in

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(lp); lp.connect(gain); gain.connect(out);
    osc.start(now); lfo.start(now);

    return {
      stop(fadeTime = 0.3) {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0.0001, t + fadeTime);
        try { osc.stop(t + fadeTime + 0.02); } catch (_) { /* already stopped */ }
        try { lfo.stop(t + fadeTime + 0.02); } catch (_) { /* already stopped */ }
      }
    };
  },


  // ── precision_critical_snap ───────────────────────────────────────────────
  //
  // The final beat of a sequence (the "critical" step with a halved timing
  // window).  If nailed: a distinctly different, sharper sound than the
  // normal beat snaps — the definitive "torque wrench click" moment.
  //
  // Combines a very sharp transient (highpass noise spike) with a brief
  // high-pitched ping (C6, 1047 Hz) that rings out longer than usual.
  // This is the sound the player is working toward with every sequence.

  precision_critical_snap(ctx, out, vol) {
    const now = ctx.currentTime;

    // Snap transient (very high, very short)
    const noiseBuf  = noiseBuffer(ctx, 0.035);
    const noiseSrc  = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const nhp       = filter(ctx, 'highpass', 6000, 1.2);
    const noiseGain = ctx.createGain();
    adsr(noiseGain.gain, ctx, { attack: 0.0005, hold: 0.001, decay: 0.028, peak: 0.55 * vol });
    noiseSrc.connect(nhp); nhp.connect(noiseGain); noiseGain.connect(out);
    noiseSrc.start(now); noiseSrc.stop(now + 0.04);

    // High ping (C6 — the note that completes the C major chord at the top)
    const osc  = ctx.createOscillator();
    osc.type   = 'sine';
    osc.frequency.value = 1046.50; // C6
    const gain = ctx.createGain();
    adsr(gain.gain, ctx, { attack: 0.002, hold: 0.008, decay: 0.35, peak: 0.28 * vol });
    osc.connect(gain); gain.connect(out);
    osc.start(now); osc.stop(now + 0.42);

    return null;
  },
};


// ════════════════════════════════════════════════════════════════════════════
//  RhythmEngine — Beat Scheduler + Procedural Map Generation
//
//  The Web Audio clock runs ahead of JavaScript's event loop, so we use a
//  two-clock approach (from Chris Wilson's "A Tale of Two Clocks", 2013):
//    - setTimeout polls at LOOKAHEAD_MS intervals (JavaScript timer, ~25ms)
//    - Each poll schedules notes up to SCHEDULE_AHEAD_S ahead (0.15s)
//  This decouples sound scheduling from the JS thread and prevents audio
//  glitches caused by garbage collection, layout, or other JS pauses.
//
//  ARCHITECTURE:
//    RhythmEngine.generateMap(partId, difficulty, mechanicType) → RhythmMap
//    const engine = new RhythmEngine(audioManager)
//    engine.start(map, onBeatCallback)
//    engine.stop()
//
//  RhythmMap schema:
//    {
//      partId:       string,
//      mechanicType: 'wrench' | 'bodywork' | 'diagnostic' | 'precision',
//      bpm:          number,
//      stepsPerBar:  16,
//      swingRatio:   number,
//      pattern:      boolean[16],   // true = active step
//      callPattern:  boolean[8],    // wrench only: the "call" half
//      faultTypes:   string[],      // diagnostic only: per-step fault type
//      zoneFreqs:    number[],      // bodywork only: Hz per zone
//      sequenceLen:  number,        // precision only: beats per torque seq
//      variationSeed: string,       // for per-cycle mutations
//    }
// ════════════════════════════════════════════════════════════════════════════

export class RhythmEngine {

  static LOOKAHEAD_MS    = 25.0;   // scheduler poll interval (ms)
  static SCHEDULE_AHEAD  = 0.15;   // how far ahead to schedule (seconds)

  constructor(audioManager) {
    this._audio       = audioManager;
    this._running     = false;
    this._paused      = false;
    this._timerID     = null;
    this._map         = null;
    this._onBeat      = null;     // callback: (step, time, isActive) => void
    this._currentStep = 0;
    this._nextNoteTime = 0;
    this._cycleCount  = 0;
  }

  // ── Map Generation ─────────────────────────────────────────────────────

  /**
   * generateMap(partId, difficulty, mechanicType) → RhythmMap
   *
   * Generates a deterministic rhythm map from a part's ID and difficulty.
   * See Music Theory Reference above for full design rationale.
   *
   * @param {string} partId        — e.g. "fd3s_apex_seal_f1"
   * @param {number} difficulty    — 0.1–1.0
   * @param {string} mechanicType  — 'wrench'|'bodywork'|'diagnostic'|'precision'
   * @returns {object} RhythmMap
   */
  static generateMap(partId, difficulty, mechanicType) {
    const rng  = seededRNG(partId + mechanicType);
    const bpm  = RhythmEngine._difficultyToBPM(difficulty);
    // Wrench uses straight timing (swingRatio 0) so the visual grid cells
    // and audio beats land at identical intervals. Swing on a call/response
    // grid means odd cells look evenly spaced but hit ~15ms late — unlearnable.
    // Bodywork keeps swing (0.12) because it's a flowing hold mechanic, not a grid.
    const swing = mechanicType === 'bodywork' ? 0.12 : 0.0;

    const map = {
      partId,
      mechanicType,
      bpm,
      stepsPerBar: 16,
      swingRatio: swing,
      variationSeed: partId + mechanicType + 'var',
    };

    switch (mechanicType) {
      case 'wrench':     return RhythmEngine._genWrench(map, rng, difficulty);
      case 'bodywork':   return RhythmEngine._genBodywork(map, rng, difficulty);
      case 'diagnostic': return RhythmEngine._genDiagnostic(map, rng, difficulty);
      case 'precision':  return RhythmEngine._genPrecision(map, rng, difficulty);
      default:
        throw new Error(`[RhythmEngine] Unknown mechanicType: "${mechanicType}"`);
    }
  }

  /**
   * _difficultyToBPM — see Music Theory Reference §6.
   * @param {number} difficulty  0.0–1.0
   * @returns {number} BPM
   */
  static _difficultyToBPM(difficulty) {
    return 72 + Math.round(difficulty * 96);
  }

  /**
   * getTimingWindow(mechanicType, skillLevel) → seconds
   *
   * Returns the ±half-window in seconds for a given mechanic and skill level.
   * See Music Theory Reference §6 for base fractions.
   *
   * @param {string} mechanicType
   * @param {number} skillLevel  1–20
   * @param {number} bpm
   * @returns {number} seconds
   */
  static getTimingWindow(mechanicType, skillLevel, bpm) {
    const stepDuration = 60 / bpm / 4;
    const baseWindows  = { wrench: 0.25, bodywork: 0.30, diagnostic: 0.35, precision: 0.20 };
    const base = (baseWindows[mechanicType] ?? 0.25) * stepDuration;
    const bonus = (SKILL_WINDOW_BONUS[mechanicType]?.[Math.min(skillLevel, 20)] ?? 0) * stepDuration;
    return base + bonus;
  }

  // ── Pattern generators ─────────────────────────────────────────────────

  /**
   * _genWrench — Wrench call/response pattern generator.
   *
   * Produces two 8-step phrases (call + response) with a turnaround.
   * Density: 0.25 + difficulty × 0.40 over 8 steps.
   * Anchor steps: 0, 4 always active (mapped to the 8-step sub-grid).
   * Anti-patterns: no three consecutive active steps.
   * Turnaround: 30% chance steps 6–7 invert relative to call.
   * Hazard interval: 3 + Math.floor(rng() × 3) patterns (3–5).
   */
  static _genWrench(map, rng, difficulty) {
    const density = 0.25 + difficulty * 0.40;
    const call = RhythmEngine._buildPhrase(8, density, rng, [0, 4]);
    const response = [...call];

    // Turnaround: invert last two steps in 30% of cases
    if (rng() < 0.30) {
      response[6] = !call[6];
      response[7] = !call[7];
    }

    // Hazard interval: 3–5 patterns between hazards (variable ratio)
    const hazardInterval = 3 + Math.floor(rng() * 3);

    return {
      ...map,
      pattern:         [...call, ...response], // full 16 steps (call + response)
      callPattern:     call,
      responsePattern: response,
      hazardInterval,
    };
  }

  /**
   * _genBodywork — Bodywork flowing hold path generator.
   *
   * Produces a zone sequence (8–12 zones depending on difficulty).
   * Zone frequencies are drawn sequentially from D major pentatonic.
   * Rust zones (25% of zones) get the flat-seven frequency.
   * Zone hold duration scales inversely with difficulty (slower at high diff).
   */
  static _genBodywork(map, rng, difficulty) {
    const zoneCount = 8 + Math.floor(difficulty * 4); // 8–12 zones
    const scale     = SCALES.bodywork;
    const zoneFreqs = [];
    const isRust    = [];
    const holdDurations = [];
    const baseDuration  = 1800 - difficulty * 800; // 1800ms → 1000ms at max

    let scaleIdx = 0;
    for (let i = 0; i < zoneCount; i++) {
      const rust = rng() < 0.25;
      isRust.push(rust);
      zoneFreqs.push(rust ? SCALES.bodywork_rust : scale[scaleIdx % scale.length]);
      holdDurations.push(rust ? baseDuration * 2.5 : baseDuration);
      if (!rust) scaleIdx++;
    }

    return {
      ...map,
      pattern:      new Array(16).fill(false), // bodywork doesn't use step grid
      zoneCount,
      zoneFreqs,
      isRust,
      holdDurations,
    };
  }

  /**
   * _genDiagnostic — Diagnostic scan pattern generator.
   *
   * 64-event scan lane.  Events are 'normal', 'fault', or 'decoy'.
   * Fault frequency: 0.08 + difficulty × 0.12  (8–20% of events).
   * Real faults always use the tritone signal; decoys use minor second.
   * Buffer: first 4 events are always normal (player needs time to orient).
   * See Music Theory Reference §7 for the interval choices.
   */
  static _genDiagnostic(map, rng, difficulty) {
    const laneLength     = 64;
    const faultFrequency = 0.08 + difficulty * 0.12;
    const decoyRatio     = 0.3 + difficulty * 0.2; // fraction of fault events that are decoys
    const lane           = [];

    for (let i = 0; i < laneLength; i++) {
      if (i < 4) { lane.push({ type: 'normal', signalType: 1 }); continue; }
      const r = rng();
      if (r < faultFrequency) {
        const isDecoy = rng() < decoyRatio;
        lane.push({ type: isDecoy ? 'decoy' : 'fault', signalType: isDecoy ? 3 : 2 });
      } else {
        lane.push({ type: 'normal', signalType: 1 });
      }
    }

    return {
      ...map,
      pattern: new Array(16).fill(true), // diagnostic ticks every step
      lane,
      laneLength,
      faultFrequency,
    };
  }

  /**
   * _genPrecision — Precision pendulum sequence generator.
   *
   * Generates a pendulum BPM and sequence length.
   * Sequence length: 3 + Math.round(difficulty × 5)  (3–8 beats).
   * Does not generate a step pattern — the pendulum IS the beat.
   * The sequenceLen determines how many on-beat taps complete one sequence.
   */
  static _genPrecision(map, rng, difficulty) {
    const sequenceLen      = 3 + Math.round(difficulty * 5); // 3–8 beats
    const criticalFraction = 0.50; // timing window halved on the final beat
    const torqueLockCount  = 3;    // sequences needed to enter Torque Lock

    return {
      ...map,
      pattern:          new Array(16).fill(false), // pendulum is continuous
      sequenceLen,
      criticalFraction,
      torqueLockCount,
    };
  }

  /**
   * _buildPhrase(length, density, rng, anchors) → boolean[]
   *
   * Build a step array respecting density, anchor beats, and anti-patterns.
   * See Music Theory Reference §§2–4.
   */
  static _buildPhrase(length, density, rng, anchors = [0]) {
    const pattern   = new Array(length).fill(false);
    // 1. Place anchors
    anchors.forEach(i => { if (i < length) pattern[i] = true; });

    // 2. Fill remaining steps to reach target density
    const target = Math.round(length * density);
    // Available non-anchor steps, prioritised by "groove quality":
    // quarters → upbeats → syncopated sixteenths (see theory §5)
    const groovePriority = [2, 6, 10, 14, 4, 12, 3, 5, 9, 11, 13, 1, 7, 15]
      .filter(i => i < length && !anchors.includes(i));

    let placed = anchors.length;
    for (const step of groovePriority) {
      if (placed >= target) break;
      // Anti-pattern check: no three consecutive active steps
      const prev2 = step > 1 ? pattern[step - 2] : false;
      const prev1 = step > 0 ? pattern[step - 1] : false;
      const next1 = step < length - 1 ? pattern[step + 1] : false;
      if (prev2 && prev1) continue;       // would make three in a row
      if (prev1 && next1) continue;       // sandwiched = three in a row
      // Density-weighted RNG: not all groove positions are always filled
      if (rng() < density * 1.2) {
        pattern[step] = true;
        placed++;
      }
    }

    return pattern;
  }

  /**
   * applyVariation(map, cycleIndex) → boolean[]
   *
   * Returns a mutated copy of the base pattern for a given cycle.
   *
   * COMPOSITION MODE (wrench v2):
   *   If map._currentPattern is set (by WrenchMechanic._startCallPhase),
   * COMPOSITION MODE (wrench v2):
   *   If map.composition exists, look up the pattern directly by
   *   cycleIndex. Engine cycle 0 = count-in (returns silence).
   *   Engine cycle N (N≥1) = composition[N-1].
   *   This eliminates the scheduler/callback race condition because
   *   the pattern is computed from static data, not a mutable field
   *   that depends on setTimeout ordering.
   *
   * LEGACY MODE (all other mechanics):
   *   1–2 non-anchor steps are toggled using the variationSeed RNG.
   *   See Music Theory Reference §10.
   */
  static applyVariation(map, cycleIndex) {
    // ── Composition mode: indexed lookup (no race condition) ───
    if (map.composition) {
      // _compositionOffset (set at start() time, never mutated) tells us how many
      // engine cycles to subtract to get the composition array index.
      //   offset=1 normal: cycle 1 → comp[0], cycle 2 → comp[1], ...
      //   offset=2 intro double-call: cycles 1 AND 2 → comp[0], cycle 3 → comp[1]
      // Math.max(0,...) clamps so count-in / pre-offset cycles hit comp[0] instead
      // of returning silence — the _countInCycles check in _playBeatSound handles
      // actual audio silence for the count-in cycle independently.
      const offset  = map._compositionOffset ?? map._countInCycles ?? 1;
      const compIdx = Math.max(0, cycleIndex - offset);
      const idx     = compIdx % map.composition.length;
      const entry   = map.composition[idx];
      if (entry) return [...entry.call, ...entry.response];
    }

    // ── Legacy mode: seeded random variation ──────────────────
    const rng     = seededRNG(map.variationSeed + cycleIndex);
    const pattern = [...(map.callPattern || map.pattern)];
    const anchors = new Set([0, 4, 8, 12]);
    const mutableSteps = pattern.map((_, i) => i).filter(i => !anchors.has(i));
    const mutationCount = cycleIndex > 0 && rng() < 0.6 ? 1 : 0; // mutate after first cycle
    for (let m = 0; m < mutationCount; m++) {
      const idx = mutableSteps[Math.floor(rng() * mutableSteps.length)];
      if (idx !== undefined) pattern[idx] = !pattern[idx];
    }
    return pattern;
  }

  // ── Scheduler ─────────────────────────────────────────────────────────

  /**
   * start(map, onBeatCallback) — begin scheduling beats.
   *
   * onBeatCallback(step, audioTime, isActive) is called for every step.
   * Use it to update the UI (light up the beat grid, advance progress bars).
   * Do NOT use it to trigger sounds — the scheduler handles sounds directly.
   *
   * @param {object}   map            — from generateMap()
   * @param {function} onBeatCallback — (step, audioTime, isActive) => void
   */
  start(map, onBeatCallback) {
    if (this._running) this.stop();
    this._map         = map;
    this._onBeat      = onBeatCallback || (() => {});
    this._currentStep = 0;
    this._cycleCount  = 0;
    this._running     = true;
    this._paused      = false;
    this._nextNoteTime = this._audio._ctx?.currentTime ?? 0;
    this._schedule();
  }

  stop() {
    this._running = false;
    this._paused  = false;
    if (this._timerID !== null) {
      clearTimeout(this._timerID);
      this._timerID = null;
    }
  }

  pause() {
    this._paused = true;
  }

  resume() {
    if (!this._running) return;
    this._paused       = false;
    this._nextNoteTime = this._audio._ctx?.currentTime ?? 0;
    this._schedule();
  }

  _schedule() {
    if (!this._running || this._paused) return;

    const ctx = this._audio._ctx;
    if (!ctx) return;

    while (this._nextNoteTime < ctx.currentTime + RhythmEngine.SCHEDULE_AHEAD) {
      this._scheduleStep(this._currentStep, this._nextNoteTime);
      this._advance();
    }

    this._timerID = setTimeout(() => this._schedule(), RhythmEngine.LOOKAHEAD_MS);
  }

  _scheduleStep(step, time) {
    const map      = this._map;
    const pattern  = RhythmEngine.applyVariation(map, this._cycleCount);
    const isActive = pattern[step] ?? false;

    // Detect trap steps using the same _compositionOffset logic as applyVariation
    // so audio timbre and composition index are always in sync.
    let isTrap = false;
    if (map.composition && step < 8) {
      const offset  = map._compositionOffset ?? map._countInCycles ?? 1;
      const compIdx = Math.max(0, this._cycleCount - offset);
      const entry   = map.composition[compIdx % map.composition.length];
      isTrap = !!(entry?.traps?.includes(step));
    }

    // Notify UI via callback (scheduled for the exact audio time)
    const delay = Math.max(0, (time - (this._audio._ctx?.currentTime ?? 0)) * 1000);
    setTimeout(() => this._onBeat(step, time, isActive), delay);

    if (!isActive) return;
    this._playBeatSound(step, time, isActive, isTrap);
  }

  _playBeatSound(step, time, isActive, isTrap = false) {
    if (!isActive) return;
    const map  = this._map;
    const ctx  = this._audio._ctx;
    if (!ctx) return;

    // Skip sounds during count-in cycles (metronome is handled separately
    // by the _onBeat callback in wrench.js)
    if (map._countInCycles && this._cycleCount < map._countInCycles) return;

    const out  = this._audio._masterGain;
    const vol  = this._audio._muted ? 0 : this._audio._volume;

    // ── SAMPLE-ACCURATE SCHEDULING ────────────────────────────────────
    //
    // Call synths directly with the scheduled `time` parameter.
    // Web Audio API schedules oscillator.start(time) and gain envelope
    // ramps at sample-level precision — no setTimeout jitter.

    switch (map.mechanicType) {
      case 'wrench': {
        // Only play call-phase sounds (steps 0-7). Response (8-15) is silent
        // so the boundary is unambiguous and the player can hear themselves.
        // Trap beats use wrench_trap_beat — same ratchet transient but with
        // a dissonant buzz so the player hears "skip this" immediately.
        if (step < 8) {
          if (isTrap) {
            SYNTHS.wrench_trap_beat(ctx, out, vol * 0.85, 1.0, time);
          } else {
            SYNTHS.wrench_call_beat(ctx, out, vol * 0.85, 1.0, time);
          }
        }
        break;
      }

      case 'diagnostic': {
        const event = map.lane?.[step % map.laneLength] ?? { signalType: 1 };
        // Diagnostic scan pulses also benefit from precise scheduling
        SYNTHS.diag_scan_pulse(ctx, out, vol * 0.7, event.signalType, time);
        break;
      }

      case 'bodywork':
      case 'precision':
        // These mechanics are not step-scheduled through the beat engine —
        // they're driven by the mechanic's own animation loop instead.
        break;
    }
  }

  _advance() {
    const map          = this._map;
    const stepDuration = 60 / map.bpm / 4; // one 16th note in seconds
    const swing        = swingOffset(this._currentStep, stepDuration, map.swingRatio);
    this._nextNoteTime += stepDuration + swing;
    this._currentStep  = (this._currentStep + 1) % map.stepsPerBar;
    if (this._currentStep === 0) this._cycleCount++;
  }
}


// ════════════════════════════════════════════════════════════════════════════
//  AudioManager
// ════════════════════════════════════════════════════════════════════════════

export class AudioManager {
  constructor() {
    this._ctx         = null;
    this._masterGain  = null;
    this._initialized = false;
    this._supported   = true;
    this._muted       = false;
    this._volume      = 0.7;

    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      console.warn('[AudioManager] Web Audio API not supported. All sounds disabled.');
      this._supported = false;
    }
  }

  /**
   * init() — call once on the first user gesture (click / touchstart).
   */
  async init() {
    if (!this._supported || this._initialized) return;
    try {
      const Ctx        = window.AudioContext || window.webkitAudioContext;
      this._ctx        = new Ctx();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = this._muted ? 0 : this._volume;
      this._masterGain.connect(this._ctx.destination);
      this._initialized = true;
    } catch (err) {
      console.warn('[AudioManager] Failed to initialise AudioContext:', err);
      this._supported = false;
    }
  }

  /** loadSound() — no-op, kept for API compatibility with file-based version */
  async loadSound() { return null; }

  // ── Core playback ──────────────────────────────────────────────────────

  _resume() {
    if (this._ctx?.state === 'suspended') {
      this._ctx.resume().catch(err => console.warn('[AudioManager] resume():', err));
    }
  }

  /**
   * play(name, options) — synthesise and play a sound by name.
   * Options: { volume?: 0–1, pitch?: multiplier, loop?: bool }
   * Returns null for one-shots, { stop() } for looping sounds.
   */
  play(name, options = {}) {
    if (!this._supported || !this._initialized) return null;
    this._resume();
    if (this._muted) return null;
    const synth = SYNTHS[name];
    if (!synth) {
      console.warn(`[AudioManager] Unknown sound: "${name}"`);
      return null;
    }
    try {
      const vol   = options.volume != null ? Math.max(0, Math.min(1, options.volume)) : 1.0;
      const pitch = options.pitch  != null ? options.pitch : 1.0;
      return synth(this._ctx, this._masterGain, vol, pitch) ?? null;
    } catch (err) {
      console.warn(`[AudioManager] Synthesis error for "${name}":`, err);
      return null;
    }
  }

  /** stop(handle) — stop a looping sound. Pass the object returned by play(). */
  stop(handle) {
    if (!handle || typeof handle.stop !== 'function') return;
    try { handle.stop(); } catch (_) { /* already stopped */ }
  }

  // ── Legacy convenience methods ─────────────────────────────────────────

  playRatchet() {
    return this.play(randPick(['ratchet_1', 'ratchet_2', 'ratchet_3']), { pitch: rand(0.95, 1.05) });
  }

  playClick() {
    return this.play('ui_click');
  }

  playRarityReveal(rarity) {
    return this.play(rarity === 5 ? 'gacha_5' : rarity === 4 ? 'gacha_4' : 'gacha_3');
  }

  // ── Wrench rhythm sounds ───────────────────────────────────────────────

  /**
   * playWrenchCallBeat(pitch?) — guide beat during call phase.
   * @param {number} [pitch=1.0] — frequency multiplier for pitch variety
   */
  playWrenchCallBeat(pitch = 1.0) {
    return this.play('wrench_call_beat', { pitch });
  }

  /**
   * playWrenchComboBump(level) — ascending interval at combo milestone.
   * @param {1|2|3|4} level — current combo level being reached
   */
  playWrenchComboBump(level) {
    return this.play('wrench_combo_bump', { pitch: level });
  }

  /** playWrenchSequenceBreak() — tapped on a rest / missed an active beat */
  playWrenchSequenceBreak() {
    return this.play('wrench_sequence_break');
  }

  /**
   * playMetronomeTick(isAccent?) — count-in metronome click.
   * Called by WrenchMechanic._runCountIn() on each of the 4 lead-in beats.
   * @param {boolean} [isAccent=false] — true = accent beat (beat 4, signals "1" coming)
   */
  playMetronomeTick(isAccent = false) {
    return this.play('metronome_tick', { pitch: isAccent ? 2 : 1 });
  }

  // ── Bodywork rhythm sounds ─────────────────────────────────────────────

  /**
   * playBodyworkPad(freq, duration, vol?) — start a sustained zone pad tone.
   * Returns a { stop(fadeTime?) } handle — call stop() when the hold ends.
   *
   * @param {number} freq     — frequency in Hz (see SCALES.bodywork)
   * @param {number} duration — max duration in ms (engine auto-stops after this)
   * @param {number} [vol=1]  — volume 0–1
   */
  playBodyworkPad(freq, duration, vol = 1.0) {
    if (!this._supported || !this._initialized || this._muted) return null;
    this._resume();
    try {
      const handle = SYNTHS.bodywork_pad(this._ctx, this._masterGain, vol, freq);
      // Auto-stop if caller forgets
      const autoTimer = setTimeout(() => handle?.stop?.(), duration + 200);
      return {
        stop(fadeTime = 0.15) {
          clearTimeout(autoTimer);
          handle?.stop(fadeTime);
        }
      };
    } catch (err) {
      console.warn('[AudioManager] bodywork_pad error:', err);
      return null;
    }
  }

  /** playBodyworkZonePerfect() — zone released at the perfect moment */
  playBodyworkZonePerfect() {
    return this.play('bodywork_zone_perfect');
  }

  /** playBodyworkZoneRush() — zone released too early */
  playBodyworkZoneRush() {
    return this.play('bodywork_zone_rush');
  }

  /**
   * startBodyworkRust() — start the looping rust/friction sound.
   * Returns a { stop() } handle. Call stop() when the rust zone hold ends.
   */
  startBodyworkRust() {
    if (!this._supported || !this._initialized || this._muted) return null;
    this._resume();
    try {
      return SYNTHS.bodywork_rust(this._ctx, this._masterGain, this._volume);
    } catch (err) {
      console.warn('[AudioManager] bodywork_rust error:', err);
      return null;
    }
  }

  // ── Diagnostic rhythm sounds ───────────────────────────────────────────

  /**
   * playDiagScanPulse(isFault, baseFreq?) — one beat of the scan stream.
   * @param {boolean|number} isFault — false/1 = normal, true/2 = fault, 3 = decoy
   */
  playDiagScanPulse(isFault) {
    const signalType = isFault === true ? 2 : (typeof isFault === 'number' ? isFault : 1);
    return this.play('diag_scan_pulse', { pitch: signalType });
  }

  /** playDiagCorrectFlag() — correct fault type identified */
  playDiagCorrectFlag() {
    return this.play('diag_correct_flag');
  }

  /** playDiagWrongFlag() — wrong fault type identified */
  playDiagWrongFlag() {
    return this.play('diag_wrong_flag');
  }

  /** playDiagFalseFlag() — button pressed with no fault at window */
  playDiagFalseFlag() {
    return this.play('diag_false_flag');
  }

  // ── Precision rhythm sounds ────────────────────────────────────────────

  /**
   * playPrecisionTick(isOnBeat) — pendulum tick.
   * @param {boolean} isOnBeat — true = center crossing, false = turning point
   */
  playPrecisionTick(isOnBeat) {
    return this.play('precision_tick', { pitch: isOnBeat ? 1.0 : 0.0 });
  }

  /** playPrecisionWindowChime() — fires as pendulum enters valid tap window */
  playPrecisionWindowChime() {
    return this.play('precision_window_chime');
  }

  /**
   * playPrecisionBeatSnap(stepIndex, totalSteps) — each successful torque beat.
   * @param {number} stepIndex — 0-based index within current sequence (0–N-1)
   * @param {number} totalSteps — total sequence length (for mapping to chord)
   */
  playPrecisionBeatSnap(stepIndex, totalSteps) {
    // Map stepIndex → 0–4 range regardless of sequence length
    const chordStep = Math.min(4, Math.floor(stepIndex / totalSteps * 5));
    return this.play('precision_beat_snap', { pitch: chordStep });
  }

  /**
   * playPrecisionSequenceComplete(isTorqueLock?) — full sequence completed.
   * @param {boolean} [isTorqueLock=false] — if true, plays the dramatic chord bloom
   */
  playPrecisionSequenceComplete(isTorqueLock = false) {
    return this.play('precision_sequence_complete', { pitch: isTorqueLock ? 2.0 : 1.0 });
  }

  /**
   * playPrecisionSequenceBreak(isTorqueLock?) — sequence broken.
   * @param {boolean} [isTorqueLock=false] — if true, plays the chord collapse
   */
  playPrecisionSequenceBreak(isTorqueLock = false) {
    return this.play('precision_sequence_break', { pitch: isTorqueLock ? 2.0 : 1.0 });
  }

  /**
   * playPrecisionResonance(sequenceCount) — add one chord note during Torque Lock.
   * Returns a { stop() } handle. Store all handles and stop them on lock exit.
   * @param {1|2|3|4|5} sequenceCount — how many sequences completed in Torque Lock
   */
  playPrecisionResonance(sequenceCount) {
    if (!this._supported || !this._initialized || this._muted) return null;
    this._resume();
    try {
      return SYNTHS.precision_resonance(this._ctx, this._masterGain, this._volume, sequenceCount);
    } catch (err) {
      console.warn('[AudioManager] precision_resonance error:', err);
      return null;
    }
  }

  /** playPrecisionCriticalSnap() — perfect hit on the final (critical) beat */
  playPrecisionCriticalSnap() {
    return this.play('precision_critical_snap');
  }

  // ── Volume & Mute ──────────────────────────────────────────────────────

  setVolume(value) {
    this._volume = Math.max(0, Math.min(1, value));
    if (this._masterGain && !this._muted) {
      this._masterGain.gain.value = this._volume;
    }
  }

  /** toggleMute() → new muted state (true = muted) */
  toggleMute() {
    this._muted = !this._muted;
    if (this._masterGain) {
      this._masterGain.gain.value = this._muted ? 0 : this._volume;
    }
    return this._muted;
  }

  getMuted()  { return this._muted; }
  getVolume() { return this._volume; }
}


// ════════════════════════════════════════════════════════════════════════════
//  Audio Controls UI
// ════════════════════════════════════════════════════════════════════════════

/**
 * renderAudioControls(container, audioManager)
 *
 * Injects a mute toggle and volume slider into `container`.
 * Returns the wrapper div.
 */
export function renderAudioControls(container, audioManager) {
  if (!container || !audioManager) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'audio-controls';
  wrapper.style.cssText = 'display:flex;align-items:center;gap:var(--space-sm,6px)';

  const muteBtn = document.createElement('button');
  muteBtn.className = 'btn btn--ghost audio-controls__mute';
  muteBtn.title     = 'Toggle mute';
  muteBtn.style.cssText = 'font-size:1rem;padding:2px 6px;line-height:1;cursor:pointer;background:none;border:none';

  const slider = document.createElement('input');
  slider.type      = 'range';
  slider.className = 'audio-controls__volume';
  slider.min       = '0';
  slider.max       = '1';
  slider.step      = '0.05';
  slider.value     = String(audioManager.getVolume());
  slider.title     = 'Volume';
  slider.setAttribute('aria-label', 'Volume');
  slider.style.cssText = 'width:72px;cursor:pointer;accent-color:var(--accent,#e5c100)';

  function syncUI() {
    const muted = audioManager.getMuted();
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    slider.disabled       = muted;
    slider.style.opacity  = muted ? '0.4' : '1';
  }

  muteBtn.addEventListener('click', () => {
    audioManager.toggleMute();
    syncUI();
  });

  slider.addEventListener('input', () => {
    audioManager.setVolume(parseFloat(slider.value));
    if (audioManager.getMuted()) { audioManager.toggleMute(); syncUI(); }
  });

  wrapper.append(muteBtn, slider);
  container.append(wrapper);
  syncUI();
  return wrapper;
}
