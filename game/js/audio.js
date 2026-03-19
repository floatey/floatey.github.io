// ════════════════════════════════════════════════════════════
//  audio.js — Sound Manager (Web Audio API)
//  JDM Restoration Garage
// ════════════════════════════════════════════════════════════
//
//  USAGE:
//    import { AudioManager, renderAudioControls } from './audio.js';
//
//    const audio = new AudioManager();
//
//    // On first user gesture (main.js wires this up):
//    audio.init();
//
//    // Play sounds:
//    audio.playRatchet();
//    audio.play('impact');
//    audio.play('sand_loop', { loop: true });
//    audio.playRarityReveal(5);
//
//  SOUND TRIGGER MAP (from GDD §9):
//    ratchet_1/2/3  — Wrench Work, each click (use playRatchet())
//    impact         — Wrench Work, critical click
//    stuck          — Wrench Work, hazard interrupt
//    torque_click   — Precision, green zone hit
//    miss           — Precision, red zone hit
//    aha            — Diagnosis, correct answer
//    wrong          — Diagnosis, incorrect answer
//    sand_loop      — Bodywork, while holding zone (looping)
//    system_complete— Any system completion
//    engine_start   — First Start moment
//    gacha_3/4/5    — Pull reveal, per rarity tier (use playRarityReveal())
//    ui_click       — Any button press
// ════════════════════════════════════════════════════════════

// ── Sound registry ──────────────────────────────────────────
// Paths are relative to the HTML document root (game/index.html).
// If the audio/ directory doesn't exist yet all fetches will
// silently fail — gameplay is never interrupted.

const SOUNDS = {
  ratchet_1:       'audio/ratchet_1.mp3',
  ratchet_2:       'audio/ratchet_2.mp3',
  ratchet_3:       'audio/ratchet_3.mp3',
  impact:          'audio/impact.mp3',
  stuck:           'audio/stuck.mp3',
  torque_click:    'audio/torque_click.mp3',
  miss:            'audio/miss.mp3',
  aha:             'audio/aha.mp3',
  wrong:           'audio/wrong.mp3',
  sand_loop:       'audio/sand_loop.mp3',
  system_complete: 'audio/system_complete.mp3',
  engine_start:    'audio/engine_start.mp3',
  gacha_3:         'audio/gacha_3.mp3',
  gacha_4:         'audio/gacha_4.mp3',
  gacha_5:         'audio/gacha_5.mp3',
  ui_click:        'audio/ui_click.mp3',
};

// ── Helpers ─────────────────────────────────────────────────

/** Float in [min, max) */
function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

/** Pick a random element from an array */
function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── AudioManager ────────────────────────────────────────────

