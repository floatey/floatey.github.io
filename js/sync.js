// ════════════════════════════════════════════════════════════
//  sync.js — Firebase Realtime Database sync manager (stub)
// ════════════════════════════════════════════════════════════

export class SyncManager {
  constructor() {
    this._status = 'offline'; // 'synced' | 'saving' | 'offline' | 'conflict'
    this._profileId = null;
  }

  start(profileId) {
    this._profileId = profileId;
    // TODO: initial read, conflict check, auto-sync interval
    console.log(`[SyncManager] started for profile: ${profileId}`);
  }

  getStatusIcon() {
    const icons = { synced: '🟢', saving: '🟡', offline: '🔴', conflict: '⚠️' };
    return icons[this._status] || '🔴';
  }

  getStatusLabel() {
    const labels = { synced: 'Saved', saving: 'Saving…', offline: 'Offline', conflict: 'Conflict' };
    return labels[this._status] || 'Offline';
  }
}
