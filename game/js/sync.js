// ════════════════════════════════════════════════════════════
//  sync.js — Firebase Realtime Database sync layer
//  localStorage is primary; Firebase is the sync layer.
// ════════════════════════════════════════════════════════════

import { getDatabase, ref, set, get, onValue, push, remove, query, orderByChild, limitToLast }
  from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

// ── Paths ───────────────────────────────────────────────────
const ROOT          = 'tmcc-game';
const PROFILES_PATH = `${ROOT}/profiles`;
const FEED_PATH     = `${ROOT}/feed`;
const FEED_MAX      = 50;
const AUTO_SYNC_MS  = 120_000;  // 2 minutes

// ── Sync status enum ────────────────────────────────────────
const Status = Object.freeze({
  SAVED:    'saved',
  SAVING:   'saving',
  OFFLINE:  'offline',
  CONFLICT: 'conflict',
});

// ════════════════════════════════════════════════════════════
//  SyncManager
// ════════════════════════════════════════════════════════════

export class SyncManager {
  constructor() {
    this._db            = null;
    this._gameState     = null;
    this._profileId     = null;
    this._profileRef    = null;
    this._syncStatus    = Status.OFFLINE;
    this._lastSyncedAt  = 0;
    this._syncTimer     = null;
    this._listener      = null;     // onValue unsubscribe fn
    this._conflictCache = null;     // cached remote data during conflict
    this._started       = false;

    // Bind lifecycle handlers
    this._onVisibilityChange = this._handleVisibilityChange.bind(this);
    this._onBeforeUnload     = this._handleBeforeUnload.bind(this);
  }

  // ── Public API ──────────────────────────────────────────

  /**
   * Initialise sync for a given profile.
   * Call after GameState.load(profileId).
   *
   * @param {string} profileId
   * @returns {{ status: 'ok'|'conflict', remoteData?: object }}
   */
  async init(profileId) {
    // Grab Firebase references from window._firebase (set up by index.html)
    if (!window._firebase) {
      console.warn('[Sync] Firebase not available — running offline');
      this._syncStatus = Status.OFFLINE;
      return { status: 'ok' };
    }

    this._db         = window._firebase.db;
    this._profileId  = profileId;
    this._profileRef = ref(this._db, `${PROFILES_PATH}/${profileId}`);

    // Resolve the GameState singleton (imported lazily to avoid circular deps)
    const { getApp } = await import('./main.js');
    this._gameState = getApp().state;

    try {
      // Read remote profile
      const snapshot = await get(this._profileRef);
      const remoteData = snapshot.exists() ? snapshot.val() : null;

      if (remoteData) {
        const localModified  = this._gameState.getState().lastModified || 0;
        const remoteModified = remoteData.lastModified || 0;

        if (remoteModified > localModified) {
          // Remote is newer — surface conflict
          this._syncStatus    = Status.CONFLICT;
          this._conflictCache = remoteData;
          this._attachLifecycleListeners();
          return { status: 'conflict', remoteData };
        }

        // Local is newer or equal — local wins, push to remote
        await this._writeToFirebase();
      } else {
        // No remote data — write local defaults
        await this._writeToFirebase();
      }

      this._syncStatus = Status.SAVED;
    } catch (err) {
      console.error('[Sync] init read failed:', err);
      this._syncStatus = Status.OFFLINE;
    }

    this._startAutoSync();
    this._attachLifecycleListeners();
    this._started = true;

    return { status: 'ok' };
  }

  /**
   * (Re)start sync for a profile — convenience alias called from main.js.
   */
  start(profileId) {
    // If already running for this profile, skip re-init
    if (this._started && this._profileId === profileId) return;
    this.init(profileId);
  }

  /**
   * Write the current GameState to Firebase if dirty.
   */
  async write() {
    if (!this._gameState || !this._profileRef) return;
    if (!this._gameState.isDirty()) return;

    this._syncStatus = Status.SAVING;
    this._notifyHeader();

    try {
      // Conflict guard: read remote lastModified before writing
      const snapshot = await get(this._profileRef);
      if (snapshot.exists()) {
        const remoteModified = snapshot.val().lastModified || 0;
        if (remoteModified > this._lastSyncedAt && this._lastSyncedAt > 0) {
          // Another device wrote since our last sync
          this._syncStatus    = Status.CONFLICT;
          this._conflictCache = snapshot.val();
          this._notifyHeader();
          this._showConflictModal(snapshot.val());
          return;
        }
      }

      await this._writeToFirebase();
      this._syncStatus = Status.SAVED;
    } catch (err) {
      console.error('[Sync] write failed:', err);
      this._syncStatus = Status.OFFLINE;
    }

    this._notifyHeader();
  }

