// ════════════════════════════════════════════════════════════
//  profile-picker.js — Landing screen: 5 fixed profiles + activity feed
// ════════════════════════════════════════════════════════════

import { getApp, navigate } from './main.js';

// ── Profile definitions ─────────────────────────────────────
const PROFILES = [
  { id: 'nick',     name: 'Nick',     color: '#b87fff' },
  { id: 'tarro',    name: 'Tarro',    color: '#ff5270' },
  { id: 'nathan',   name: 'Nathan',   color: '#4e9fff' },
  { id: 'damian',   name: 'Damian',   color: '#2ed09b' },
  { id: 'harrison', name: 'Harrison', color: '#fbbf24' },
];

const LS_PREFIX = 'jdm_game_';

// Event type → icon
const EVENT_ICONS = {
  repair:          '🔧',
  completed_car:   '🏁',
  completed_system:'🏁',
  pulled_vehicle:  '🎰',
  gifted_part:     '🎁',
};

// ── Helpers ─────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return 'never';
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function stars(rarity) {
  if (!rarity) return '';
  return '★'.repeat(rarity);
}

/**
 * Read a profile summary from localStorage (fast, always available).
 * Returns { exists, lastModified, carName, rarity, completion, yen }
 */
function getProfileSummary(profileId) {
  const raw = localStorage.getItem(LS_PREFIX + profileId);
  if (!raw) {
    return { exists: false, lastModified: 0, carName: null, rarity: 0, completion: 0, yen: 1000 };
  }

  try {
    const data = JSON.parse(raw);
    const vehicles = data.garage?.vehicles || {};
    const entries = Object.values(vehicles);

    // Find the most recently acquired vehicle as "current project"
    let currentCar = null;
    if (entries.length > 0) {
      currentCar = entries.reduce((a, b) => (b.acquiredAt || 0) > (a.acquiredAt || 0) ? b : a);
    }

    // Calculate overall completion for the current car
    let completion = 0;
    let carName = null;
    let rarity = 0;

    if (currentCar) {
      carName = getVehicleDisplayName(currentCar.modelId);
      rarity = getVehicleRarity(currentCar.modelId);

      const parts = currentCar.parts || {};
      const partEntries = Object.values(parts);
      const revealed = partEntries.filter(p => p.revealed);
      const done = revealed.filter(p => p.condition !== null && p.condition >= 0.70);
      completion = revealed.length > 0 ? Math.round((done.length / revealed.length) * 100) : 0;
    }

    return {
      exists: true,
      lastModified: data.lastModified || 0,
      carName,
      rarity,
      completion,
      yen: data.currency?.yen ?? 1000,
    };
  } catch {
    return { exists: false, lastModified: 0, carName: null, rarity: 0, completion: 0, yen: 1000 };
  }
}

/** Look up display name from vehicleData.vehicles array. */
function getVehicleDisplayName(modelId) {
  if (!modelId) return null;
  const { vehicleData } = getApp();
  // FIX: vehicleData is { vehicles: [...] }, not a plain array
  const arr = vehicleData?.vehicles;
  if (arr && Array.isArray(arr)) {
    const match = arr.find(v => v.modelId === modelId);
    if (match) return match.displayName || match.shortName || match.name || modelId.toUpperCase();
  }
  // Fallback friendly names
  const fallback = {
    ae86: 'AE86 Trueno', fd3s: 'FD RX-7', fc3s: 'FC RX-7', s13: '240SX',
    jza80: 'Supra', bnr34: 'GT-R', dc2: 'Integra Type R', aw11: 'MR2',
    crx: 'CRX Si', z31: '300ZX', eclipse_gsx: 'Eclipse GSX', ej257: 'WRX STI',
  };
  return fallback[modelId] || modelId.toUpperCase();
}

function getVehicleRarity(modelId) {
  const { vehicleData } = getApp();
  // FIX: vehicleData is { vehicles: [...] }, not a plain array
  const arr = vehicleData?.vehicles;
  if (arr && Array.isArray(arr)) {
    const match = arr.find(v => v.modelId === modelId);
    if (match) return match.rarity || 3;
  }
  return 3;
}

// ── Render ──────────────────────────────────────────────────

