// ════════════════════════════════════════════════════════════
//  main.js — App shell, router, initialization
// ════════════════════════════════════════════════════════════

import { GameState }          from './state.js';
import { SyncManager }        from './sync.js';
import { renderProfilePicker }from './profile-picker.js';
import { renderGarage }       from './garage.js';
import { renderWorkbench }    from './workbench.js';
import { renderJunkyard }     from './gacha.js';
import { renderShop }         from './shop.js';
import { renderVisit }        from './social.js';
import { AudioManager, renderAudioControls } from './audio.js';
import { formatYen }          from './utils.js';

// ── Singleton instances ─────────────────────────────────────
let state      = null;
let sync       = null;
let audio      = null;
let vehicleData = null;   // contents of data/vehicles.json  ({ vehicles: [...] })

/** Expose app-wide singletons for any module that needs them */
export function getApp() {
  return { state, sync, audio, vehicleData };
}

/** Navigate by changing the hash — triggers route() via hashchange */
export function navigate(hash) {
  window.location.hash = hash;
}

// ── Routing ─────────────────────────────────────────────────

function route() {
  const hash = window.location.hash || '#/';
  const root = document.getElementById('game-root');

  // Profile picker — no header
  if (hash === '#/' || hash === '') {
    clearHeader();
    renderProfilePicker();
    return;
  }

  // All other views need a logged-in profile
  if (!state || !state.getCurrentProfileId()) {
    navigate('#/');
    return;
  }

  renderHeader();

  if (hash === '#/garage') {
    setActiveTab('garage');
    renderGarage();
  } else if (hash.startsWith('#/workbench/')) {
    const instanceId = hash.split('/')[2];
    // Guard: if no instanceId, fall back to garage
    if (!instanceId) {
      navigate('#/garage');
      return;
    }
    setActiveTab('workbench');
    renderWorkbench(instanceId);
  } else if (hash === '#/shop') {
    setActiveTab('shop');
    renderShop();
  } else if (hash === '#/junkyard') {
    setActiveTab('junkyard');
    renderJunkyard();
  } else if (hash.startsWith('#/visit/')) {
    const memberId = hash.split('/')[2];
    setActiveTab(null);
    renderVisit(memberId);
  } else {
    // Unknown route → garage
    navigate('#/garage');
  }
}

// ── Header ──────────────────────────────────────────────────

function getOrCreateHeader() {
  let header = document.getElementById('game-header');
  if (!header) {
    header = document.createElement('header');
    header.id = 'game-header';
    header.className = 'game-header';
    const root = document.getElementById('game-root');
    root.parentNode.insertBefore(header, root);
  }
  // Ensure the nav element exists as a sibling right after the header
  let nav = document.getElementById('game-nav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.id = 'game-nav';
    nav.className = 'game-nav';
    header.parentNode.insertBefore(nav, header.nextSibling);
  }
  return { header, nav };
}

function clearHeader() {
  const header = document.getElementById('game-header');
  if (header) header.remove();
  const nav = document.getElementById('game-nav');
  if (nav) nav.remove();
}

