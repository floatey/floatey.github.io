// JDM RESTORATION GARAGE — Main / Router

window.App = (function () {

  const PROFILES = [
    { id: "nick",     name: "Nick"     },
    { id: "tarro",    name: "Tarro"    },
    { id: "nathan",   name: "Nathan"   },
    { id: "damian",   name: "Damian"   },
    { id: "harrison", name: "Harrison" },
  ];

  // ── Navigation ─────────────────────────────────────────────────────

  function navigate(hash) {
    window.location.hash = hash;
  }

  // ── Header ─────────────────────────────────────────────────────────

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

  // ── Profile Picker ─────────────────────────────────────────────────

  function _renderProfilePicker(root) {
    root.innerHTML = [
      "<div class='profile-picker'>",
      "<h1 class='picker-title'>JDM Restoration Garage</h1>",
      "<div class='profile-grid' id='profile-grid'></div>",
      "<section class='feed-section'>",
      "<h2 class='feed-title'>Recent Activity</h2>",
      "<div id='activity-feed'></div>",
      "</section>",
      "</div>"
    ].join("");

    const grid = document.getElementById("profile-grid");

    const cardEls = {};
    PROFILES.forEach(function (p) {
      const card = document.createElement("div");
      card.className = "profile-card";
      card.dataset.profileId = p.id;
      card.innerHTML = [
        "<h2 class='card-name'>" + p.name + "</h2>",
        "<p class='card-project'>...</p>",
        "<p class='card-last-active'>Last active: ...</p>",
        "<p class='card-yen'>¥ ...</p>"
      ].join("");
      card.addEventListener("click", function () { _selectProfile(p.id); });
      grid.appendChild(card);
      cardEls[p.id] = card;
    });

    PROFILES.forEach(function (p) {
      firebase.database().ref("tmcc-game/profiles/" + p.id)
        .once("value")
        .then(function (snap) {
          _populateCard(cardEls[p.id], snap.val());
        })
        .catch(function () {
          _populateCard(cardEls[p.id], null);
        });
    });

    const feedContainer = document.getElementById("activity-feed");
    SocialFeatures.renderFeed(feedContainer, 20);
  }

  function _populateCard(card, data) {
    if (!data) {
      card.querySelector(".card-project").textContent     = "No active project";
      card.querySelector(".card-last-active").textContent = "Last active: Unknown";
      card.querySelector(".card-yen").textContent         = "¥ Unknown";
      return;
    }

    const vehicles = data.garage && data.garage.vehicles ? data.garage.vehicles : {};
    const activeVehicles = Object.values(vehicles).filter(function (v) {
      return v.status === "in_progress";
    });
    if (activeVehicles.length) {
      const v    = activeVehicles[0];
      const parts = v.parts ? Object.values(v.parts) : [];
      const pct  = parts.length
        ? Math.round(parts.filter(function (p) { return p.installed; }).length / parts.length * 100)
        : 0;
      card.querySelector(".card-project").textContent =
        (v.nickname || v.modelId || "Active build") + " — " + pct + "%";
    } else {
      card.querySelector(".card-project").textContent = "No active project";
    }

    card.querySelector(".card-last-active").textContent =
      "Last active: " + (data.lastModified ? Utils.timeAgo(data.lastModified) : "Unknown");

    const yen = data.currency && data.currency.yen != null ? data.currency.yen : 0;
    card.querySelector(".card-yen").textContent = Utils.formatCurrency(yen);
  }

  function _selectProfile(profileId) {
    document.querySelectorAll(".profile-card").forEach(function (c) {
      c.style.pointerEvents = "none";
      c.style.opacity = "0.6";
    });
    const active = document.querySelector(".profile-card[data-profile-id='" + profileId + "']");
    if (active) {
      active.querySelector(".card-name").insertAdjacentHTML(
        "afterend", "<p class='card-loading'>Loading...</p>"
      );
    }

    GameState.init(profileId);
    SyncManager.init(profileId).then(function () {
      _refreshHeaderCurrency();
      navigate("#/garage");
    });
  }

  // ── Router ─────────────────────────────────────────────────────────

  function _route() {
    const root = document.getElementById("game-root");
    if (!root) return;
    const hash = window.location.hash || "#/";

    // Guard: require a profile for authenticated routes
    const needsProfile = hash !== "#/" && hash !== "";
    if (needsProfile && !GameState.getProfileId()) {
      navigate("#/");
      return;
    }

    if (hash === "#/" || hash === "") {
      _renderProfilePicker(root);

    } else if (hash === "#/garage") {
      root.innerHTML = "";
      GarageView.render(root);

    } else if (hash.startsWith("#/workbench/")) {
      const instanceId = hash.replace("#/workbench/", "");
      root.innerHTML =
        "<p style='padding:2rem;color:#eee'>Workbench — coming soon (instanceId: " + instanceId + ")</p>";

    } else if (hash.startsWith("#/visit/")) {
      const profileId = hash.replace("#/visit/", "");
      root.innerHTML =
        "<p style='padding:2rem;color:#eee'>Visiting " + profileId + "'s garage — coming soon</p>";

    } else {
      root.innerHTML = "<p style='padding:2rem;color:#eee'>404 — Unknown route</p>";
    }
  }

  function init() {
    window.addEventListener("hashchange", _route);
    _route();
  }

  return { init, navigate, updateHeader };
})();

// Boot
document.addEventListener("DOMContentLoaded", function () { App.init(); });
