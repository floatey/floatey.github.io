// ════════════════════════════════════════════════════════════
//  audio.js — Procedural Audio Engine (Web Audio API)
//  JDM Restoration Garage
//
//  Zero audio files required. Every sound is synthesised at
//  runtime from oscillators, filtered noise, and gain envelopes.
//
//  PUBLIC API (drop-in replacement for the file-based version):
//    import { AudioManager, renderAudioControls } from './audio.js';
//
//    const audio = new AudioManager();
//    audio.init();                       // call on first user gesture
//
//    audio.playRatchet();                // wrench work — each click
//    audio.play('impact');               // wrench work — critical click
//    audio.play('stuck');                // wrench work — hazard
//    audio.play('torque_click');         // precision — green zone hit
//    audio.play('miss');                 // precision — red zone miss
//    audio.play('aha');                  // diagnosis — correct
//    audio.play('wrong');                // diagnosis — incorrect
//    const node = audio.play('sand_loop', { loop: true }); // bodywork hold
//    audio.stop(node);                   // stop the sand loop
//    audio.play('system_complete');      // system finished
//    audio.play('engine_start');         // first start moment
//    audio.playRarityReveal(5);          // gacha — ★★★★★
//    audio.playClick();                  // ui button press
//
//  SOUND TRIGGER MAP (GDD §9):
//    ratchet_1/2/3   — Wrench Work, each click (use playRatchet())
//    impact          — Wrench Work, critical click
//    stuck           — Wrench Work, hazard interrupt
//    torque_click    — Precision, green zone hit
//    miss            — Precision, red zone miss
//    aha             — Diagnosis, correct answer
//    wrong           — Diagnosis, incorrect answer
//    sand_loop       — Bodywork, holding zone (looping)
//    system_complete — Any system completion
//    engine_start    — First Start ceremony
//    gacha_3/4/5     — Pull reveal per rarity (use playRarityReveal())
//    ui_click        — Any button press
// ════════════════════════════════════════════════════════════


// ── Low-level helpers ────────────────────────────────────────

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
 * The first and last 256 samples are windowed to zero so the
 * buffer can be looped without audible clicks at the seam.
 */
