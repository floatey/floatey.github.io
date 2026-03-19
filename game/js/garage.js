// ════════════════════════════════════════════════════════════
//  garage.js — Garage view & Visit view
// ════════════════════════════════════════════════════════════

import { navigate, getApp, refreshHeader } from './main.js';

// ── Part tree cache ─────────────────────────────────────────
const partTreeCache = {};

async function loadPartTree(modelId) {
  if (partTreeCache[modelId]) return partTreeCache[modelId];
  try {
    const resp = await fetch(`data/parts/${modelId}.json`);
    if (!resp.ok) throw new Error(`Failed to load parts/${modelId}.json`);
    const tree = await resp.json();
    partTreeCache[modelId] = tree;
    return tree;
  } catch (e) {
    console.warn(`Could not load part tree for ${modelId}:`, e);
    return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────

function formatYen(amount) {
  return `¥${Number(amount).toLocaleString()}`;
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Build a map of systemId → [partId, ...] from a part tree template.
 */
function buildSystemPartsMap(partTree) {
  const map = {};
  if (!partTree || !partTree.systems) return map;
  for (const system of partTree.systems) {
    if (system.type === 'detailed' && system.subsystems) {
      const ids = [];
      for (const sub of system.subsystems) {
        if (sub.parts) {
          for (const p of sub.parts) ids.push(p.id);
        }
      }
      map[system.id] = ids;
    } else if (system.type === 'bundle') {
      map[system.id] = [system.id];
    }
  }
  return map;
}

/**
 * Calculate system completion for display.
 */
function calcSystemCompletion(vehicle, systemPartIds) {
  let total = 0;
  let done = 0;
  for (const partId of systemPartIds) {
    const p = vehicle.parts[partId];
    if (!p || !p.revealed) continue;
    total++;
    if (p.condition !== null && p.condition >= 0.70) done++;
  }
  return total === 0 ? 0 : done / total;
}

/**
 * 0-19%=0, 20-39%=1, 40-59%=2, 60-79%=3, 80-99%=4, 100%=5
 */
function completionToDots(ratio) {
  const pct = Math.round(ratio * 100);
  if (pct >= 100) return 5;
  if (pct >= 80)  return 4;
  if (pct >= 60)  return 3;
  if (pct >= 40)  return 2;
  if (pct >= 20)  return 1;
  return 0;
}

function renderSystemDots(filledCount) {
  let html = '<span class="system-dots">';
  for (let i = 0; i < 5; i++) {
    html += i < filledCount
      ? '<span class="system-dot--filled">●</span>'
      : '<span class="system-dot--empty">○</span>';
  }
  html += '</span>';
  return html;
}

const SYSTEM_SHORT_NAMES = {
  engine: 'Engine', fuel: 'Fuel', cooling: 'Cooling', exhaust: 'Exhaust',
  drivetrain: 'Drive.', brakes: 'Brakes', suspension: 'Susp.',
  interior: 'Inter.', electrical: 'Elec.', body: 'Body',
  glass: 'Glass', trim: 'Trim', forced_induction: 'Turbo',
};

function shortSystemName(id) {
  return SYSTEM_SHORT_NAMES[id] || id;
}

function rarityStars(rarity) {
  return '★'.repeat(rarity);
}

function getVehicleMeta(modelId) {
  const { vehicleData } = getApp();
  if (vehicleData && vehicleData.vehicles) {
    return vehicleData.vehicles.find(v => v.modelId === modelId) || null;
  }
  return null;
}

function getVehicleRarity(modelId) {
  const meta = getVehicleMeta(modelId);
  return meta ? meta.rarity : 3;
}

function getVehicleDisplayName(modelId) {
  const meta = getVehicleMeta(modelId);
  return meta ? meta.displayName : modelId;
}

/** GDD Section 6 sell prices */
const SELL_TABLE = {
  3: { basePrice: 5000,  wtBonus: 15, maxMult: 1.5 },
  4: { basePrice: 15000, wtBonus: 30, maxMult: 1.5 },
  5: { basePrice: 50000, wtBonus: 60, maxMult: 2.0 },
};

function getSellInfo(rarity) {
  return SELL_TABLE[rarity] || SELL_TABLE[3];
}

/**
 * Quality multiplier: linear from 1.0× (avg condition 0.70) to maxMult (avg 0.95+).
 */
function calcQualityMultiplier(vehicle, rarity) {
  const parts = Object.values(vehicle.parts);
  const revealed = parts.filter(p => p.revealed && p.condition !== null);
  if (revealed.length === 0) return 1.0;

  const avg = revealed.reduce((s, p) => s + p.condition, 0) / revealed.length;
  const { maxMult } = getSellInfo(rarity);

  if (avg <= 0.70) return 1.0;
  if (avg >= 0.95) return maxMult;
  return 1.0 + ((avg - 0.70) / 0.25) * (maxMult - 1.0);
}

function calcGarageValue(profile) {
  let value = 0;
  for (const v of Object.values(profile.garage.vehicles)) {
    const rarity = getVehicleRarity(v.modelId);
    const { basePrice } = getSellInfo(rarity);
    value += Math.round(basePrice * calcQualityMultiplier(v, rarity));
  }
  return value;
}

function conditionColor(pct) {
  if (pct >= 90) return 'var(--condition-excellent)';
  if (pct >= 70) return 'var(--condition-good)';
  if (pct >= 50) return 'var(--condition-fair)';
  if (pct >= 30) return 'var(--condition-poor)';
  return 'var(--condition-critical)';
}

function formatStatus(status) {
  const labels = { in_progress: 'IN PROGRESS', complete: 'COMPLETE', showcase: 'SHOWCASE' };
  return labels[status] || status.toUpperCase();
}

// ── Starter Vehicle Seeding ─────────────────────────────────

/**
 * If the player's garage is completely empty, seed the starter AE86.
 * Per GDD: "The AE86 is pre-loaded into every player's garage."
 */
async function ensureStarterVehicle(state) {
  const profile = state.getProfile();
  if (Object.keys(profile.garage.vehicles).length > 0) return;

  const ae86Tree = await loadPartTree('ae86');
  if (!ae86Tree) {
    console.warn('Could not load AE86 part tree for starter vehicle');
    return;
  }

  state.addVehicle(ae86Tree, 3, 'ae86');
  refreshHeader();
}

// ══════════════════════════════════════════════════════════════
//  renderGarage — main player garage view
// ══════════════════════════════════════════════════════════════

export async function renderGarage() {
  const root = document.getElementById('game-root');
  const { state } = getApp();
  const profile = state.getProfile();

  // Show loading state
  root.innerHTML = `
    <div class="game-content">
      <div class="game-container" id="garage-container">
        <div style="padding: 48px 0; text-align: center; color: var(--text-muted);">
          Loading garage…
        </div>
      </div>
    </div>`;

  // Seed starter AE86 if this is a fresh profile
  await ensureStarterVehicle(state);

  // Gather vehicles & load their part trees in parallel
  const vehicles = profile.garage.vehicles;
  const ids = Object.keys(vehicles);
  const trees = {};

  await Promise.all(ids.map(async id => {
    const tree = await loadPartTree(vehicles[id].modelId);
    if (tree) trees[id] = tree;
  }));

  // Re-grab container (still in DOM after await)
  const container = document.getElementById('garage-container');
  if (!container) return;
  container.innerHTML = '';

  // ── Title row ───────────────────────────────
  const garageValue = calcGarageValue(profile);

  const titleRow = el('div', {
    style: 'display:flex; align-items:baseline; justify-content:space-between; padding:24px 0 12px;',
  });
  titleRow.appendChild(el('h2', {
    style: 'font-size:var(--font-size-xl); font-weight:700; margin:0;',
    textContent: 'YOUR GARAGE',
  }));
  titleRow.appendChild(el('span', {
    className: 'font-data text-secondary',
    style: 'font-size:var(--font-size-sm);',
    textContent: `Value: ${formatYen(garageValue)}`,
  }));
  container.appendChild(titleRow);

  // ── Group by status ─────────────────────────
  const groups = { in_progress: [], complete: [], showcase: [] };
  for (const id of ids) {
    const s = vehicles[id].status || 'in_progress';
    (groups[s] || groups.in_progress).push(id);
  }

  // In-progress cards
  if (groups.in_progress.length > 0) {
    for (const id of groups.in_progress) {
      container.appendChild(buildVehicleCard(id, vehicles[id], trees[id], false));
    }
  }

  // Completed section
  container.appendChild(sectionDivider('COMPLETED CARS'));
  if (groups.complete.length > 0) {
    for (const id of groups.complete) {
      container.appendChild(buildVehicleCard(id, vehicles[id], trees[id], false));
    }
  } else {
    container.appendChild(emptyHint('(none yet)'));
  }

  // Showcase section
  container.appendChild(sectionDivider('SHOWCASE'));
  if (groups.showcase.length > 0) {
    for (const id of groups.showcase) {
      container.appendChild(buildVehicleCard(id, vehicles[id], trees[id], false));
    }
  } else {
    container.appendChild(emptyHint('(none yet — keep completed cars here for passive ¥50/day income)'));
  }
}

// ══════════════════════════════════════════════════════════════
//  Vehicle Card
// ══════════════════════════════════════════════════════════════

function buildVehicleCard(instanceId, vehicle, partTree, readOnly) {
  const { state } = getApp();
  const rarity    = partTree ? partTree.rarity : getVehicleRarity(vehicle.modelId);
  const name      = partTree ? partTree.displayName : getVehicleDisplayName(vehicle.modelId);
  const sysMap    = partTree ? buildSystemPartsMap(partTree) : {};
  const sysOrder  = partTree ? partTree.systems.map(s => s.id) : Object.keys(sysMap);

  // Per-system completion
  const sysComp = {};
  for (const sysId of sysOrder) {
    sysComp[sysId] = calcSystemCompletion(vehicle, sysMap[sysId] || []);
  }

  // Overall = average of systems
  const vals = Object.values(sysComp);
  const overall = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const overallPct = Math.round(overall * 100);

  // First start check
  const firstStartReady = partTree
    ? state.isFirstStartReady(instanceId, sysMap)
    : false;

  // ── Card shell ──────────────────────────────
  const card = el('div', { className: 'panel anim-fade-up', style: 'margin-bottom:16px;' });

  // Header: stars + name + status
  const hdr = el('div', { className: 'panel-header' });
  const hdrLeft = el('span');
  hdrLeft.innerHTML = `<span class="vehicle-rarity" data-rarity="${rarity}" style="margin-right:8px;">${rarityStars(rarity)}</span>${escHtml(name)}`;
  hdr.appendChild(hdrLeft);
  if (vehicle.nickname) {
    const nick = el('span', {
      className: 'text-muted font-data',
      style: 'font-size:var(--font-size-xs); margin-left:8px;',
      textContent: `"${vehicle.nickname}"`,
    });
    hdrLeft.appendChild(nick);
  }
  hdr.appendChild(el('span', {
    className: 'font-data text-secondary',
    style: 'font-size:var(--font-size-xs);',
    textContent: formatStatus(vehicle.status),
  }));
  card.appendChild(hdr);

  // Body
  const body = el('div', { className: 'panel-body' });

  // First-start banner
  if (firstStartReady && vehicle.status === 'in_progress') {
    const banner = el('div', {
      className: 'anim-pulse-glow',
      style: `
        background: linear-gradient(90deg, rgba(245,158,11,.12), rgba(245,158,11,.04));
        border: 1px solid var(--rarity-5);
        border-radius: var(--radius-sm);
        padding: 12px;
        margin-bottom: 16px;
        text-align: center;
        font-weight: 700;
        color: var(--rarity-5);
        cursor: pointer;
      `,
      textContent: '🔑 READY FOR FIRST START',
    });
    banner.addEventListener('click', () => navigate(`#/workbench/${instanceId}`));
    body.appendChild(banner);
  }

  // ── System dots grid (2-col) ────────────────
  const grid = el('div', {
    style: `
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 24px;
      row-gap: 4px;
      margin-bottom: 16px;
      font-family: var(--font-data);
      font-size: var(--font-size-xs);
    `,
  });

  for (const sysId of sysOrder) {
    const comp = sysComp[sysId] || 0;
    const pct  = Math.round(comp * 100);
    const dots = completionToDots(comp);

    const row = el('div', {
      style: 'display:flex; align-items:center; justify-content:space-between; padding:2px 0; gap:6px;',
    });
    row.innerHTML = `
      <span style="color:var(--text-secondary); width:52px; flex-shrink:0;">${shortSystemName(sysId)}</span>
      ${renderSystemDots(dots)}
      <span style="color:var(--text-muted); width:32px; text-align:right;">${pct}%</span>
    `;
    grid.appendChild(row);
  }
  body.appendChild(grid);

  // ── Overall progress bar ────────────────────
  const barWrap = el('div', { style: 'margin-bottom:16px;' });

  const barLabel = el('div', {
    style: 'display:flex; justify-content:space-between; font-family:var(--font-data); font-size:var(--font-size-xs); margin-bottom:4px;',
  });
  barLabel.innerHTML = `
    <span style="color:var(--text-secondary);">Overall</span>
    <span style="font-weight:600;">${overallPct}%</span>
  `;
  barWrap.appendChild(barLabel);

  const track = el('div', { className: 'condition-bar', style: 'height:10px;' });
  const fill  = el('div', { className: 'condition-bar__fill' });
  fill.style.setProperty('--fill-pct', overallPct + '%');
  fill.style.setProperty('--fill-color', conditionColor(overallPct));
  track.appendChild(fill);
  barWrap.appendChild(track);
  body.appendChild(barWrap);

  // ── Actions ─────────────────────────────────
  const actions = el('div', { style: 'display:flex; align-items:center; gap:8px; flex-wrap:wrap;' });

  if (!readOnly) {
    if (vehicle.status === 'in_progress') {
      // Workbench button
      const wb = el('button', { className: 'btn btn--primary', textContent: 'Open Workbench' });
      wb.addEventListener('click', () => navigate(`#/workbench/${instanceId}`));
      actions.appendChild(wb);

      // Nickname input
      actions.appendChild(buildNicknameInput(vehicle, state));

    } else if (vehicle.status === 'complete') {
      const { basePrice, wtBonus } = getSellInfo(rarity);
      const mult = calcQualityMultiplier(vehicle, rarity);
      const salePrice = Math.round(basePrice * mult);

      const sellBtn = el('button', {
        className: 'btn btn--danger',
        textContent: `Sell (${formatYen(salePrice)} + ${wtBonus} WT)`,
      });
      sellBtn.addEventListener('click', () =>
        showSellConfirm(instanceId, vehicle, name, salePrice, wtBonus));
      actions.appendChild(sellBtn);

      const scBtn = el('button', { className: 'btn btn--secondary', textContent: 'Move to Showcase' });
      scBtn.addEventListener('click', () => {
        vehicle.status = 'showcase';
        state.save();
        renderGarage();
      });
      actions.appendChild(scBtn);

    } else if (vehicle.status === 'showcase') {
      actions.appendChild(el('span', {
        className: 'font-data',
        style: 'font-size:var(--font-size-sm); color:var(--condition-good);',
        textContent: '+¥50/day passive income',
      }));
    }
  }

  body.appendChild(actions);
  card.appendChild(body);
  return card;
}

// ── Nickname Input ──────────────────────────────────────────

function buildNicknameInput(vehicle, state) {
  const wrap = el('div', { style: 'display:flex; align-items:center; gap:4px; margin-left:auto;' });
  wrap.appendChild(el('span', {
    className: 'text-muted',
    style: 'font-size:var(--font-size-xs);',
    textContent: 'Nickname:',
  }));

  const input = document.createElement('input');
  input.type = 'text';
  input.value = vehicle.nickname || '';
  input.placeholder = 'none';
  input.maxLength = 24;
  Object.assign(input.style, {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-data)',
    fontSize: 'var(--font-size-xs)',
    padding: '4px 8px',
    width: '120px',
    outline: 'none',
  });

  input.addEventListener('focus', () => { input.style.borderColor = 'var(--accent)'; });
  input.addEventListener('blur', () => {
    input.style.borderColor = 'var(--border)';
    const val = input.value.trim();
    if (val !== vehicle.nickname) {
      vehicle.nickname = val;
      state.save();
    }
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });

  wrap.appendChild(input);
  return wrap;
}

// ── Sell Confirmation Modal ─────────────────────────────────

function showSellConfirm(instanceId, vehicle, displayName, salePrice, wtBonus) {
  const { state } = getApp();

  const overlay = el('div', { className: 'modal-overlay' });
  const modal   = el('div', { className: 'modal' });

  modal.innerHTML = `
    <div class="modal-header">
      <span class="modal-header__title">Sell Vehicle</span>
      <button class="modal-header__close" data-action="close">×</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:12px;">
        Are you sure you want to sell <strong>${escHtml(displayName)}</strong>${vehicle.nickname ? ` ("${escHtml(vehicle.nickname)}")` : ''}?
      </p>
      <p class="font-data" style="font-size:var(--font-size-sm); margin-bottom:8px;">
        You'll receive: <strong style="color:var(--condition-good);">${formatYen(salePrice)}</strong>
        + <strong style="color:var(--accent);">${wtBonus} WT</strong>
      </p>
      <p style="font-size:var(--font-size-xs); color:var(--text-muted);">This cannot be undone.</p>
    </div>
    <div class="modal-actions">
      <button class="btn btn--secondary" data-action="close">Cancel</button>
      <button class="btn btn--danger" data-action="sell">Sell</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (action === 'close' || e.target === overlay) {
      close();
    } else if (action === 'sell') {
      state.updateCurrency('yen', salePrice);
      state.updateCurrency('wrenchTokens', wtBonus);
      const profile = state.getProfile();
      profile.stats.carsCompleted  = (profile.stats.carsCompleted || 0) + 1;
      profile.stats.totalYenEarned = (profile.stats.totalYenEarned || 0) + salePrice;
      delete profile.garage.vehicles[instanceId];
      state.save();
      close();
      refreshHeader();
      renderGarage();
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  renderVisit — read-only view of another player's garage
// ══════════════════════════════════════════════════════════════

export async function renderVisit(profileId) {
  const root = document.getElementById('game-root');
  const { sync } = getApp();

  root.innerHTML = `
    <div class="game-content">
      <div class="game-container" id="visit-container">
        <div style="padding:48px 0; text-align:center; color:var(--text-muted);">Loading garage…</div>
      </div>
    </div>`;

  let visitProfile = null;
  try {
    if (sync && typeof sync.readProfile === 'function') {
      visitProfile = await sync.readProfile(profileId);
    }
  } catch (e) {
    console.warn('Could not load visit profile:', e);
  }

  const container = document.getElementById('visit-container');
  if (!container) return;
  container.innerHTML = '';

  if (!visitProfile) {
    const msg = el('div', { style: 'padding:48px 0; text-align:center;' });
    msg.appendChild(el('p', {
      className: 'text-secondary',
      style: 'margin-bottom:16px;',
      textContent: "Could not load this player\u2019s garage.",
    }));
    const back = el('button', { className: 'btn btn--secondary', textContent: '← Back' });
    back.addEventListener('click', () => navigate('#/garage'));
    msg.appendChild(back);
    container.appendChild(msg);
    return;
  }

  // Header row
  const titleRow = el('div', {
    style: 'display:flex; align-items:center; justify-content:space-between; padding:24px 0 8px; gap:12px; flex-wrap:wrap;',
  });

  const back = el('button', { className: 'btn btn--ghost', textContent: '← Back' });
  back.addEventListener('click', () => navigate('#/garage'));
  titleRow.appendChild(back);

  const prettyName = profileId.charAt(0).toUpperCase() + profileId.slice(1);
  titleRow.appendChild(el('h2', {
    style: 'font-size:var(--font-size-xl); font-weight:700; margin:0; flex:1;',
    textContent: `${prettyName}\u2019s Garage`,
  }));

  titleRow.appendChild(el('span', {
    className: 'font-data text-secondary',
    style: 'font-size:var(--font-size-sm);',
    textContent: `Value: ${formatYen(calcGarageValue(visitProfile))}`,
  }));
  container.appendChild(titleRow);

  // Stats
  const stats = visitProfile.stats || {};
  const statsRow = el('div', {
    style: 'display:flex; gap:24px; padding:0 0 16px; font-family:var(--font-data); font-size:var(--font-size-xs); color:var(--text-secondary);',
  });
  statsRow.innerHTML = `
    <span>Cars Completed: <strong style="color:var(--text-primary);">${stats.carsCompleted || 0}</strong></span>
    <span>Total Repairs: <strong style="color:var(--text-primary);">${stats.totalRepairs || 0}</strong></span>
  `;
  container.appendChild(statsRow);

  // Load vehicles
  const vehicles = visitProfile.garage ? visitProfile.garage.vehicles : {};
  const ids = Object.keys(vehicles);

  if (ids.length === 0) {
    container.appendChild(emptyHint('This garage is empty.'));
    return;
  }

  const trees = {};
  await Promise.all(ids.map(async id => {
    const tree = await loadPartTree(vehicles[id].modelId);
    if (tree) trees[id] = tree;
  }));

  // Group + render
  const groups = { in_progress: [], complete: [], showcase: [] };
  for (const id of ids) {
    const s = vehicles[id].status || 'in_progress';
    (groups[s] || groups.in_progress).push(id);
  }

  for (const [status, group] of Object.entries(groups)) {
    if (group.length === 0) continue;
    if (status !== 'in_progress') {
      container.appendChild(sectionDivider(status === 'complete' ? 'COMPLETED' : 'SHOWCASE'));
    }
    for (const id of group) {
      container.appendChild(buildVehicleCard(id, vehicles[id], trees[id], true));
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  renderGarageVisit — rendering half for social.js delegation
//
//  social.js calls:
//    const { renderGarageVisit } = await import('./garage.js');
//    renderGarageVisit(remoteProfile, root);
//
//  It passes an already-fetched profile object and a container
//  element. We render the full system-dots + condition-bar cards
//  directly into that container (read-only, no sell/nickname UI).
//
//  FIX: garage.js previously only exported renderVisit(profileId)
//  which re-fetches from Firebase itself. social.js tried to import
//  renderGarageVisit — that name didn't exist, so the try/catch in
//  social.js swallowed the ImportError silently and fell back to
//  the simplified inline card grid (no system dots, no condition
//  bars). Adding this export makes the delegation succeed.
// ══════════════════════════════════════════════════════════════

/**
 * Render a read-only garage view for a pre-fetched remote profile.
 *
 * @param {object}      visitProfile  — profile data from sync.readProfile()
 * @param {HTMLElement} container     — element to render into
 */
export async function renderGarageVisit(visitProfile, container) {
  if (!visitProfile || !container) return;

  // Stats row
  const stats = visitProfile.stats || {};
  const statsRow = el('div', {
    style: 'display:flex; gap:24px; padding:0 0 16px; font-family:var(--font-data); font-size:var(--font-size-xs); color:var(--text-secondary);',
  });
  statsRow.innerHTML = `
    <span>Cars Completed: <strong style="color:var(--text-primary);">${stats.carsCompleted || 0}</strong></span>
    <span>Total Repairs: <strong style="color:var(--text-primary);">${stats.totalRepairs || 0}</strong></span>
  `;
  container.appendChild(statsRow);

  // Load vehicles
  const vehicles = visitProfile.garage ? visitProfile.garage.vehicles : {};
  const ids = Object.keys(vehicles);

  if (ids.length === 0) {
    container.appendChild(emptyHint('This garage is empty.'));
    return;
  }

  // Load part trees in parallel
  const trees = {};
  await Promise.all(ids.map(async id => {
    const tree = await loadPartTree(vehicles[id].modelId);
    if (tree) trees[id] = tree;
  }));

  // Group by status and render read-only vehicle cards
  const groups = { in_progress: [], complete: [], showcase: [] };
  for (const id of ids) {
    const s = vehicles[id].status || 'in_progress';
    (groups[s] || groups.in_progress).push(id);
  }

  for (const [status, group] of Object.entries(groups)) {
    if (group.length === 0) continue;
    if (status !== 'in_progress') {
      container.appendChild(sectionDivider(status === 'complete' ? 'COMPLETED' : 'SHOWCASE'));
    }
    for (const id of group) {
      container.appendChild(buildVehicleCard(id, vehicles[id], trees[id], /* readOnly */ true));
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  Tiny DOM helpers
// ══════════════════════════════════════════════════════════════

/** Create an element with optional props */
function el(tag, props) {
  const node = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === 'style' && typeof v === 'string') node.style.cssText = v;
      else if (k === 'className') node.className = v;
      else if (k === 'textContent') node.textContent = v;
      else if (k === 'innerHTML') node.innerHTML = v;
      else node.setAttribute(k, v);
    }
  }
  return node;
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function sectionDivider(label) {
  return el('div', {
    style: `
      padding: 24px 0 8px;
      font-size: var(--font-size-sm);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-secondary);
    `,
    textContent: `── ${label} ──`,
  });
}

function emptyHint(text) {
  return el('div', {
    style: 'padding:4px 0; font-size:var(--font-size-sm); color:var(--text-muted);',
    textContent: text,
  });
}
