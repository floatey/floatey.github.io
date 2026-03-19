/* ═══════════════════════════════════════════════════════════════════
   JDM RESTORATION GARAGE — main.js  (Cluster 01)
   Hash-based SPA router + App namespace
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Stub view renderers ──────────────────────────────────────────
  // Each receives (container: HTMLElement, params: Object).
  // Later clusters will replace these with real implementations.

  function renderProfilePicker(container) {
    container.innerHTML = '<h2>Profile Picker</h2>';
  }

  function renderGarage(container) {
    container.innerHTML = '<h2>Garage View</h2>';
  }

  function renderWorkbench(container, params) {
    container.innerHTML = '<h2>Workbench</h2><p class="text-secondary font-data">car id: ' + (params.id || '—') + '</p>';
  }

  function renderJunkyard(container) {
    container.innerHTML = '<h2>Junkyard (coming soon)</h2>';
  }

  function renderShop(container) {
    container.innerHTML = '<h2>Shop</h2>';
  }

  function renderVisit(container, params) {
    container.innerHTML = '<h2>Visiting: ' + (params.who || '—') + '</h2>';
  }

  function render404(container, hash) {
    container.innerHTML = '<h2>404</h2><p class="text-secondary">No route matched: <code>' + hash + '</code></p>';
  }

  // ─── Route table ──────────────────────────────────────────────────
  // Each entry: { pattern: RegExp, keys: string[], render: fn }

  var ROUTES = [
    {
      pattern: /^\/$/,
      keys: [],
      render: renderProfilePicker
    },
    {
      pattern: /^\/garage$/,
      keys: [],
      render: renderGarage
    },
    {
      pattern: /^\/workbench\/([^/]+)$/,
      keys: ['id'],
      render: renderWorkbench
    },
    {
      pattern: /^\/junkyard$/,
      keys: [],
      render: renderJunkyard
    },
    {
      pattern: /^\/shop$/,
      keys: [],
      render: renderShop
    },
    {
      pattern: /^\/visit\/([^/]+)$/,
      keys: ['who'],
      render: renderVisit
    }
  ];

  // ─── Router ───────────────────────────────────────────────────────

  /**
   * Parse window.location.hash into a path string.
   * "#/garage" → "/garage"
   * ""         → "/"
   */
  function parsePath() {
    var hash = window.location.hash || '';
    // Strip leading '#'
    var path = hash.replace(/^#/, '') || '/';
    return path;
  }

  /**
   * Match a path against the route table.
   * Returns { route, params } or null.
   */
  function matchRoute(path) {
    for (var i = 0; i < ROUTES.length; i++) {
      var route = ROUTES[i];
      var match = path.match(route.pattern);
      if (match) {
        var params = {};
        route.keys.forEach(function (key, idx) {
          params[key] = decodeURIComponent(match[idx + 1] || '');
        });
        return { route: route, params: params };
      }
    }
    return null;
  }

  var _currentPath = '/';

  /** Clear game-root and render the view for the current hash. */
  function dispatch() {
    var container = document.getElementById('game-root');
    if (!container) return;

    var path = parsePath();
    _currentPath = path;

    // Clear previous content
    container.innerHTML = '';

    var result = matchRoute(path);
    if (result) {
      result.route.render(container, result.params);
    } else {
      render404(container, window.location.hash);
    }
  }

  // ─── Mute toggle (basic wiring) ───────────────────────────────────
  function initMuteToggle() {
    var btn = document.getElementById('btn-mute');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var muted = btn.getAttribute('data-muted') === 'true';
      muted = !muted;
      btn.setAttribute('data-muted', muted);
      btn.textContent = muted ? '🔇' : '🔊';
    });
  }

  // ─── App namespace ────────────────────────────────────────────────
  window.App = {
    /**
     * Navigate to a hash route programmatically.
     * @param {string} hash  e.g. "#/garage"
     */
    navigate: function (hash) {
      window.location.hash = hash;
    },

    /**
     * Return the currently rendered path.
     * @returns {string}
     */
    getCurrentRoute: function () {
      return _currentPath;
    },

    /**
     * Update header currency display and/or sync indicator.
     * @param {{ yen?: number, wt?: number, sync?: 'saved'|'saving'|'offline'|'conflict', syncLabel?: string }} data
     */
    updateHeader: function (data) {
      if (data == null) return;

      if (data.yen !== undefined) {
        var yenEl = document.getElementById('hdr-yen');
        if (yenEl) yenEl.textContent = '¥' + Number(data.yen).toLocaleString();
      }

      if (data.wt !== undefined) {
        var wtEl = document.getElementById('hdr-wt');
        if (wtEl) wtEl.textContent = Number(data.wt).toLocaleString() + ' WT';
      }

      if (data.sync) {
        var dot   = document.getElementById('sync-dot');
        var label = document.getElementById('sync-label');
        var states = ['sync-saved', 'sync-saving', 'sync-offline', 'sync-conflict'];
        if (dot) {
          states.forEach(function (s) { dot.classList.remove(s); });
          dot.classList.add('sync-' + data.sync);
        }
        if (label) {
          label.textContent = data.syncLabel || capitalize(data.sync);
        }
      }
    }
  };

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ─── Bootstrap ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initMuteToggle();
    window.addEventListener('hashchange', dispatch);
    dispatch(); // render initial route
  });

}());
