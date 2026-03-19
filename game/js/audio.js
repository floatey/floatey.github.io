// audio.js — Sound manager (stub)

export class AudioManager {
  constructor() {
    this._ctx = null;  // Web Audio context, created on first user interaction
    this._muted = false;
  }

  play(soundId) {
    // TODO: load and play from audio/ folder
  }

  mute()   { this._muted = true; }
  unmute() { this._muted = false; }
  isMuted(){ return this._muted; }
}