function renderHeader() {
  const { header, nav } = getOrCreateHeader();
  const profile = state.getProfile();
  const hash = window.location.hash || '';

  // Determine back destination & title
  let backText = '← Garage';
  let backHash = '#/garage';
  let title = 'Garage';

  if (hash === '#/garage') {
    backText = '← Profiles';
    backHash = '#/';
    title = 'Garage';
  } else if (hash.startsWith('#/workbench/')) {
    title = 'Workbench';
  } else if (hash === '#/shop') {
    title = 'Shop';
  } else if (hash === '#/junkyard') {
    title = 'Junkyard';
  } else if (hash.startsWith('#/visit/')) {
    title = 'Visiting';
  }

  // Sync indicator
  const syncIcon = sync ? sync.getStatusIcon() : '🔴';
  const syncLabel = sync ? sync.getStatusLabel() : 'Offline';

  // ── Top bar ───────────────────────────────────────────────
  header.innerHTML = '';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn--ghost';
  backBtn.textContent = backText;
  backBtn.addEventListener('click', () => {
    audio?.playClick();
    navigate(backHash);
  });

  const titleEl = document.createElement('span');
  titleEl.className = 'game-header__title';
  titleEl.textContent = title;

  const actionsEl = document.createElement('div');
  actionsEl.className = 'game-header__actions';

  const currencyEl = document.createElement('span');
  currencyEl.className = 'font-data';
  currencyEl.style.cssText = 'font-size: var(--font-size-sm); display: flex; align-items: center; gap: var(--space-sm);';
  currencyEl.innerHTML =
    `<span style="color: var(--rarity-5);">${formatYen(profile.currency.yen)}</span>` +
    `<span style="color: var(--text-secondary);">${profile.currency.wrenchTokens} WT</span>`;

  const syncEl = document.createElement('span');
  syncEl.className = 'font-data';
  syncEl.style.cssText = 'font-size: var(--font-size-xs); color: var(--text-muted);';
  syncEl.textContent = `${syncIcon} ${syncLabel}`;

  actionsEl.append(currencyEl, syncEl);

  // Mount the mute/volume controls into the header actions area
  if (audio) renderAudioControls(actionsEl, audio);

  header.append(backBtn, titleEl, actionsEl);

  // ── Nav tabs ──────────────────────────────
  nav.innerHTML = '';

  const tabs = [
    { label: 'Garage',    hash: '#/garage',   id: 'garage'   },
    { label: 'Workbench', hash: '#/workbench', id: 'workbench', disabled: true },
    { label: 'Shop',      hash: '#/shop',     id: 'shop'     },
    { label: 'Junkyard',  hash: '#/junkyard', id: 'junkyard' },
  ];

  for (const tab of tabs) {
    const btn = document.createElement('button');
    btn.className = 'game-nav-tab';
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;
    if (tab.disabled) btn.disabled = true;
    btn.addEventListener('click', () => {
      if (!tab.disabled) {
        audio?.playClick();
        navigate(tab.hash);
      }
    });
    nav.appendChild(btn);
  }
}

function setActiveTab(tabId) {
  const tabs = document.querySelectorAll('.game-nav-tab');
  for (const t of tabs) {
    t.classList.toggle('game-nav-tab--active', t.dataset.tab === tabId);
  }
}

/** Called by garage.js (or profile picker) after the user selects a profile */
export function onProfileSelected(profileId) {
  state.load(profileId);
  if (sync) sync.start(profileId);
  navigate('#/garage');
}

/** Re-render the header (e.g. after currency changes) */
export function refreshHeader() {
  if (state && state.getCurrentProfileId()) renderHeader();
}

// ── Initialization ──────────────────────────────────────────

async function init() {
  // 1. Instantiate singletons
  state = new GameState();
  sync  = new SyncManager();
  audio = new AudioManager();

  // FIX: Expose audio manager globally so mechanics (wrench.js etc.) can reach it
  window.audioManager = audio;

  // FIX: Init audio on the first user gesture (Web Audio API requires this)
  const initAudioOnce = () => {
    audio.init();
    document.removeEventListener('click',     initAudioOnce);
    document.removeEventListener('touchstart', initAudioOnce);
    document.removeEventListener('keydown',   initAudioOnce);
  };
  document.addEventListener('click',      initAudioOnce, { once: true });
  document.addEventListener('touchstart', initAudioOnce, { once: true, passive: true });
  document.addEventListener('keydown',    initAudioOnce, { once: true });

  // 2. Load static vehicle data
  try {
    const resp = await fetch('data/vehicles.json');
    if (resp.ok) {
      vehicleData = await resp.json();
      // vehicleData is { vehicles: [...] } — garage.js uses .vehicles correctly;
      // shop.js and profile-picker.js have been updated to also use .vehicles
    } else {
      console.warn('vehicles.json not found — running without vehicle data');
      vehicleData = { vehicles: [] };
    }
  } catch (e) {
    console.warn('Could not load vehicles.json:', e);
    vehicleData = { vehicles: [] };
  }

  // 3. Route to current hash
  route();

  // 4. Listen for hash changes
  window.addEventListener('hashchange', route);
}

// Wait for Firebase before initialising
function boot() {
  if (window._firebase) {
    init();
  } else {
    window.addEventListener('firebaseReady', () => init(), { once: true });
  }
}

boot();
