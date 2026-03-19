// JDM RESTORATION GARAGE — Main / Router

window.App = (function () {

  const PLAYER_PROFILE_ID = "tarro";

  const VISIT_PROFILES = [
    { id: "nick",     name: "Nick"     },
    { id: "nathan",   name: "Nathan"   },
    { id: "damian",   name: "Damian"   },
    { id: "harrison", name: "Harrison" },
  ];

  // ── Navigation ──────────────────────────────────────────────────

  function navigate(hash) {
    window.location.hash = hash;
  }

  // ── Header ──────────────────────────────────────────────────────

  function updateHeader(opts) {
    opts = opts || {};
    if (opts.syncStatus !== undefined) {
      const el = document.getElementById("sync-indicator");
      if (el) {
        const labels = { saved: "🟢 Saved", saving: "🟡 Saving...", offline: "🔴 Offline", conflict: "⚠️ Conflict" };
        el.className = "sync-" + opts.syncStatus;
        el.textContent = labels[opts.syncStatus] || opts.syncStatus;
      }
    }
    if (opts.yen !== undefined) {
      const el = document.getElementById("header-yen");
      if (el) el.textContent = Utils.formatCurrency(opts.yen);
    }
    if (opts.wt !== undefined) {
      const el = document.getElementById("header-wt");
      if (el) el.textContent = Utils.formatWT(opts.wt);
    }
  }

  function _refreshHeaderCurrency() {
    updateHeader({
      yen: GameState.get("currency.yen"),
      wt:  GameState.get("currency.wrenchTokens")
    });
  }

  // ── Boot ────────────────────────────────────────────────────────

  function _boot(root) {
    root.innerHTML = "<div class='boot-loading'>Loading garage\u2026</div>";

    GameState.init(PLAYER_PROFILE_ID);
    SyncManager.init(PLAYER_PROFILE_ID).then(function () {
      _refreshHeaderCurrency();
      // If sitting on bare root, send straight to garage
      if (!window.location.hash || window.location.hash === "#/" || window.location.hash === "#") {
        navigate("#/garage");
      } else {
        _route();
      }
    });
  }

  // ── Router ──────────────────────────────────────────────────────

  function _route() {
    const root = document.getElementById("game-root");
    if (!root) return;
    const hash = window.location.hash || "#/";

    if (hash === "#/" || hash === "#" || hash === "") {
      navigate("#/garage");
      return;
    }

    if (hash === "#/garage") {
      root.innerHTML = "";
      GarageView.render(root);
      return;
    }

    if (hash.startsWith("#/workbench/")) {
      const instanceId = hash.replace("#/workbench/", "");
      root.innerHTML =
        "<p style='padding:2rem;color:#eee'>Workbench \u2014 coming soon (instanceId: " + instanceId + ")</p>";
      return;
    }

    if (hash.startsWith("#/visit/")) {
      const profileId = hash.replace("#/visit/", "");
      const profile   = VISIT_PROFILES.find(function (p) { return p.id === profileId; });
      const name      = profile ? profile.name : profileId;
      root.innerHTML =
        "<p style='padding:2rem;color:#eee'>" + name + "\u2019s garage \u2014 coming soon</p>";
      return;
    }

    root.innerHTML = "<p style='padding:2rem;color:#eee'>404 \u2014 Unknown route</p>";
  }

  function init() {
    const root = document.getElementById("game-root");
    window.addEventListener("hashchange", _route);
    _boot(root);
  }

  // Expose visit profiles so GarageView can read them without duplicating the list
  function getVisitProfiles() {
    return VISIT_PROFILES;
  }

  return { init, navigate, updateHeader, getVisitProfiles };
})();

// Boot
document.addEventListener("DOMContentLoaded", function () { App.init(); });