function noiseBuffer(ctx, duration) {
  const len = Math.max(256, Math.ceil(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  const ramp = Math.min(256, Math.floor(len * 0.05));
  for (let i = 0; i < len; i++) {
    d[i] = Math.random() * 2 - 1;
  }
  // Window edges to silence for seamless looping
  for (let i = 0; i < ramp; i++) {
    const t = i / ramp;
    d[i]           *= t;
    d[len - 1 - i] *= t;
  }
  return buf;
}

/** Set a gain envelope: silence → attack → hold → exponential decay */
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
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = Q;
  return f;
}


// ── Sound synthesisers ───────────────────────────────────────
//
// Each synthesiser:
//   (ctx, out, vol, pitch) => handle | null
//
//   ctx   — AudioContext
//   out   — destination node (master gain)
//   vol   — per-call volume scalar 0–1
//   pitch — playback-rate scalar (1.0 = normal)
//
//   Returns null for one-shots.
//   Returns { stop() } for looping sounds.
//
// Convention: all oscillators / sources are stopped via absolute
// timestamps so they clean themselves up even if stop() is never
// called.  Looping sounds MUST be stopped by the caller.

const SYNTHS = {

  // ── ratchet variants ─────────────────────────────────────
  //
  // Metallic click = short bandpass-filtered noise burst (the
  // high-frequency "tick") + a sine thud that drops in pitch
  // quickly (the low-frequency "thunk").  Three variants differ
  // only in tuning so rapid clicks still feel varied.

  _ratchet(ctx, out, vol, pitch) {
    const now = ctx.currentTime;

    // --- Noise tick
    const tickBuf = noiseBuffer(ctx, 0.07);
    const tick = ctx.createBufferSource();
    tick.buffer = tickBuf;

    const tickBP  = filter(ctx, 'bandpass', 4200 * pitch, 2.2);
    const tickHP  = filter(ctx, 'highpass',  1800 * pitch, 0.7);
    const tickGain = ctx.createGain();
    adsr(tickGain.gain, ctx, { attack: 0.001, hold: 0.003, decay: 0.045, peak: 0.55 * vol });

    tick.connect(tickBP);
    tickBP.connect(tickHP);
    tickHP.connect(tickGain);
    tickGain.connect(out);
    tick.start(now);
    tick.stop(now + 0.07);

    // --- Sine thud (fast pitch drop)
    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(170 * pitch, now);
    thud.frequency.exponentialRampToValueAtTime(55 * pitch, now + 0.055);

    const thudGain = ctx.createGain();
    adsr(thudGain.gain, ctx, { attack: 0.001, hold: 0.004, decay: 0.048, peak: 0.38 * vol });

    thud.connect(thudGain);
    thudGain.connect(out);
    thud.start(now);
    thud.stop(now + 0.08);

    return null;
  },

  ratchet_1(ctx, out, vol, pitch) { return SYNTHS._ratchet(ctx, out, vol, pitch * 1.00); },
  ratchet_2(ctx, out, vol, pitch) { return SYNTHS._ratchet(ctx, out, vol, pitch * 1.09); },
  ratchet_3(ctx, out, vol, pitch) { return SYNTHS._ratchet(ctx, out, vol, pitch * 0.92); },


  // ── impact — critical click / bolt breaking free ──────────
  //
  // Heavier than ratchet: low boom (fast-decaying sine sweep)
  // + metallic crack (highpass noise burst) + short mid ring.

  impact(ctx, out, vol, pitch) {
    const now = ctx.currentTime;

    // Low boom
    const boom = ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(110 * pitch, now);
    boom.frequency.exponentialRampToValueAtTime(28 * pitch, now + 0.18);
    const boomGain = ctx.createGain();
    adsr(boomGain.gain, ctx, { attack: 0.001, hold: 0.008, decay: 0.16, peak: 0.72 * vol });
    boom.connect(boomGain);
    boomGain.connect(out);
    boom.start(now);
    boom.stop(now + 0.22);

    // Crack (highpass noise)
    const crackBuf = noiseBuffer(ctx, 0.12);
    const crack = ctx.createBufferSource();
    crack.buffer = crackBuf;
    const crackHP   = filter(ctx, 'highpass', 2200 * pitch, 0.8);
    const crackGain = ctx.createGain();
    adsr(crackGain.gain, ctx, { attack: 0.001, hold: 0.004, decay: 0.09, peak: 0.48 * vol });
    crack.connect(crackHP);
    crackHP.connect(crackGain);
    crackGain.connect(out);
    crack.start(now);
    crack.stop(now + 0.13);

    // Mid metallic ring (short square → bandpass)
    const ring = ctx.createOscillator();
    ring.type = 'square';
    ring.frequency.value = 370 * pitch;
    const ringBP   = filter(ctx, 'bandpass', 370 * pitch, 9);
    const ringGain = ctx.createGain();
    adsr(ringGain.gain, ctx, { attack: 0.001, hold: 0.015, decay: 0.19, peak: 0.18 * vol });
    ring.connect(ringBP);
    ringBP.connect(ringGain);
    ringGain.connect(out);
    ring.start(now);
    ring.stop(now + 0.28);

    return null;
  },


  // ── stuck — hazard interrupt / seized bolt ────────────────
  //
  // Conveys strain and grinding: a sawtooth-modulated noise band
  // (gritty buzzing) + a low "straining" sawtooth tone through
  // a tight lowpass.

  stuck(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    const dur = 0.5;

    // Gritty noise band
    const noiseBuf = noiseBuffer(ctx, dur + 0.05);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const noiseBP = filter(ctx, 'bandpass', 260 * pitch, 0.7);
    const noiseLP = filter(ctx, 'lowpass',  750 * pitch, 0.9);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.52 * vol, now + 0.025);
    noiseGain.gain.setValueAtTime(0.52 * vol, now + dur - 0.12);
    noiseGain.gain.linearRampToValueAtTime(0, now + dur);

    // Sawtooth LFO amplitude-modulates the noise for "buzz" character
    const lfo = ctx.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.value = 44 * pitch;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.25;
    lfo.connect(lfoGain);
    lfoGain.connect(noiseGain.gain);

    noise.connect(noiseBP);
    noiseBP.connect(noiseLP);
    noiseLP.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(now);
    noise.stop(now + dur + 0.06);
    lfo.start(now);
    lfo.stop(now + dur + 0.06);

    // Low strain tone
    const strain = ctx.createOscillator();
    strain.type = 'sawtooth';
    strain.frequency.value = 75 * pitch;
    const strainLP   = filter(ctx, 'lowpass', 190, 0.6);
    const strainGain = ctx.createGain();
    adsr(strainGain.gain, ctx, { attack: 0.02, hold: dur - 0.14, decay: 0.1, peak: 0.28 * vol });
    strain.connect(strainLP);
    strainLP.connect(strainGain);
    strainGain.connect(out);
    strain.start(now);
    strain.stop(now + dur + 0.06);

    return null;
  },


  // ── torque_click — precision green zone ───────────────────
  //
  // Cleaner and higher-pitched than a ratchet: a tight bandpass
  // noise spike + a fast sine "tock" sweep.

  torque_click(ctx, out, vol, pitch) {
    const now = ctx.currentTime;

    // Sharp noise spike
    const noiseBuf = noiseBuffer(ctx, 0.055);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const bp        = filter(ctx, 'bandpass', 5800 * pitch, 3.2);
    const noiseGain = ctx.createGain();
    adsr(noiseGain.gain, ctx, { attack: 0.001, hold: 0.002, decay: 0.032, peak: 0.48 * vol });
    noise.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(now);
    noise.stop(now + 0.06);

    // Tone tock
    const tock = ctx.createOscillator();
    tock.type = 'sine';
    tock.frequency.setValueAtTime(840 * pitch, now);
    tock.frequency.exponentialRampToValueAtTime(280 * pitch, now + 0.042);
    const tockGain = ctx.createGain();
    adsr(tockGain.gain, ctx, { attack: 0.001, hold: 0.003, decay: 0.038, peak: 0.28 * vol });
    tock.connect(tockGain);
    tockGain.connect(out);
    tock.start(now);
    tock.stop(now + 0.06);

    return null;
  },


  // ── miss — precision red zone ─────────────────────────────
  //
  // A short descending square-wave buzz through a lowpass,
  // communicating "wrong" without being harsh.

  miss(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(210 * pitch, now);
    osc.frequency.linearRampToValueAtTime(130 * pitch, now + 0.22);

    const lp   = filter(ctx, 'lowpass', 440, 0.8);
    const gain = ctx.createGain();
    adsr(gain.gain, ctx, { attack: 0.003, hold: 0.13, decay: 0.09, peak: 0.38 * vol });

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.32);

    return null;
  },


  // ── aha — diagnosis correct ───────────────────────────────
  //
  // Two triangle-wave chime notes staggered 120ms apart,
  // ascending: E5 → A5.  Soft attack, long exponential decay.

  aha(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    [[659, 0], [880, 0.12]].forEach(([freq, delay]) => {
      const t   = now + delay;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq * pitch;

      const g = ctx.createGain();
      adsr(g.gain, ctx, { t, attack: 0.012, hold: 0.04, decay: 0.32, peak: 0.32 * vol });

      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.42);
    });
    return null;
  },


  // ── wrong — diagnosis incorrect ───────────────────────────
  //
  // Descending sawtooth buzz through a lowpass — tonally "off"
  // but not aggressive.

  wrong(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(110 * pitch, now + 0.28);

    const lp   = filter(ctx, 'lowpass', 520, 0.8);
    const gain = ctx.createGain();
    adsr(gain.gain, ctx, { attack: 0.004, hold: 0.16, decay: 0.1, peak: 0.38 * vol });

    osc.connect(lp);
    lp.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.35);

    return null;
  },


  // ── sand_loop — bodywork hold ─────────────────────────────
  //
  // Continuous sanding / abrasive sound: two overlapping bandpass
  // noise bands (rough surface + fine grit) with a slow LFO on
  // the amplitude to simulate irregular strokes.
  //
  // Returns a { stop() } handle. Caller must call stop().

  sand_loop(ctx, out, vol /*, pitch unused for noise */) {
    // 4-second windowed buffer — long enough that the loop seam
    // is imperceptible at typical bodywork session lengths.
    const dur = 4.0;
    const buf = noiseBuffer(ctx, dur);

    const src = ctx.createBufferSource();
    src.buffer    = buf;
    src.loop      = true;
    src.loopStart = 0.1;
    src.loopEnd   = dur - 0.1;

    // Rough grit band: ~2 kHz
    const bp1 = filter(ctx, 'bandpass', 2100, 0.75);
    // Fine scratch band: ~4 kHz
    const bp2 = filter(ctx, 'bandpass', 3900, 1.1);
    // Shared lowpass to soften the result
    const lp  = filter(ctx, 'lowpass',  5500, 0.7);

    const merge = ctx.createGain();
    merge.gain.value = 1;

    // Slow stroke LFO (2.2 Hz ≈ "one stroke every 450ms")
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 2.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.14;   // ±14% amplitude swing

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.28 * vol;

    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);

    src.connect(bp1);  bp1.connect(merge);
    src.connect(bp2);  bp2.connect(merge);
    merge.connect(lp);
    lp.connect(masterGain);
    masterGain.connect(out);

    src.start();
    lfo.start();

    return {
      stop() {
        try { src.stop();  } catch (_) { /* already stopped */ }
        try { lfo.stop();  } catch (_) { /* already stopped */ }
      }
    };
  },


  // ── system_complete — system finished ─────────────────────
  //
  // A four-note ascending arpeggio (C5 E5 G5 C6), each note
  // a sine + soft triangle octave-up, notes spaced 120ms apart.
  // The final C6 has a longer tail for a satisfying resolution.

  system_complete(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    const notes = [523.25, 659.26, 783.99, 1046.50]; // C5 E5 G5 C6

    notes.forEach((freq, i) => {
      const t    = now + i * 0.12;
      const isFinal = i === notes.length - 1;

      // Primary sine
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq * pitch;
      const g1 = ctx.createGain();
      adsr(g1.gain, ctx, {
        t,
        attack: 0.012,
        hold:   0.04,
        decay:  isFinal ? 0.7 : 0.42,
        peak:   0.26 * vol
      });
      osc1.connect(g1); g1.connect(out);
      osc1.start(t);    osc1.stop(t + (isFinal ? 0.9 : 0.6));

      // Soft triangle an octave up (adds shimmer without being bright)
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 2 * pitch;
      const g2 = ctx.createGain();
      adsr(g2.gain, ctx, {
        t,
        attack: 0.012,
        hold:   0.02,
        decay:  isFinal ? 0.5 : 0.28,
        peak:   0.07 * vol
      });
      osc2.connect(g2); g2.connect(out);
      osc2.start(t);    osc2.stop(t + 0.55);
    });

    return null;
  },


  // ── engine_start — first start ceremony ───────────────────
  //
  // Three phases:
  //   1. CRANK  (0–2.1s): rhythmic low-frequency noise pulses,
  //      each pulse slightly louder than the last (rising tension).
  //   2. CATCH  (2.1–2.4s): brief noise burst + sharp pitch spike
  //      as the engine "catches" and the first compression fires.
  //   3. IDLE   (2.4–6.0s): sustained engine rumble using a
  //      sawtooth oscillator at firing frequency (~12 Hz for a
  //      4-cyl at ~900 RPM) + filtered noise bed.  RPM drops
  //      slightly then settles into a smooth idle.

  engine_start(ctx, out, vol, pitch) {
    const now = ctx.currentTime;

    // ── Phase 1: Crank ──────────────────────────────────────
    const crankDuration  = 2.1;
    const crankPulseHz   = 6.5; // pulses per second
    const pulseCount     = Math.floor(crankDuration * crankPulseHz);
    const crankBuf       = noiseBuffer(ctx, 0.15);   // shared buffer

    for (let i = 0; i < pulseCount; i++) {
      const t        = now + i / crankPulseHz;
      const progress = i / pulseCount;              // 0 → 1

      const src = ctx.createBufferSource();
      src.buffer = crankBuf;

      const bp = filter(ctx, 'bandpass', (110 + i * 2) * pitch, 0.55);
      const lp = filter(ctx, 'lowpass',  380 * pitch, 0.7);
      const g  = ctx.createGain();

      // Swell: each pulse is louder than the last
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime((0.18 + progress * 0.28) * vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);

      src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(out);
      src.start(t);
      src.stop(t + 0.15);
    }

    // ── Phase 2: Catch ──────────────────────────────────────
    const catchT   = now + crankDuration;
    const catchBuf = noiseBuffer(ctx, 0.28);

    // Noise burst
    const catchSrc  = ctx.createBufferSource();
    catchSrc.buffer = catchBuf;
    const catchBP   = filter(ctx, 'bandpass', 180 * pitch, 0.6);
    const catchGain = ctx.createGain();
    catchGain.gain.setValueAtTime(0, catchT);
    catchGain.gain.linearRampToValueAtTime(0.65 * vol, catchT + 0.018);
    catchGain.gain.exponentialRampToValueAtTime(0.0001, catchT + 0.28);
    catchSrc.connect(catchBP); catchBP.connect(catchGain); catchGain.connect(out);
    catchSrc.start(catchT);
    catchSrc.stop(catchT + 0.3);

    // Pitch spike (engine compression "pop")
    const pop = ctx.createOscillator();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(180 * pitch, catchT);
    pop.frequency.exponentialRampToValueAtTime(60 * pitch, catchT + 0.22);
    const popGain = ctx.createGain();
    adsr(popGain.gain, ctx, { t: catchT, attack: 0.003, hold: 0.01, decay: 0.2, peak: 0.45 * vol });
    pop.connect(popGain); popGain.connect(out);
    pop.start(catchT);
    pop.stop(catchT + 0.3);

    // ── Phase 3: Idle ───────────────────────────────────────
    const idleT   = catchT + 0.22;
    const idleDur = 3.6;

    // Firing oscillator — sawtooth at idle firing frequency
    // 4-stroke 4-cyl at 900 RPM = 900/60/2 × 4 = 30 firing events/s
    // Perceptually 12–15 Hz works best to suggest engine character
    const firingHz = 13 * pitch;
    const firing   = ctx.createOscillator();
    firing.type = 'sawtooth';
    firing.frequency.setValueAtTime(firingHz * 1.18, idleT);          // slightly high at catch
    firing.frequency.linearRampToValueAtTime(firingHz * 0.87, idleT + 0.9);  // RPM drops
    firing.frequency.linearRampToValueAtTime(firingHz,        idleT + 1.8);  // settles

    const firingLP   = filter(ctx, 'lowpass',  130, 0.55);
    const firingGain = ctx.createGain();
    firingGain.gain.setValueAtTime(0, idleT);
    firingGain.gain.linearRampToValueAtTime(0.32 * vol, idleT + 0.35);
    firingGain.gain.setValueAtTime(0.32 * vol, idleT + idleDur - 0.5);
    firingGain.gain.linearRampToValueAtTime(0, idleT + idleDur);
    firing.connect(firingLP); firingLP.connect(firingGain); firingGain.connect(out);
    firing.start(idleT);
    firing.stop(idleT + idleDur + 0.05);

    // Rumble noise bed
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
    rumbleSrc.start(idleT);
    rumbleSrc.stop(idleT + idleDur + 0.1);

    // High-frequency texture (exhaust hiss / mechanical whirr)
    const hissHz   = 620 * pitch;
    const hiss     = ctx.createOscillator();
    hiss.type = 'triangle';
    hiss.frequency.setValueAtTime(hissHz * 1.2, idleT);
    hiss.frequency.linearRampToValueAtTime(hissHz, idleT + 1.5);
    const hissLP   = filter(ctx, 'bandpass', hissHz, 3);
    const hissGain = ctx.createGain();
    hissGain.gain.setValueAtTime(0, idleT);
    hissGain.gain.linearRampToValueAtTime(0.10 * vol, idleT + 0.5);
    hissGain.gain.setValueAtTime(0.10 * vol, idleT + idleDur - 0.4);
    hissGain.gain.linearRampToValueAtTime(0, idleT + idleDur);
    hiss.connect(hissLP); hissLP.connect(hissGain); hissGain.connect(out);
    hiss.start(idleT);
    hiss.stop(idleT + idleDur + 0.05);

    return null;
  },


  // ── gacha_3 — ★★★ reveal ─────────────────────────────────
  //
  // Modest: two triangle-wave chimes ascending (A4 → E5).
  // Enough to reward but not over-celebrate a common pull.

  gacha_3(ctx, out, vol, pitch) {
    const now = ctx.currentTime;
    [[440, 0], [659.26, 0.16]].forEach(([freq, delay]) => {
      const t   = now + delay;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq * pitch;
      const g = ctx.createGain();
      adsr(g.gain, ctx, { t, attack: 0.013, hold: 0.04, decay: 0.44, peak: 0.3 * vol });
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.55);
    });
    return null;
  },


  // ── gacha_4 — ★★★★ reveal ────────────────────────────────
  //
  // Richer: three-note ascending arpeggio (C5 E5 G5) using
  // sine + octave-up triangle for each note, followed by a
  // brief high-freq shimmer burst to add excitement.

  gacha_4(ctx, out, vol, pitch) {
    const now = ctx.currentTime;

    // Arpeggio
    [[523.25, 0], [659.26, 0.11], [783.99, 0.22]].forEach(([freq, delay]) => {
      const t = now + delay;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = freq * pitch;
      const g1 = ctx.createGain();
      adsr(g1.gain, ctx, { t, attack: 0.012, hold: 0.035, decay: 0.55, peak: 0.28 * vol });
      osc1.connect(g1); g1.connect(out);
      osc1.start(t); osc1.stop(t + 0.65);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = freq * 2 * pitch;
      const g2 = ctx.createGain();
      adsr(g2.gain, ctx, { t, attack: 0.012, hold: 0.02, decay: 0.35, peak: 0.07 * vol });
      osc2.connect(g2); g2.connect(out);
      osc2.start(t); osc2.stop(t + 0.45);
    });

    // Shimmer: highpass noise burst after the final note
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
    shimmerSrc.start(shimmerT);
    shimmerSrc.stop(shimmerT + 0.24);

    return null;
  },


  // ── gacha_5 — ★★★★★ reveal ───────────────────────────────
  //
  // Dramatic three-act reveal:
  //   Build  (0–0.5s)  — low rumble swell building tension
  //   Hit    (0.5s)    — full chord: C4 G4 C5 E5 G5 all at once
  //   Sparkle (0.55s+) — shimmer cascade + three trailing high
  //                       notes that ring out

  gacha_5(ctx, out, vol, pitch) {
    const now = ctx.currentTime;

    // ── Act 1: Build ───────────────────────────────────────
    const buildBuf = noiseBuffer(ctx, 0.6);
    const buildSrc = ctx.createBufferSource();
    buildSrc.buffer = buildBuf;
    const buildLP   = filter(ctx, 'lowpass', 280, 0.6);
    const buildGain = ctx.createGain();
    buildGain.gain.setValueAtTime(0, now);
    buildGain.gain.linearRampToValueAtTime(0.38 * vol, now + 0.44);
    buildGain.gain.linearRampToValueAtTime(0, now + 0.58);
    buildSrc.connect(buildLP); buildLP.connect(buildGain); buildGain.connect(out);
    buildSrc.start(now);
    buildSrc.stop(now + 0.62);

    // Rising shimmer into the hit
    const riseSrc = ctx.createBufferSource();
    riseSrc.buffer = noiseBuffer(ctx, 0.4);
    const riseHP   = filter(ctx, 'highpass', 3500, 0.9);
    const riseGain = ctx.createGain();
    riseGain.gain.setValueAtTime(0, now + 0.1);
    riseGain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.48);
    riseGain.gain.linearRampToValueAtTime(0, now + 0.52);
    riseSrc.connect(riseHP); riseHP.connect(riseGain); riseGain.connect(out);
    riseSrc.start(now + 0.1);
    riseSrc.stop(now + 0.55);

    // ── Act 2: Chord Hit ───────────────────────────────────
    const hitT = now + 0.50;
    // C4 G4 C5 E5 G5
    const hitFreqs = [261.63, 392.00, 523.25, 659.26, 783.99];
    hitFreqs.forEach((freq, i) => {
      const type = i < 2 ? 'sine' : 'triangle';
      const peak = (0.24 - i * 0.025) * vol;
      const tail = 1.1 + (hitFreqs.length - i) * 0.05;

      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * pitch;
      const g = ctx.createGain();
      adsr(g.gain, ctx, { t: hitT, attack: 0.014, hold: 0.035, decay: tail, peak });
      osc.connect(g); g.connect(out);
      osc.start(hitT); osc.stop(hitT + tail + 0.2);
    });

    // ── Act 3: Sparkle cascade ─────────────────────────────
    // Three overlapping highpass noise bursts, each slightly
    // higher and quieter
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

    // Three trailing high-pitched chime notes (C6 E6 G6)
    [[1046.50, 0.38], [1318.51, 0.52], [1567.98, 0.68]].forEach(([freq, delay]) => {
      const t   = hitT + delay;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * pitch;
      const g = ctx.createGain();
      adsr(g.gain, ctx, { t, attack: 0.01, hold: 0.02, decay: 0.45, peak: 0.10 * vol });
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.52);
    });

    return null;
  },


  // ── ui_click — button press ───────────────────────────────
  //
  // Clean and brief: tight bandpass noise + soft sine below it.
  // Quiet enough to never become annoying at high repetition.

  ui_click(ctx, out, vol, pitch) {
    const now = ctx.currentTime;

    const noiseBuf = noiseBuffer(ctx, 0.04);
    const noise    = ctx.createBufferSource();
    noise.buffer   = noiseBuf;
    const bp        = filter(ctx, 'bandpass', 1100 * pitch, 2.8);
    const noiseGain = ctx.createGain();
    adsr(noiseGain.gain, ctx, { attack: 0.001, hold: 0.002, decay: 0.022, peak: 0.22 * vol });
    noise.connect(bp); bp.connect(noiseGain); noiseGain.connect(out);
    noise.start(now); noise.stop(now + 0.04);

    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = 460 * pitch;
    const toneGain = ctx.createGain();
    adsr(toneGain.gain, ctx, { attack: 0.001, hold: 0.003, decay: 0.018, peak: 0.10 * vol });
    tone.connect(toneGain); toneGain.connect(out);
    tone.start(now); tone.stop(now + 0.04);

    return null;
  },
};