export function renderProfilePicker() {
  const root = document.getElementById('game-root');
  root.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'profile-picker anim-fade-in';
  container.style.cssText = 'max-width:720px;margin:0 auto;padding:var(--space-lg) var(--space-base);padding-top:48px;';

  // ── Title ──
  const titleBlock = document.createElement('div');
  titleBlock.style.cssText = 'text-align:center;margin-bottom:var(--space-lg);';
  titleBlock.innerHTML = `
    <h1 style="font-family:var(--font-data);font-size:var(--font-size-xl);font-weight:700;letter-spacing:0.04em;color:var(--text-primary);margin-bottom:var(--space-xs);">
      JDM RESTORATION GARAGE
    </h1>
    <div style="font-size:var(--font-size-sm);color:var(--text-muted);font-family:var(--font-data);letter-spacing:0.12em;text-transform:uppercase;">
      ─── Pick Your Profile ───
    </div>
  `;
  container.appendChild(titleBlock);

  // ── Profile Grid ──
  const grid = document.createElement('div');
  grid.className = 'profile-grid';
  grid.style.cssText = 'grid-template-columns:repeat(auto-fill, minmax(140px, 1fr));';

  for (const profile of PROFILES) {
    const card = buildProfileCard(profile);
    grid.appendChild(card);
  }

  container.appendChild(grid);

  // ── Activity Feed ──
  const feedSection = document.createElement('div');
  feedSection.style.cssText = 'margin-top:var(--space-xl);';

  const feedTitle = document.createElement('div');
  feedTitle.style.cssText = 'text-align:center;font-size:var(--font-size-sm);color:var(--text-muted);font-family:var(--font-data);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:var(--space-base);';
  feedTitle.textContent = '─── Crew Activity ───';
  feedSection.appendChild(feedTitle);

  const feedList = document.createElement('div');
  feedList.className = 'feed-list panel';
  feedList.innerHTML = `
    <div style="padding:var(--space-lg);text-align:center;color:var(--text-muted);font-size:var(--font-size-sm);">
      Loading activity…
    </div>
  `;
  feedSection.appendChild(feedList);
  container.appendChild(feedSection);

  root.appendChild(container);

  // Load feed asynchronously
  loadActivityFeed(feedList);
}

// ── Profile Card Builder ────────────────────────────────────

function buildProfileCard(profile) {
  const summary = getProfileSummary(profile.id);

  const card = document.createElement('div');
  card.className = 'profile-card';
  card.style.borderTopColor = profile.color;
  card.style.borderTopWidth = '3px';

  // Name
  const nameEl = document.createElement('div');
  nameEl.className = 'profile-name';
  nameEl.style.color = profile.color;
  nameEl.textContent = profile.name;
  card.appendChild(nameEl);

  // Meta info
  const meta = document.createElement('div');
  meta.className = 'profile-meta';
  meta.style.cssText = 'display:flex;flex-direction:column;gap:3px;margin-top:var(--space-sm);margin-bottom:var(--space-md);min-height:60px;';

  if (summary.exists && summary.carName) {
    // Rarity stars
    const starsEl = document.createElement('div');
    starsEl.style.color = summary.rarity >= 5 ? 'var(--rarity-5)' : summary.rarity >= 4 ? 'var(--rarity-4)' : 'var(--rarity-3)';
    starsEl.style.cssText += 'letter-spacing:2px;font-size:var(--font-size-sm);';
    starsEl.textContent = stars(summary.rarity);
    meta.appendChild(starsEl);

    // Car name
    const carEl = document.createElement('div');
    carEl.style.color = 'var(--text-secondary)';
    carEl.textContent = summary.carName;
    meta.appendChild(carEl);

    // Completion
    const compEl = document.createElement('div');
    compEl.textContent = `${summary.completion}%`;
    meta.appendChild(compEl);
  } else {
    // New profile
    const newTag = document.createElement('div');
    newTag.style.color = 'var(--text-secondary)';
    newTag.textContent = '(new)';
    meta.appendChild(newTag);

    const yenEl = document.createElement('div');
    yenEl.textContent = '¥1,000';
    meta.appendChild(yenEl);
  }

  // Last active
  const timeEl = document.createElement('div');
  timeEl.style.cssText = 'margin-top:auto;';
  timeEl.textContent = timeAgo(summary.lastModified);
  meta.appendChild(timeEl);

  card.appendChild(meta);

  // Buttons
  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display:flex;flex-direction:column;gap:var(--space-xs);';

  // Play button
  const playBtn = document.createElement('button');
  playBtn.className = 'btn btn--primary w-full';
  playBtn.textContent = 'Play';
  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handlePlay(profile.id, playBtn);
  });
  btnGroup.appendChild(playBtn);

  // Visit button (only if profile has saved data)
  if (summary.exists) {
    const visitBtn = document.createElement('button');
    visitBtn.className = 'btn btn--secondary w-full';
    visitBtn.textContent = 'Visit';
    visitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigate(`#/visit/${profile.id}`);
    });
    btnGroup.appendChild(visitBtn);
  }

  card.appendChild(btnGroup);

  return card;
}

// ── Play Handler ────────────────────────────────────────────

