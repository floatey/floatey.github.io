// JDM RESTORATION GARAGE — CLUSTER 03: Firebase Sync Manager (sync.js)

window.SyncManager = (function () {
  let _profileId = null;
  let _ref = null;
  let _status = "saved";
  let _lastSyncedAt = 0;
  let _intervalId = null;
  let _onVisibilityChange = null;
  let _onBeforeUnload = null;

  // ── Status UI ──────────────────────────────────────────────────────

  function _setStatus(s) {
    _status = s;
    const el = document.getElementById("sync-indicator");
    if (!el) return;
    el.className = "sync-" + s;
    const labels = { saved: "🟢 Saved", saving: "🟡 Saving...", offline: "🔴 Offline", conflict: "⚠️ Conflict" };
    el.textContent = labels[s] || s;
    if (typeof App !== "undefined" && App.updateHeader) {
      App.updateHeader({ syncStatus: s });
    }
  }

  // ── Conflict Modal ─────────────────────────────────────────────────

  function _showConflictModal(remoteData) {
    return new Promise(function (resolve) {
      _setStatus("conflict");

      const overlay = document.createElement("div");
      overlay.style.cssText = [
        "position:fixed;inset:0;background:rgba(0,0,0,0.7);",
        "display:flex;align-items:center;justify-content:center;z-index:9999"
      ].join("");

      const card = document.createElement("div");
      card.style.cssText = [
        "background:#1a1a2e;color:#eee;border-radius:8px;padding:32px 28px;",
        "max-width:420px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.6);text-align:center"
      ].join("");

      card.innerHTML = [
        "<h2 style='margin:0 0 12px;font-size:1.2rem;color:#f0c040'>Save Conflict Detected</h2>",
        "<p style='margin:0 0 24px;font-size:0.95rem;line-height:1.5'>",
        "Another device has newer data for this profile.<br>",
        "Which version do you want to keep?</p>",
        "<div style='display:flex;gap:12px;justify-content:center'>",
        "<button id='conflict-local' style='padding:10px 18px;border:none;border-radius:5px;",
        "background:#e05c2a;color:#fff;cursor:pointer;font-weight:bold'>Use This Device</button>",
        "<button id='conflict-remote' style='padding:10px 18px;border:none;border-radius:5px;",
        "background:#2a7ae0;color:#fff;cursor:pointer;font-weight:bold'>Use Other Device</button>",
        "</div>"
      ].join("");

      overlay.appendChild(card);
      document.body.appendChild(overlay);

      function close() { document.body.removeChild(overlay); }

      card.querySelector("#conflict-local").addEventListener("click", function () {
        close();
        saveToRemote(true).then(resolve);
      });

      card.querySelector("#conflict-remote").addEventListener("click", function () {
        GameState.setProfile(remoteData);
        close();
        saveToRemote(true).then(resolve);
      });
    });
  }

  // ── Core Sync ──────────────────────────────────────────────────────

  function loadRemote() {
    return _ref.once("value").then(function (snapshot) {
      const remote = snapshot.val();
      if (remote) {
        const remoteTs = remote.lastModified || 0;
        const localTs  = GameState.getLastModified() || 0;
        if (remoteTs > localTs && GameState.isDirty()) {
          return _showConflictModal(remote);
        }
        // Remote newer but no local unsaved changes — accept remote silently
        if (remoteTs > localTs) {
          GameState.setProfile(remote);
        }
      } else {
        // First-time player — seed remote with local state
        return _ref.set(GameState.getProfile());
      }
      _lastSyncedAt = Date.now();
      _setStatus("saved");
    }).catch(function (err) {
      console.warn("[SyncManager] loadRemote failed:", err);
      _setStatus("offline");
    });
  }

  function saveToRemote(force) {
    if (!GameState.isDirty() && !force) return Promise.resolve();
    _setStatus("saving");

    return _ref.child("lastModified").once("value").then(function (snap) {
      const remoteTs = snap.val() || 0;
      if (remoteTs > _lastSyncedAt && !force) {
        return loadRemote(); // triggers conflict modal
      }
      return _ref.set(GameState.getProfile()).then(function () {
        GameState.clearDirty();
        _lastSyncedAt = Date.now();
        _setStatus("saved");
      });
    }).catch(function (err) {
      console.error("[SyncManager] saveToRemote failed:", err);
      _setStatus("offline");
    });
  }

  function forceSave() {
    return saveToRemote(true);
  }

  // ── Public ─────────────────────────────────────────────────────────

  function init(profileId) {
    _profileId = profileId;
    _ref = firebase.database().ref("tmcc-game/profiles/" + profileId);

    // Auto-sync every 120s
    _intervalId = setInterval(function () {
      if (GameState.isDirty()) saveToRemote(false);
    }, 120000);

    // Save on tab hide
    _onVisibilityChange = function () {
      if (document.hidden) saveToRemote(false);
    };
    document.addEventListener("visibilitychange", _onVisibilityChange);

    // Save on tab close (best-effort synchronous-ish path not available in Firebase SDK;
    // we attempt the async write and hope the browser keeps the tab alive long enough)
    _onBeforeUnload = function () { saveToRemote(false); };
    window.addEventListener("beforeunload", _onBeforeUnload);

    return loadRemote();
  }

  function getStatus() { return _status; }

  function destroy() {
    if (_intervalId) clearInterval(_intervalId);
    if (_onVisibilityChange) document.removeEventListener("visibilitychange", _onVisibilityChange);
    if (_onBeforeUnload)     window.removeEventListener("beforeunload", _onBeforeUnload);
    saveToRemote(false);
  }

  return { init, loadRemote, saveToRemote, forceSave, getStatus, destroy };
})();
