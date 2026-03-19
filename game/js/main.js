// ════════════════════════════════════════════════════════════
//  main.js — App shell, router, initialization
// ════════════════════════════════════════════════════════════

import { GameState }          from './state.js';
import { SyncManager }        from './sync.js';
import { renderProfilePicker,
         renderGarage }       from './garage.js';
import { renderWorkbench }    from './workbench.js';
import { renderJunkyard }     from './gacha.js';
import { renderShop }         from './shop.js';
import { renderVisit }        from './social.js';
import { AudioManager }       from './audio.js';
import { formatYen }          from './utils.js';

// ── Singleton instances ─────────────────────────────────────
let state      = null;
let sync       = null;
let audio      = null;
let vehicleData = null;   // contents of data/vehicles.json

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
    const root = document.getElementById('game-root');
    root.parentNode.insertBefore(header, root);
  }
  return header;
}

function clearHeader() {
  const header = document.getElementById('game-header');
  if (header) header.remove();
}

function renderHeader() {
  const header = getOrCreateHeader();
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

  header.innerHTML = '';

  // ── Top bar ───────────────────────────────
  const topBar = document.createElement('div');
  topBar.className = 'header-top';

  const backBtn = document.createElement('button');
  backBtn.className = 'header-back';
  backBtn.textContent = backText;
  backBtn.addEventListener('click', () => navigate(backHash));

  const titleEl = document.createElement('span');
  titleEl.className = 'header-title';
  titleEl.textContent = title;

  const currencyEl = document.createElement('span');
  currencyEl.className = 'header-currency';
  currencyEl.innerHTML =
    `<span class="yen">${formatYen(profile.currency.yen)}</span>` +
    `<span class="wt">${profile.currency.wrenchTokens} WT</span>`;

  const syncEl = document.createElement('span');
  syncEl.className = 'header-sync';
  syncEl.textContent = `${syncIcon} ${syncLabel}`;

  topBar.append(backBtn, titleEl, currencyEl, syncEl);

  // ── Nav tabs ──────────────────────────────
  const nav = document.createElement('nav');
  nav.className = 'header-nav';

  const tabs = [
    { label: 'Garage',    hash: '#/garage',   id: 'garage'   },
    { label: 'Workbench', hash: '#/workbench', id: 'workbench', disabled: true },
    { label: 'Shop',      hash: '#/shop',     id: 'shop'     },
    { label: 'Junkyard',  hash: '#/junkyard', id: 'junkyard' },
  ];

  for (const tab of tabs) {
    const btn = document.createElement('button');
    btn.className = 'nav-tab';
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;
    if (tab.disabled) btn.disabled = true;
    btn.addEventListener('click', () => {
      if (!tab.disabled) navigate(tab.hash);
    });
    nav.appendChild(btn);
  }

  header.append(topBar, nav);
}

function setActiveTab(tabId) {
  const tabs = document.querySelectorAll('.nav-tab');
  for (const t of tabs) {
    t.classList.toggle('active', t.dataset.tab === tabId);
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

  // 2. Load static data
  try {
    const resp = await fetch('data/vehicles.json');
    if (resp.ok) {
      vehicleData = await resp.json();
    } else {
      console.warn('vehicles.json not found — running without vehicle data');
      vehicleData = [];
    }
  } catch (e) {
    console.warn('Could not load vehicles.json:', e);
    vehicleData = [];
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