async function handlePlay(profileId, btn) {
  const { state, sync } = getApp();

  // Show loading state
  const originalText = btn.textContent;
  btn.textContent = 'Loading…';
  btn.disabled = true;

  try {
    // 1. Load profile from localStorage
    const profileData = state.load(profileId);

    // 2. Check if this is a first-time (no vehicles yet)
    //    FIX: Do NOT call state.addVehicle() here with the empty stub.
    //    garage.js's ensureStarterVehicle() loads the real ae86.json part tree.
    //    We only need to know if it IS first-time so we can show the welcome toast.
    const isFirstTime = Object.keys(profileData.garage?.vehicles || {}).length === 0;

    // 3. Init sync (best-effort; gameplay works offline)
    let syncResult = { status: 'ok' };
    try {
      syncResult = await sync.init(profileId);
    } catch (syncErr) {
      console.warn('[ProfilePicker] Sync init failed, continuing offline:', syncErr);
    }

    // 4. If sync returned conflict, conflict modal is shown by sync.js
    if (syncResult.status === 'conflict') {
      btn.textContent = originalText;
      btn.disabled = false;
      return;
    }

    // 5. Show welcome toast for brand-new profiles
    if (isFirstTime) {
      showWelcomeToast();
    }

    // 6. Navigate to garage — garage.js will auto-add the starter AE86 with real parts
    navigate('#/garage');

  } catch (err) {
    console.error('[ProfilePicker] Play failed:', err);
    btn.textContent = originalText;
    btn.disabled = false;

    // Even if everything fails, try to navigate to garage
    navigate('#/garage');
  }
}

// ── Welcome Toast ───────────────────────────────────────────

function showWelcomeToast() {
  const toast = document.createElement('div');
  toast.className = 'anim-fade-up';
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: var(--bg-elevated); border: 1px solid var(--border);
    border-radius: var(--radius-md); padding: var(--space-base) var(--space-lg);
    color: var(--text-primary); font-size: var(--font-size-sm);
    max-width: 400px; text-align: center; z-index: 500;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    line-height: 1.6;
  `;
  toast.innerHTML = `
    <div style="font-weight:600;margin-bottom:var(--space-xs);color:var(--rarity-3);">Your Starter Project</div>
    <div>A 1985 Toyota AE86 Sprinter Trueno.<br>She's rough, but she's yours.</div>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 4500);
}

// ── Activity Feed ───────────────────────────────────────────

async function loadActivityFeed(feedListEl) {
  const { sync } = getApp();

  // Guard: need Firebase to be available
  if (!window._firebase) {
    feedListEl.innerHTML = `
      <div style="padding:var(--space-lg);text-align:center;color:var(--text-muted);font-size:var(--font-size-sm);">
        Activity feed unavailable offline
      </div>
    `;
    return;
  }

  try {
    const entries = await sync.readFeed();

    if (!entries || entries.length === 0) {
      feedListEl.innerHTML = `
        <div style="padding:var(--space-lg);text-align:center;color:var(--text-muted);font-size:var(--font-size-sm);">
          No crew activity yet. Start wrenching!
        </div>
      `;
      return;
    }

    feedListEl.innerHTML = '';
    const display = entries.slice(0, 20);

    for (const entry of display) {
      feedListEl.appendChild(buildFeedEntry(entry));
    }
  } catch (err) {
    console.warn('[ProfilePicker] Feed load failed:', err);
    feedListEl.innerHTML = `
      <div style="padding:var(--space-lg);text-align:center;color:var(--text-muted);font-size:var(--font-size-sm);">
        Activity feed unavailable offline
      </div>
    `;
  }
}

function buildFeedEntry(entry) {
  const profileMap = {};
  for (const p of PROFILES) profileMap[p.id] = p;

  const profile = profileMap[entry.who];
  const icon = EVENT_ICONS[entry.what] || '🔧';

  const el = document.createElement('div');
  el.className = 'feed-entry';

  // Avatar / icon
  const avatar = document.createElement('div');
  avatar.className = 'feed-avatar';
  avatar.textContent = icon;
  if (profile) {
    avatar.style.borderColor = profile.color;
    avatar.style.color = profile.color;
  }

  // Body
  const body = document.createElement('div');
  body.className = 'feed-body';

  const text = document.createElement('div');
  text.className = 'feed-text';
  const who = profile ? profile.name : entry.who;
  text.innerHTML = `<strong style="color:${profile?.color || 'var(--text-primary)'}">${who}</strong> ${escapeHtml(entry.detail || entry.what)}`;

  const time = document.createElement('div');
  time.className = 'feed-time';
  time.textContent = timeAgo(entry.when);

  body.appendChild(text);
  body.appendChild(time);

  el.appendChild(avatar);
  el.appendChild(body);

  return el;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