export class AudioManager {
  constructor() {
    // AudioContext is NOT created here — must wait for a user gesture.
    this._ctx          = null;
    this._masterGain   = null;
    this._cache        = new Map();   // name → AudioBuffer
    this._initialized  = false;
    this._supported    = true;        // false if Web Audio API is absent
    this._muted        = false;
    this._volume       = 0.7;

    // Check browser support up-front so we don't spam the console
    // with repeated errors on every play() call.
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      console.warn('[AudioManager] Web Audio API not supported in this browser. All sounds disabled.');
      this._supported = false;
    }
  }

  // ── Initialisation ────────────────────────────────────────

  /**
   * init() — call on the first user gesture (click / touchstart).
   * Creates the AudioContext and preloads the most critical sounds
   * so there's no stutter on the very first interaction.
   */
  async init() {
    if (!this._supported || this._initialized) return;

    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this._ctx = new Ctx();

      // Master gain node — all sounds route through here
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = this._muted ? 0 : this._volume;
      this._masterGain.connect(this._ctx.destination);

      this._initialized = true;

      // Preload the sounds that fire first so there's no latency
      const critical = ['ratchet_1', 'ratchet_2', 'ratchet_3', 'ui_click'];
      await Promise.all(critical.map(name => this.loadSound(name)));
    } catch (err) {
      console.warn('[AudioManager] Failed to initialise AudioContext:', err);
      this._supported = false;
    }
  }

  // ── Loading ───────────────────────────────────────────────

  /**
   * loadSound(name) — fetch, decode, and cache an AudioBuffer.
   * Returns the buffer, or null if the file can't be loaded.
   * Never throws.
   */
  async loadSound(name) {
    if (!this._supported || !this._initialized) return null;

    // Return from cache if already loaded
    if (this._cache.has(name)) return this._cache.get(name);

    const path = SOUNDS[name];
    if (!path) {
      console.warn(`[AudioManager] Unknown sound name: "${name}"`);
      return null;
    }

    try {
      const response = await fetch(path);
      if (!response.ok) {
        // 404 is expected while audio files are still being added —
        // store null in the cache so we don't retry on every call.
        this._cache.set(name, null);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this._ctx.decodeAudioData(arrayBuffer);
      this._cache.set(name, audioBuffer);
      return audioBuffer;
    } catch (err) {
      // Network error, decode error, or file doesn't exist yet
      console.warn(`[AudioManager] Could not load sound "${name}" (${path}):`, err.message ?? err);
      this._cache.set(name, null);
      return null;
    }
  }

  // ── Playback ──────────────────────────────────────────────

  /**
   * play(name, options) — play a sound by name.
   *
   * Options:
   *   volume {number}  0–1, overrides master gain for this sound
   *   pitch  {number}  playbackRate multiplier (1.0 = normal)
   *   loop   {boolean} loop the sound until stop() is called
   *
   * Returns the BufferSourceNode so callers can stop loops.
   * Returns null silently if audio is unavailable or file missing.
   */
  play(name, options = {}) {
    if (!this._supported || !this._initialized || this._muted) return null;

    const buffer = this._cache.get(name) ?? null;

    if (buffer === undefined) {
      // Not loaded yet — kick off a lazy load so it's ready next time
      this.loadSound(name).then(buf => {
        if (buf) this._playBuffer(buf, options);
      });
      return null;
    }

    if (buffer === null) {
      // Known-missing file — stay silent
      return null;
    }

    return this._playBuffer(buffer, options);
  }

  /** Internal — play a decoded AudioBuffer */
  _playBuffer(buffer, options = {}) {
    try {
      const source = this._ctx.createBufferSource();
      source.buffer = buffer;
      source.loop   = !!options.loop;

      if (options.pitch != null) {
        source.playbackRate.value = options.pitch;
      }

      // Per-sound volume via an inline gain node
      const gainNode = this._ctx.createGain();
      gainNode.gain.value = options.volume != null
        ? Math.max(0, Math.min(1, options.volume))
        : 1.0;

      source.connect(gainNode);
      gainNode.connect(this._masterGain);
      source.start(0);

      return source;
    } catch (err) {
      console.warn('[AudioManager] Playback error:', err);
      return null;
    }
  }

  /**
   * stop(sourceNode) — stop a looping sound returned by play().
   * Safe to call with null.
   */
  stop(sourceNode) {
    if (!sourceNode) return;
    try {
      sourceNode.stop();
    } catch (_) {
      // Already stopped — ignore
    }
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
   * playRatchet() — randomly picks one of the three ratchet variants
   * and applies slight pitch variance (0.95–1.05) for organic feel.
   * Called on every Wrench Work click.
   */
  playRatchet() {
    const name  = randPick(['ratchet_1', 'ratchet_2', 'ratchet_3']);
    const pitch = randBetween(0.95, 1.05);
    return this.play(name, { pitch });
  }

  /**
   * playClick() — standard UI button feedback.
   */
  playClick() {
    return this.play('ui_click');
  }

  /**
   * playRarityReveal(rarity) — plays the appropriate gacha sting.
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
 * Injects a mute toggle button and a volume slider into `container`.
 * Designed to live in the game header or a settings panel.
 * No framework required — plain DOM manipulation.
 *
 * @param {HTMLElement} container     — where to render
 * @param {AudioManager} audioManager — the singleton instance
 */
export function renderAudioControls(container, audioManager) {
  if (!container || !audioManager) return;

  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'audio-controls';
  wrapper.style.cssText = [
    'display: flex',
    'align-items: center',
    'gap: var(--space-sm, 6px)',
  ].join(';');

  // ── Mute button ────────────────────────────────────────
  const muteBtn = document.createElement('button');
  muteBtn.className   = 'btn btn--ghost audio-controls__mute';
  muteBtn.title       = 'Toggle mute';
  muteBtn.style.cssText = [
    'font-size: 1rem',
    'padding: 2px 6px',
    'line-height: 1',
    'cursor: pointer',
  ].join(';');

  function syncMuteButton() {
    muteBtn.textContent = audioManager.getMuted() ? '🔇' : '🔊';
    muteBtn.setAttribute('aria-label', audioManager.getMuted() ? 'Unmute' : 'Mute');
    slider.disabled = audioManager.getMuted();
    slider.style.opacity = audioManager.getMuted() ? '0.4' : '1';
  }

  muteBtn.addEventListener('click', () => {
    audioManager.toggleMute();
    syncMuteButton();
  });

  // ── Volume slider ──────────────────────────────────────
  const slider = document.createElement('input');
  slider.type        = 'range';
  slider.className   = 'audio-controls__volume';
  slider.min         = '0';
  slider.max         = '1';
  slider.step        = '0.05';
  slider.value       = String(audioManager.getVolume());
  slider.title       = 'Volume';
  slider.setAttribute('aria-label', 'Volume');
  slider.style.cssText = [
    'width: 72px',
    'cursor: pointer',
    'accent-color: var(--accent, #e5c100)',
  ].join(';');

  slider.addEventListener('input', () => {
    audioManager.setVolume(parseFloat(slider.value));
    // Un-mute automatically when user moves slider
    if (audioManager.getMuted()) {
      audioManager.toggleMute();
      syncMuteButton();
    }
  });

  // Assemble
  wrapper.append(muteBtn, slider);
  container.append(wrapper);

  // Initial state
  syncMuteButton();

  // Return the wrapper so callers can reposition / remove it
  return wrapper;
}
