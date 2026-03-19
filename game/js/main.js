// JDM RESTORATION GARAGE — Main / Router

window.App = (function () {

  const PROFILES = [
    { id: "nick",     name: "Nick"     },
    { id: "tarro",    name: "Tarro"    },
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

  // ── Profile Picker ──────────────────────────────────────────────

  function _renderProfilePicker(root) {
    root.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "profile-picker";

    const title = document.createElement("h1");
    title.className = "picker-title";
    title.textContent = "JDM Restoration Garage";
    wrapper.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "profile-grid";
    wrapper.appendChild(grid);

    // Feed section
    const feedSection = document.createElement("section");
    feedSection.className = "feed-section";
    const feedTitle = document.createElement("h2");
    feedTitle.className = "feed-title";
    feedTitle.textContent = "Recent Activity";
    feedSection.appendChild(feedTitle);
    const feedContainer = document.createElement("div");
    feedContainer.id = "activity-feed";
    feedSection.appendChild(feedContainer);
    wrapper.appendChild(feedSection);

    root.appendChild(wrapper);

    // Build skeleton cards immediately so the picker is usable even if Firebase is slow
    const cardEls = {};
    let _locked = false;

    PROFILES.forEach(function (p) {
      const card = document.createElement("div");
      card.className = "profile-card";
      card.dataset.profileId = p.id;

      card.innerHTML =
        "<h2 class='card-name'>" + p.name + "</h2>" +
        "<p class='card-project'>…</p>" +
        "<p class='card-last-active'>Last active: …</p>" +
        "<p class='card-yen font-data'>¥ …</p>";

      card.addEventListener("click", function () {
        if (_locked) return;
        _selectProfile(p.id, cardEls);
        _locked = true;
      });

      grid.appendChild(card);
      cardEls[p.id] = card;
    });

    // Fetch remote data for all 5 cards in parallel; update as they arrive
    PROFILES.forEach(function (p) {
      firebase.database()
        .ref("tmcc-game/profiles/" + p.id)
        .once("value")
        .then(function (snap) { _populateCard(cardEls[p.id], snap.val()); })
        .catch(function ()    { _populateCard(cardEls[p.id], null); });
    });

    // Activity feed
    SocialFeatures.renderFeed(feedContainer, 20);
  }

  function _populateCard(card, data) {
    if (!data) {
      card.querySelector(".card-project").textContent     = "No active project";
      card.querySelector(".card-last-active").textContent = "Last active: Unknown";
      card.querySelector(".card-yen").textContent         = "¥ —";
      return;
    }

    // Current project
    const vehicles = data.garage && data.garage.vehicles ? data.garage.vehicles : {};
    const active   = Object.values(vehicles).filter(function (v) { return v.status === "in_progress"; });
    if (active.length) {
      const v     = active[0];
      const parts = v.parts ? Object.values(v.parts) : [];
      const pct   = parts.length
        ? Math.round(parts.filter(function (p) { return p.condition !== null && p.condition >= 0.70; }).length / parts.length * 100)
        : 0;
      card.querySelector(".card-project").textContent =
        (v.displayName || v.modelId || "Active build") + " — " + pct + "%";
    } else {
      card.querySelector(".card-project").textContent = "No active project";
    }

    // Last active
    card.querySelector(".card-last-active").textContent =
      "Last active: " + (data.lastModified ? Utils.timeAgo(data.lastModified) : "Unknown");

    // Balance
    const yen = data.currency && data.currency.yen != null ? data.currency.yen : 0;
    card.querySelector(".card-yen").textContent = Utils.formatCurrency(yen);
  }

  function _selectProfile(profileId, cardEls) {
    // Visually disable all cards
    Object.values(cardEls).forEach(function (c) {
      c.classList.add("card-disabled");
    });

    // Show loading indicator on the chosen card
    const chosen = cardEls[profileId];
    if (chosen) {
      const loading = document.createElement("p");
      loading.className = "card-loading";
      loading.textContent = "Loading…";
      chosen.appendChild(loading);
    }

    GameState.init(profileId);
    SyncManager.init(profileId).then(function () {
      _refreshHeaderCurrency();
      navigate("#/garage");
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────

  /** Returns all profiles except the currently logged-in one. */
  function getVisitProfiles() {
    const current = GameState.getProfileId();
    return PROFILES.filter(function (p) { return p.id !== current; });
  }

  /** Returns the display name for a profile ID. */
  function getProfileName(profileId) {
    const p = PROFILES.find(function (p) { return p.id === profileId; });
    return p ? p.name : profileId.charAt(0).toUpperCase() + profileId.slice(1);
  }

  // ── Router ──────────────────────────────────────────────────────

  function _route() {
    const root = document.getElementById("game-root");
    if (!root) return;
    const hash = window.location.hash || "#/";

    // Routes that need an active profile
    const needsProfile = hash !== "#/" && hash !== "#" && hash !== "";
    if (needsProfile && !GameState.getProfileId()) {
      navigate("#/");
      return;
    }

    if (hash === "#/" || hash === "#" || hash === "") {
      _renderProfilePicker(root);
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
        "<p style='padding:2rem;color:var(--text-secondary)'>Workbench — coming soon<br><small>" + instanceId + "</small></p>";
      return;
    }

    if (hash.startsWith("#/visit/")) {
      const profileId = hash.replace("#/visit/", "");
      root.innerHTML = "";
      GarageView.renderVisit(root, profileId);
      return;
    }

    root.innerHTML = "<p style='padding:2rem;color:var(--text-secondary)'>404 — Unknown route</p>";
  }

  function init() {
    window.addEventListener("hashchange", _route);
    _route();
  }

  return { init, navigate, updateHeader, getVisitProfiles, getProfileName };
})();

// Boot
document.addEventListener("DOMContentLoaded", function () { App.init(); });