// ── AudioManager ─────────────────────────────────────────────

export class AudioManager {
  constructor() {
    // AudioContext must not be created until after a user gesture.
    this._ctx         = null;
    this._masterGain  = null;
    this._initialized = false;
    this._supported   = true;
    this._muted       = false;
    this._volume      = 0.7;

    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      console.warn('[AudioManager] Web Audio API is not supported in this browser. All sounds disabled.');
      this._supported = false;
    }
  }

  // ── Initialisation ────────────────────────────────────────

  /**
   * init() — call once on the first user gesture (click / touchstart).
   *
   * Creates the AudioContext and master gain node.  All subsequent
   * play() calls will work immediately — there is no preloading
   * phase because sounds are synthesised on demand.
   */
  async init() {
    if (!this._supported || this._initialized) return;

    try {
      const Ctx    = window.AudioContext || window.webkitAudioContext;
      this._ctx    = new Ctx();

      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = this._muted ? 0 : this._volume;
      this._masterGain.connect(this._ctx.destination);

      this._initialized = true;
    } catch (err) {
      console.warn('[AudioManager] Failed to initialise AudioContext:', err);
      this._supported = false;
    }
  }

  // ── API compatibility shim ────────────────────────────────

  /**
   * loadSound(name) — no-op in the procedural engine.
   *
   * Kept so that any existing main.js code that calls
   * `audio.loadSound(name)` continues to work without modification.
   * Returns null (no buffer to cache).
   */
  async loadSound(/* name */) {
    return null;
  }

  // ── Playback ──────────────────────────────────────────────

  /**
   * play(name, options) — synthesise and play a sound by name.
   *
   * Options:
   *   volume {number}  0–1, scales the synthesiser's output
   *   pitch  {number}  playbackRate / frequency multiplier (1.0 = normal)
   *   loop   {boolean} for sand_loop: ignored here (the synth handles it);
   *                    included for API compatibility
   *
   * Returns null for one-shot sounds.
   * Returns a { stop() } handle for sand_loop (looping sound).
   * Returns null silently if audio is unavailable.
   */
  play(name, options = {}) {
    if (!this._supported || !this._initialized) return null;

    // Browsers can silently suspend the context after inactivity (e.g. tab
    // backgrounded).  Kick it awake so scheduled sounds actually play.
    // resume() is async but the absolute-timestamp scheduling means sounds
    // queued immediately after will play once the context resumes (~ms later).
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(err => {
        console.warn('[AudioManager] Could not resume AudioContext:', err);
      });
    }

    if (this._muted) return null;

    const synth = SYNTHS[name];
    if (!synth) {
      console.warn(`[AudioManager] Unknown sound name: "${name}"`);
      return null;
    }

    try {
      const vol   = (options.volume != null) ? Math.max(0, Math.min(1, options.volume)) : 1.0;
      const pitch = (options.pitch  != null) ? options.pitch : 1.0;
      return synth(this._ctx, this._masterGain, vol, pitch) ?? null;
    } catch (err) {
      console.warn(`[AudioManager] Synthesis error for "${name}":`, err);
      return null;
    }
  }

  /**
   * stop(handle) — stop a looping sound.
   *
   * Pass the value returned by play('sand_loop').
   * Safe to call with null or undefined.
   */
  stop(handle) {
    if (!handle) return;
    try { handle.stop(); } catch (_) { /* already stopped */ }
  }

  // ── Volume & Mute ─────────────────────────────────────────

  /** setVolume(0–1) — updates master gain immediately */
  setVolume(value) {
    this._volume = Math.max(0, Math.min(1, value));
    if (this._masterGain && !this._muted) {
      this._masterGain.gain.value = this._volume;
    }
  }

  /**
   * toggleMute() — flip mute state.
   * Returns the new muted state (true = muted).
   */
  toggleMute() {
    this._muted = !this._muted;
    if (this._masterGain) {
      this._masterGain.gain.value = this._muted ? 0 : this._volume;
    }
    return this._muted;
  }

  getMuted()  { return this._muted; }
  getVolume() { return this._volume; }

  // ── Convenience methods ───────────────────────────────────

  /**
   * playRatchet() — pick a random ratchet variant and apply slight
   * random pitch variance (0.95–1.05) for an organic feel.
   * Called on every Wrench Work click.
   */
  playRatchet() {
    const name  = randPick(['ratchet_1', 'ratchet_2', 'ratchet_3']);
    const pitch = rand(0.95, 1.05);
    return this.play(name, { pitch });
  }

  /** playClick() — standard UI button feedback */
  playClick() {
    return this.play('ui_click');
  }

  /**
   * playRarityReveal(rarity) — play the appropriate gacha reveal sting.
   * @param {3|4|5} rarity — star rating of the pulled vehicle
   */
  playRarityReveal(rarity) {
    const name = rarity === 5 ? 'gacha_5'
               : rarity === 4 ? 'gacha_4'
               : 'gacha_3';
    return this.play(name);
  }
}


