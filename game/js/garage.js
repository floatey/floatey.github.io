// JDM RESTORATION GARAGE — Cluster 06: Garage View

window.GarageView = (function () {

  // Visit profiles are owned by main.js (App.getVisitProfiles())

  // ── Starter Car Gift ─────────────────────────────────────────────

  /**
   * Collect all hidden part IDs from the part tree (any part referenced as
   * targetPartId inside a hiddenReveal entry).
   */
  function _collectHiddenPartIds(partTree) {
    var hiddenIds = new Set();
    var systems = partTree.systems || {};
    Object.values(systems).forEach(function (sys) {
      var reveals = sys.hiddenReveal || [];
      reveals.forEach(function (r) {
        if (r.targetPartId) hiddenIds.add(r.targetPartId);
      });
      // Also check part-level hiddenReveal
      var parts = sys.parts || {};
      Object.values(parts).forEach(function (part) {
        var pr = part.hiddenReveal || [];
        pr.forEach(function (r) {
          if (r.targetPartId) hiddenIds.add(r.targetPartId);
        });
      });
    });
    return hiddenIds;
  }

  /**
   * Build a vehicle instance object from a fetched part tree.
   */
  function _generateVehicleInstance(partTree) {
    var rarity     = partTree.rarity || 3;
    var instanceId = "ae86_" + Date.now();
    var partsMap   = {};
    var hidden      = _collectHiddenPartIds(partTree);

    var systems = partTree.systems || {};
    Object.entries(systems).forEach(function ([sysKey, sys]) {
      var sysType = sys.type || "detailed";

      if (sysType === "bundle") {
        // Single condition for the whole bundle system
        var bundleCondition = Utils.generateArrivalCondition(rarity);
        partsMap[sysKey] = {
          condition:      bundleCondition,
          revealed:       true,
          installed:      true,
          repairProgress: 0,
          isBundle:       true
        };
      } else {
        // Detailed system — individual part instances
        var parts = sys.parts || {};
        Object.keys(parts).forEach(function (partId) {
          if (hidden.has(partId)) {
            partsMap[partId] = {
              condition:      null,
              revealed:       false,
              installed:      true,
              repairProgress: 0
            };
          } else {
            partsMap[partId] = {
              condition:      Utils.generateArrivalCondition(rarity),
              revealed:       true,
              installed:      true,
              repairProgress: 0
            };
          }
        });
      }
    });

    return {
      instanceId: instanceId,
      modelId:    partTree.modelId || "ae86",
      displayName: partTree.displayName || "AE86 Trueno",
      rarity:     rarity,
      status:     "in_progress",
      parts:      partsMap
    };
  }

  /**
   * Ensure the player has the AE86 starter car (runs at most once per profile).
   * Resolves with the current vehicles map.
   */
  function _ensureStarterCar() {
    var vehicles = GameState.get("garage.vehicles") || {};
    if (Object.keys(vehicles).length > 0) {
      return Promise.resolve(vehicles);
    }
    // First ever load — gift the AE86
    return Utils.loadPartTree("ae86")
      .then(function (partTree) {
        var instance = _generateVehicleInstance(partTree);
        var updated  = {};
        updated[instance.instanceId] = instance;
        GameState.set("garage.vehicles", updated);
        return updated;
      })
      .catch(function (err) {
        console.warn("[GarageView] Could not load ae86.json for starter gift:", err);
        return {};
      });
  }

  // ── System Dots ──────────────────────────────────────────────────

  /**
   * Build a dot-indicator row for every system (detailed) or bundle in a vehicle.
   */
  function _renderSystemRows(vehicleInstance, partTree) {
    if (!partTree) return "<p class='text-secondary' style='font-size:0.8rem'>Part data unavailable</p>";

    var systems  = partTree.systems || {};
    var parts    = vehicleInstance.parts || {};
    var rows     = [];

    Object.entries(systems).forEach(function ([sysKey, sys]) {
      var sysName = sys.displayName || sysKey;
      var sysType = sys.type || "detailed";
      var filledDots = 0;

      if (sysType === "bundle") {
        // Bundle: single entry in partsMap keyed by sysKey
        var bundleInst = parts[sysKey];
        if (bundleInst && bundleInst.condition !== null) {
          filledDots = bundleInst.condition >= 0.70 ? 5 : Math.round(bundleInst.condition * 5);
        }
      } else {
        // Detailed: gather partIds belonging to this system
        var partIds = Object.keys(sys.parts || {});
        var comp    = Utils.calculateSystemCompletion(partIds, parts);
        filledDots  = comp.filledDots;
      }

      var dotsHtml = Utils.renderDots(filledDots, 5);

      rows.push(
        "<div class='system-row'>" +
          "<span class='system-name text-secondary'>" + _esc(sysName) + "</span>" +
          "<span class='system-dots font-data'>" + dotsHtml + "</span>" +
        "</div>"
      );
    });

    return rows.join("") || "<p class='text-secondary' style='font-size:0.8rem'>No systems found</p>";
  }

  // ── Status Badge ─────────────────────────────────────────────────

  function _statusBadge(pct, status) {
    if (status === "showcase") return "<span class='badge badge-showcase'>Showcase</span>";
    if (pct >= 100)            return "<span class='badge badge-complete'>Complete</span>";
    return                            "<span class='badge badge-progress'>In Progress</span>";
  }

  // ── Vehicle Card ─────────────────────────────────────────────────

  function _renderVehicleCard(vehicleInstance, partTree, readOnly) {
    var rarity      = vehicleInstance.rarity || 3;
    var stars       = "★".repeat(rarity);
    var completion  = Utils.calculateOverallCompletion(vehicleInstance);
    var statusHtml  = _statusBadge(completion, vehicleInstance.status);
    var systemsHtml = _renderSystemRows(vehicleInstance, partTree);

    var footerHtml = readOnly
      ? ""
      : "<div class='vehicle-card-footer'>" +
          "<button class='btn-primary btn-workbench' data-instance-id='" + _esc(vehicleInstance.instanceId) + "'>" +
            "Open Workbench →" +
          "</button>" +
        "</div>";

    var card = document.createElement("div");
    card.className = "card garage-vehicle-card";
    card.innerHTML =
      "<div class='vehicle-card-header'>" +
        "<div>" +
          "<span class='vehicle-name'>" + _esc(vehicleInstance.displayName || vehicleInstance.modelId) + "</span>" +
          "<span class='vehicle-rarity rarity-" + rarity + "' aria-label='" + rarity + " star'> " + stars + "</span>" +
        "</div>" +
        statusHtml +
      "</div>" +

      "<div class='vehicle-completion'>" +
        "<div class='completion-label text-secondary'>Restoration</div>" +
        "<div class='progress-bar' role='progressbar' aria-valuenow='" + completion + "' aria-valuemin='0' aria-valuemax='100'>" +
          "<div class='progress-fill' style='width:" + completion + "%'></div>" +
        "</div>" +
        "<div class='completion-pct font-data'>" + completion + "%</div>" +
      "</div>" +

      "<div class='vehicle-systems'>" + systemsHtml + "</div>" +

      footerHtml;

    if (!readOnly) {
      card.querySelector(".btn-workbench").addEventListener("click", function () {
        App.navigate("#/workbench/" + vehicleInstance.instanceId);
      });
    }

    return card;
  }

  // ── Part tree cache for rendering ───────────────────────────────

  var _renderTreeCache = {};

  function _getPartTree(modelId) {
    return Utils.loadPartTree(modelId).catch(function () { return null; });
  }

  // ── Main Render ──────────────────────────────────────────────────

  function render(container) {
    // Show loading state immediately
    container.innerHTML =
      "<div class='garage-loading' style='padding:2rem;color:var(--text-secondary)'>Loading garage…</div>";

    _ensureStarterCar().then(function (vehicles) {
      _buildGarageUI(container, vehicles);
    });
  }

  function _buildGarageUI(container, vehicles) {
    // Clear
    container.innerHTML = "";

    // ── Player Summary ───────────────────────────────────────────
    var profileId  = GameState.getProfileId();
    var yen        = GameState.get("currency.yen") || 0;
    var wt         = GameState.get("currency.wrenchTokens") || 0;
    // Capitalise the profile ID as display name (e.g. "tarro" → "Tarro")
    var playerName = profileId
      ? profileId.charAt(0).toUpperCase() + profileId.slice(1)
      : "Garage";

    var summary = document.createElement("div");
    summary.className = "garage-summary card";
    summary.innerHTML =
      "<div class='summary-name'>" + _esc(playerName) + "'s Garage</div>" +
      "<div class='summary-currency font-data'>" +
        "<span class='yen-balance'>" + Utils.formatCurrency(yen) + "</span>" +
        "<span class='text-muted'> · </span>" +
        "<span class='wt-balance'>" + Utils.formatWT(wt) + "</span>" +
      "</div>";
    container.appendChild(summary);

    // ── Vehicle Cards ────────────────────────────────────────────
    var vehicleList = Object.values(vehicles);

    if (vehicleList.length === 0) {
      var empty = document.createElement("p");
      empty.className = "text-secondary";
      empty.style.padding = "1.5rem 0";
      empty.textContent = "No vehicles in garage yet.";
      container.appendChild(empty);
    } else {
      var grid = document.createElement("div");
      grid.className = "garage-grid";
      container.appendChild(grid);

      // Render each vehicle card; load part trees in parallel
      vehicleList.forEach(function (v) {
        var placeholder = document.createElement("div");
        placeholder.className = "card garage-vehicle-card garage-card-loading";
        placeholder.innerHTML = "<p class='text-secondary'>Loading " + _esc(v.displayName || v.modelId) + "…</p>";
        grid.appendChild(placeholder);

        _getPartTree(v.modelId).then(function (partTree) {
          var card = _renderVehicleCard(v, partTree);
          grid.replaceChild(card, placeholder);
        });
      });
    }

    // ── Visit Other Garages ──────────────────────────────────────
    var othersSection = document.createElement("section");
    othersSection.className = "garage-visits";

    var visitsTitle = document.createElement("h2");
    visitsTitle.className = "visits-title";
    visitsTitle.textContent = "Visit Other Garages";
    othersSection.appendChild(visitsTitle);

    var visitLinks = document.createElement("div");
    visitLinks.className = "visit-links";

    var visitProfiles = App.getVisitProfiles();
    visitProfiles.forEach(function (p) {
        var link = document.createElement("a");
        link.className = "visit-link btn-secondary";
        link.href = "#/visit/" + p.id;
        link.textContent = p.name + "'s Garage →";
        link.addEventListener("click", function (e) {
          e.preventDefault();
          App.navigate("#/visit/" + p.id);
        });
        visitLinks.appendChild(link);
      });

    othersSection.appendChild(visitLinks);
    container.appendChild(othersSection);
  }

  // ── Visit Render ─────────────────────────────────────────────────

  /**
   * Read-only view of another player's garage, loaded directly from Firebase.
   */
  function renderVisit(container, visitProfileId) {
    var profile = PROFILES.find(function (p) { return p.id === visitProfileId; });
    var name    = profile ? profile.name : visitProfileId;

    container.innerHTML =
      "<div class='garage-loading'>Loading " + _esc(name) + "'s garage…</div>";

    firebase.database()
      .ref("tmcc-game/profiles/" + visitProfileId)
      .once("value")
      .then(function (snap) {
        var data = snap.val();
        _buildVisitUI(container, visitProfileId, name, data);
      })
      .catch(function () {
        container.innerHTML =
          "<div class='garage-loading'>Could not load " + _esc(name) + "'s garage — offline?</div>";
      });
  }

  function _buildVisitUI(container, visitProfileId, name, data) {
    container.innerHTML = "";

    // ── Back button ──────────────────────────────────────────────
    var back = document.createElement("button");
    back.className = "btn-secondary garage-back-btn";
    back.textContent = "← Back to My Garage";
    back.addEventListener("click", function () { App.navigate("#/garage"); });
    container.appendChild(back);

    // ── Summary header ───────────────────────────────────────────
    var yen = data && data.currency && data.currency.yen != null ? data.currency.yen : null;

    var summary = document.createElement("div");
    summary.className = "garage-summary card";
    summary.innerHTML =
      "<div class='summary-name'>" + _esc(name) + "'s Garage</div>" +
      "<div class='summary-currency font-data'>" +
        (yen !== null ? "<span class='yen-balance'>" + Utils.formatCurrency(yen) + "</span>" : "") +
        "<span class='visit-badge badge'>Visiting</span>" +
      "</div>";
    container.appendChild(summary);

    // ── Vehicles ─────────────────────────────────────────────────
    var vehicles = data && data.garage && data.garage.vehicles
      ? Object.values(data.garage.vehicles)
      : [];

    if (vehicles.length === 0) {
      var empty = document.createElement("p");
      empty.className = "text-secondary";
      empty.style.padding = "1.5rem 0";
      empty.textContent = name + " hasn't started a build yet.";
      container.appendChild(empty);
      return;
    }

    var grid = document.createElement("div");
    grid.className = "garage-grid";
    container.appendChild(grid);

    vehicles.forEach(function (v) {
      var placeholder = document.createElement("div");
      placeholder.className = "card garage-vehicle-card garage-card-loading";
      placeholder.innerHTML = "<p class='text-secondary'>Loading " + _esc(v.displayName || v.modelId) + "…</p>";
      grid.appendChild(placeholder);

      _getPartTree(v.modelId).then(function (partTree) {
        var card = _renderVehicleCard(v, partTree, true /* readOnly */);
        grid.replaceChild(card, placeholder);
      });
    });
  }

  // ── Escape helper ────────────────────────────────────────────────

  function _esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return { render, renderVisit };
})();