  /**
   * Read the remote profile data.
   * @returns {object|null}
   */
  async read() {
    if (!this._profileRef) return null;
    try {
      const snapshot = await get(this._profileRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (err) {
      console.error('[Sync] read failed:', err);
      return null;
    }
  }

  /**
   * Resolve a sync conflict.
   * @param {'local'|'remote'} choice
   */
  async resolveConflict(choice) {
    if (choice === 'local') {
      // Overwrite remote with local
      await this._writeToFirebase();
      this._syncStatus = Status.SAVED;
    } else if (choice === 'remote' && this._conflictCache) {
      // Load remote into GameState
      this._gameState.setState(this._conflictCache);
      this._lastSyncedAt = this._conflictCache.lastModified || Date.now();
      this._gameState.clearDirty();
      this._syncStatus = Status.SAVED;
    }

    this._conflictCache = null;
    this._notifyHeader();

    // Re-route to refresh the active view
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  /**
   * Post an event to the shared activity feed.
   * @param {{ who: string, what: string, detail: string }} event
   */
  async postToFeed(event) {
    if (!this._db) return;
    const feedRef = ref(this._db, FEED_PATH);

    try {
      const newEntryRef = push(feedRef);
      await set(newEntryRef, {
        who:    event.who,
        what:   event.what,
        detail: event.detail,
        when:   Date.now(),
      });

      // Enforce max 50 entries
      await this._trimFeed();
    } catch (err) {
      console.error('[Sync] postToFeed failed:', err);
    }
  }

  /**
   * Read the shared activity feed, newest first.
   * @returns {Array<object>}
   */
  async readFeed() {
    if (!this._db) return [];
    const feedRef = ref(this._db, FEED_PATH);

    try {
      const snapshot = await get(feedRef);
      if (!snapshot.exists()) return [];

      const data = snapshot.val();
      const entries = Object.entries(data).map(([key, val]) => ({
        id: key,
        ...val,
      }));

      // Sort newest first
      entries.sort((a, b) => (b.when || 0) - (a.when || 0));
      return entries;
    } catch (err) {
      console.error('[Sync] readFeed failed:', err);
      return [];
    }
  }

  /**
   * Read another player's profile (for garage visits).
   * @param {string} profileId
   * @returns {object|null}
   */
  async readProfile(profileId) {
    if (!this._db) return null;
    const profileRef = ref(this._db, `${PROFILES_PATH}/${profileId}`);

    try {
      const snapshot = await get(profileRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (err) {
      console.error('[Sync] readProfile failed:', err);
      return null;
    }
  }

  /**
   * Current sync status string.
   */
  getSyncStatus() {
    return this._syncStatus;
  }

  /**
   * Emoji icon for the header indicator.
   */
  getStatusIcon() {
    switch (this._syncStatus) {
      case Status.SAVED:    return '🟢';
      case Status.SAVING:   return '🟡';
      case Status.OFFLINE:  return '🔴';
      case Status.CONFLICT: return '⚠️';
      default:              return '🔴';
    }
  }

  /**
   * Human-readable label for the header indicator.
   */
  getStatusLabel() {
    switch (this._syncStatus) {
      case Status.SAVED:    return 'Saved';
      case Status.SAVING:   return 'Saving…';
      case Status.OFFLINE:  return 'Offline';
      case Status.CONFLICT: return 'Conflict';
      default:              return 'Offline';
    }
  }

  /**
   * Tear down listeners, timers; attempt final write.
   */
  destroy() {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }

    if (this._listener) {
      this._listener();   // unsubscribe onValue
      this._listener = null;
    }

    this._detachLifecycleListeners();

    // Final write attempt
    if (this._gameState && this._gameState.isDirty()) {
      this._writeToFirebase().catch(() => {});
    }

    this._started = false;
  }

  // ── Lifecycle hooks ─────────────────────────────────────

  _handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      this.write();
    }
  }

  _handleBeforeUnload() {
    if (!this._gameState || !this._gameState.isDirty() || !this._profileRef) return;

    // Attempt synchronous-ish write via sendBeacon as fallback
    try {
      const state = this._gameState.getState();
      state.lastModified = Date.now();
      const payload = JSON.stringify(state);

      // sendBeacon can't write to Firebase RTDB directly, but we still
      // attempt a normal set() — the browser may allow it to complete.
      this._writeToFirebase().catch(() => {});
    } catch {
      // Best-effort; localStorage already has the latest data
    }
  }

  _attachLifecycleListeners() {
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    window.addEventListener('beforeunload', this._onBeforeUnload);
  }

  _detachLifecycleListeners() {
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    window.removeEventListener('beforeunload', this._onBeforeUnload);
  }

  // ── Internal helpers ────────────────────────────────────

  /**
   * Write the full profile object to Firebase in one set() call.
   */
  async _writeToFirebase() {
    if (!this._gameState || !this._profileRef) return;

    const state = this._gameState.getState();
    state.lastModified = Date.now();

    await set(this._profileRef, state);

    this._lastSyncedAt = state.lastModified;
    this._gameState.clearDirty();
  }

  /**
   * Start the 120-second auto-sync interval.
   */
  _startAutoSync() {
    if (this._syncTimer) clearInterval(this._syncTimer);

    this._syncTimer = setInterval(() => {
      this.write();
    }, AUTO_SYNC_MS);
  }

  /**
   * Trim the feed to FEED_MAX entries, deleting oldest.
   */
  async _trimFeed() {
    const feedRef = ref(this._db, FEED_PATH);

    try {
      const snapshot = await get(feedRef);
      if (!snapshot.exists()) return;

      const data = snapshot.val();
      const keys = Object.keys(data);

      if (keys.length <= FEED_MAX) return;

      // Sort by `when` ascending (oldest first)
      const sorted = keys
        .map(k => ({ key: k, when: data[k].when || 0 }))
        .sort((a, b) => a.when - b.when);

      // Delete oldest entries beyond the cap
      const toDelete = sorted.slice(0, keys.length - FEED_MAX);

      for (const entry of toDelete) {
        const entryRef = ref(this._db, `${FEED_PATH}/${entry.key}`);
        await remove(entryRef);
      }
    } catch (err) {
      console.error('[Sync] trimFeed failed:', err);
    }
  }

  /**
   * Notify the header to re-render (import lazily to avoid circular deps).
   */
  _notifyHeader() {
    import('./main.js').then(({ refreshHeader }) => refreshHeader()).catch(() => {});
  }

  /**
   * Show the conflict modal with cached remote data.
   */
  _showConflictModal(remoteData) {
    const localData = this._gameState.getState();
    renderConflictModal(localData, remoteData, (choice) => {
      this.resolveConflict(choice);
    });
  }
}

// ════════════════════════════════════════════════════════════
//  Conflict Modal
// ════════════════════════════════════════════════════════════

/**
 * Render a blocking conflict-resolution modal.
 *
 * @param {object} localData   — local profile state
 * @param {object} remoteData  — remote profile state from Firebase
 * @param {function} onResolve — callback: onResolve('local') or onResolve('remote')
 */
export function renderConflictModal(localData, remoteData, onResolve) {
  // Remove any existing modal
  const existing = document.getElementById('sync-conflict-modal');
  if (existing) existing.remove();

  const localTime  = localData.lastModified
    ? new Date(localData.lastModified).toLocaleString()
    : 'Unknown';
  const remoteTime = remoteData.lastModified
    ? new Date(remoteData.lastModified).toLocaleString()
    : 'Unknown';

  // Build DOM
  const overlay = document.createElement('div');
  overlay.id = 'sync-conflict-modal';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0, 0, 0, 0.75);
    font-family: 'Inter', sans-serif;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: #1a1d2e; border: 1px solid #3a3f5c;
    border-radius: 12px; padding: 2rem; max-width: 420px; width: 90%;
    color: #cdd1e8; text-align: center;
  `;

  const heading = document.createElement('h2');
  heading.textContent = '⚠️ Data Conflict Detected';
  heading.style.cssText = 'margin: 0 0 1rem; font-size: 1.25rem; color: #f5c542;';

  const desc = document.createElement('p');
  desc.textContent = 'Your save data differs between this device and the cloud. Choose which version to keep:';
  desc.style.cssText = 'margin: 0 0 1.25rem; font-size: 0.9rem; line-height: 1.5; color: #9ca0b8;';

  const timestamps = document.createElement('div');
  timestamps.style.cssText = 'margin-bottom: 1.5rem; font-size: 0.85rem;';
  timestamps.innerHTML = `
    <div style="margin-bottom: 0.5rem;">
      <strong style="color:#6bc5f7;">This device:</strong> ${localTime}
    </div>
    <div>
      <strong style="color:#f7a46b;">Other device:</strong> ${remoteTime}
    </div>
  `;

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 1rem; justify-content: center;';

  const btnLocal = document.createElement('button');
  btnLocal.textContent = 'Use This Device';
  btnLocal.style.cssText = `
    padding: 0.65rem 1.25rem; border: 1px solid #6bc5f7; border-radius: 8px;
    background: transparent; color: #6bc5f7; font-weight: 600; cursor: pointer;
    font-size: 0.9rem; transition: background 0.2s;
  `;
  btnLocal.addEventListener('mouseenter', () => { btnLocal.style.background = 'rgba(107,197,247,0.15)'; });
  btnLocal.addEventListener('mouseleave', () => { btnLocal.style.background = 'transparent'; });

  const btnRemote = document.createElement('button');
  btnRemote.textContent = 'Use Other Device';
  btnRemote.style.cssText = `
    padding: 0.65rem 1.25rem; border: 1px solid #f7a46b; border-radius: 8px;
    background: transparent; color: #f7a46b; font-weight: 600; cursor: pointer;
    font-size: 0.9rem; transition: background 0.2s;
  `;
  btnRemote.addEventListener('mouseenter', () => { btnRemote.style.background = 'rgba(247,164,107,0.15)'; });
  btnRemote.addEventListener('mouseleave', () => { btnRemote.style.background = 'transparent'; });

  // Wire up resolution
  function resolve(choice) {
    overlay.remove();
    onResolve(choice);
  }

  btnLocal.addEventListener('click',  () => resolve('local'));
  btnRemote.addEventListener('click', () => resolve('remote'));

  btnRow.append(btnLocal, btnRemote);
  card.append(heading, desc, timestamps, btnRow);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