// ── Audio Controls UI ────────────────────────────────────────

/**
 * renderAudioControls(container, audioManager)
 *
 * Injects a mute toggle button (🔊/🔇) and a volume slider
 * into `container`.  Designed for the game header or a settings
 * panel.  Pure DOM — no framework required.
 *
 * @param {HTMLElement}  container     — where to render
 * @param {AudioManager} audioManager  — the singleton instance
 * @returns {HTMLElement} the wrapper div (so callers can reposition/remove it)
 */
export function renderAudioControls(container, audioManager) {
  if (!container || !audioManager) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'audio-controls';
  wrapper.style.cssText = [
    'display: flex',
    'align-items: center',
    'gap: var(--space-sm, 6px)',
  ].join(';');

  // ── Mute button ──────────────────────────────────────────

  const muteBtn = document.createElement('button');
  muteBtn.className   = 'btn btn--ghost audio-controls__mute';
  muteBtn.title       = 'Toggle mute';
  muteBtn.style.cssText = [
    'font-size: 1rem',
    'padding: 2px 6px',
    'line-height: 1',
    'cursor: pointer',
    'background: none',
    'border: none',
  ].join(';');

  // ── Volume slider ────────────────────────────────────────

  const slider = document.createElement('input');
  slider.type      = 'range';
  slider.className = 'audio-controls__volume';
  slider.min       = '0';
  slider.max       = '1';
  slider.step      = '0.05';
  slider.value     = String(audioManager.getVolume());
  slider.title     = 'Volume';
  slider.setAttribute('aria-label', 'Volume');
  slider.style.cssText = [
    'width: 72px',
    'cursor: pointer',
    'accent-color: var(--accent, #e5c100)',
  ].join(';');

  // ── Sync helper ──────────────────────────────────────────

  function syncUI() {
    const muted       = audioManager.getMuted();
    muteBtn.textContent = muted ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    slider.disabled     = muted;
    slider.style.opacity = muted ? '0.4' : '1';
  }

  // ── Events ───────────────────────────────────────────────

  muteBtn.addEventListener('click', () => {
    audioManager.toggleMute();
    syncUI();
  });

  slider.addEventListener('input', () => {
    audioManager.setVolume(parseFloat(slider.value));
    // Un-mute automatically when the user moves the slider
    if (audioManager.getMuted()) {
      audioManager.toggleMute();
      syncUI();
    }
  });

  // ── Assemble ─────────────────────────────────────────────

  wrapper.append(muteBtn, slider);
  container.append(wrapper);
  syncUI();

  return wrapper;
}
