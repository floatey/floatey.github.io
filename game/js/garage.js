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
 * For detailed systems: collects all part IDs across subsystems.
 * For bundle systems: uses the system id as the sole "part" id.
 */
function buildSystemPartsMap(partTree) {
  const map = {};
  if (!partTree || !partTree.systems) return map;
  for (const system of partTree.systems) {
    if (system.type === 'detailed' && system.subsystems) {
      const ids = [];
      for (const sub of system.subsystems) {
        if (sub.parts) {
          for (const p of sub.parts) {
            ids.push(p.id);
          }
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
 * For detailed systems: count revealed parts with condition >= 0.70 / total revealed.
 * For bundle systems: condition >= 0.70 means complete.
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
 * Convert a 0-1 completion ratio to filled dots (0–5).
 * 0-19% = 0, 20-39% = 1, 40-59% = 2, 60-79% = 3, 80-99% = 4, 100% = 5
 */
function completionToDots(ratio) {
  const pct = Math.round(ratio * 100);
  if (pct >= 100) return 5;
  if (pct >= 80) return 4;
  if (pct >= 60) return 3;
  if (pct >= 40) return 2;
  if (pct >= 20) return 1;
  return 0;
}

/** Render 5 system dots as HTML */
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

/** Short system display name */
function shortSystemName(fullName) {
  const map = {
    engine: 'Engine',
    fuel: 'Fuel',
    cooling: 'Cooling',
    exhaust: 'Exhaust',
    drivetrain: 'Drive.',
    brakes: 'Brakes',
    suspension: 'Susp.',
    interior: 'Inter.',
    electrical: 'Elec.',
    body: 'Body',
    glass: 'Glass',
    trim: 'Trim',
    forced_induction: 'Turbo',
  };
  return map[fullName] || fullName;
}

/** Rarity stars string */
function rarityStars(rarity) {
  return '★'.repeat(rarity);
}

/** Get rarity tier from vehicleData or part tree */
function getVehicleRarity(modelId) {
  const { vehicleData } = getApp();
  if (vehicleData && vehicleData.vehicles) {
    const v = vehicleData.vehicles.find(v => v.modelId === modelId);
    if (v) return v.rarity;
  }
  return 3;
}

/** Get vehicle display name from vehicleData */
function getVehicleDisplayName(modelId) {
  const { vehicleData } = getApp();
  if (vehicleData && vehicleData.vehicles) {
    const v = vehicleData.vehicles.find(v => v.modelId === modelId);
    if (v) return v.displayName;
  }
  return modelId;
}

/** Get vehicle base price for selling */
function getVehicleBasePrice(rarity) {
  const prices = { 3: 5000, 4: 15000, 5: 50000 };
  return prices[rarity] || 5000;
}

/** Get WT bonus for selling */
function getVehicleWTBonus(rarity) {
  const bonuses = { 3: 15, 4: 30, 5: 60 };
  return bonuses[rarity] || 15;
}

/**
 * Calculate quality multiplier based on average condition of all revealed parts.
 * Range: 1.0 (all at 70%) to max (all at 95%+).
 * 5★ can reach 2.0×, others cap at 1.5×.
 */
function calcQualityMultiplier(vehicle, rarity) {
  const parts = Object.values(vehicle.parts);
  const revealed = parts.filter(p => p.revealed && p.condition !== null);
  if (revealed.length === 0) return 1.0;

  const avgCondition = revealed.reduce((sum, p) => sum + p.condition, 0) / revealed.length;
  const maxMult = rarity === 5 ? 2.0 : 1.5;

  if (avgCondition <= 0.70) return 1.0;
  if (avgCondition >= 0.95) return maxMult;

  // Linear interpolation from 0.70→1.0 to 0.95→maxMult
  const t = (avgCondition - 0.70) / (0.95 - 0.70);
  return 1.0 + t * (maxMult - 1.0);
}

/** Calculate total garage value */
function calcGarageValue(profile) {
  let value = 0;
  const vehicles = profile.garage.vehicles;
  for (const instanceId of Object.keys(vehicles)) {
    const v = vehicles[instanceId];
    const rarity = getVehicleRarity(v.modelId);
    const basePrice = getVehicleBasePrice(rarity);
    const multiplier = calcQualityMultiplier(v, rarity);
    value += Math.round(basePrice * multiplier);
  }
  return value;
}

// ── Main Render ─────────────────────────────────────────────

export async function renderGarage() {
  const root = document.getElementById('game-root');
  const { state } = getApp();
  const profile = state.getProfile();

  root.innerHTML = '<div class="game-content"><div class="game-container" id="garage-container"><div class="text-secondary" style="padding: var(--space-lg); text-align: center;">Loading garage...</div></div></div>';

  // Load part trees for all vehicles
  const vehicles = profile.garage.vehicles;
  const instanceIds = Object.keys(vehicles);
  const partTrees = {};

  await Promise.all(
    instanceIds.map(async (id) => {
      const v = vehicles[id];
      const tree = await loadPartTree(v.modelId);
      if (tree) partTrees[id] = tree;
    })
  );

  const container = document.getElementById('garage-container');
  if (!container) return;
  container.innerHTML = '';

  // ── Header row ──────────────────────────────
  const garageValue = calcGarageValue(profile);
  const headerRow = document.createElement('div');
  headerRow.className = 'flex items-center justify-between';
  headerRow.style.cssText = 'padding: var(--space-lg) 0 var(--space-base) 0;';
  headerRow.innerHTML = `
    <h2 style="font-size: var(--font-size-xl); font-weight: 700;">YOUR GARAGE</h2>
    <span class="font-data text-secondary" style="font-size: var(--font-size-sm);">Value: ${formatYen(garageValue)}</span>
  `;
  container.appendChild(headerRow);

  // ── Group vehicles by status ────────────────
  const inProgress = [];
  const completed = [];
  const showcase = [];

  for (const id of instanceIds) {
    const v = vehicles[id];
    if (v.status === 'showcase') showcase.push(id);
    else if (v.status === 'complete') completed.push(id);
    else inProgress.push(id);
  }

  // ── In Progress section ─────────────────────
  if (inProgress.length > 0) {
    for (const instanceId of inProgress) {
      const card = buildVehicleCard(instanceId, vehicles[instanceId], partTrees[instanceId], false);
      container.appendChild(card);
    }
  } else {
    const empty = document.createElement('div');
    empty.className = 'panel';
    empty.innerHTML = '<div class="panel-body text-muted" style="text-align: center; padding: var(--space-xl);">No vehicles in progress. Visit the Junkyard to find one!</div>';
    container.appendChild(empty);
  }

  // ── Completed section ───────────────────────
  const completedHeader = document.createElement('div');
  completedHeader.className = 'text-secondary';
  completedHeader.style.cssText = 'padding: var(--space-lg) 0 var(--space-sm) 0; font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;';
  completedHeader.textContent = '── COMPLETED CARS ──';
  container.appendChild(completedHeader);

  if (completed.length > 0) {
    for (const instanceId of completed) {
      const card = buildVehicleCard(instanceId, vehicles[instanceId], partTrees[instanceId], false);
      container.appendChild(card);
    }
  } else {
    const emptyComplete = document.createElement('div');
    emptyComplete.className = 'text-muted';
    emptyComplete.style.cssText = 'padding: var(--space-sm) 0; font-size: var(--font-size-sm);';
    emptyComplete.textContent = '(none yet)';
    container.appendChild(emptyComplete);
  }

  // ── Showcase section ────────────────────────
  const showcaseHeader = document.createElement('div');
  showcaseHeader.className = 'text-secondary';
  showcaseHeader.style.cssText = 'padding: var(--space-lg) 0 var(--space-sm) 0; font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;';
  showcaseHeader.textContent = '── SHOWCASE ──';
  container.appendChild(showcaseHeader);

  if (showcase.length > 0) {
    for (const instanceId of showcase) {
      const card = buildVehicleCard(instanceId, vehicles[instanceId], partTrees[instanceId], false);
      container.appendChild(card);
    }
  } else {
    const emptyShowcase = document.createElement('div');
    emptyShowcase.className = 'text-muted';
    emptyShowcase.style.cssText = 'padding: var(--space-sm) 0; font-size: var(--font-size-sm);';
    emptyShowcase.textContent = '(none yet — keep completed cars here for passive ¥50/day income)';
    container.appendChild(emptyShowcase);
  }
}

// ── Vehicle Card Builder ────────────────────────────────────

function buildVehicleCard(instanceId, vehicle, partTree, readOnly) {
  const { state } = getApp();
  const rarity = partTree ? partTree.rarity : getVehicleRarity(vehicle.modelId);
  const displayName = partTree ? partTree.displayName : getVehicleDisplayName(vehicle.modelId);
  const systemsMap = partTree ? buildSystemPartsMap(partTree) : {};
  const systemOrder = partTree ? partTree.systems.map(s => s.id) : Object.keys(systemsMap);

  // Calculate per-system completions
  const systemCompletions = {};
  for (const sysId of systemOrder) {
    const partIds = systemsMap[sysId] || [];
    systemCompletions[sysId] = calcSystemCompletion(vehicle, partIds);
  }

  // Overall completion: average of all system completions
  const completionValues = Object.values(systemCompletions);
  const overallCompletion = completionValues.length > 0
    ? completionValues.reduce((a, b) => a + b, 0) / completionValues.length
    : 0;
  const overallPct = Math.round(overallCompletion * 100);

  // Check first start readiness
  const isFirstStartReady = partTree
    ? state.isFirstStartReady(instanceId, systemsMap)
    : false;

  // ── Card container ────────────────────────
  const card = document.createElement('div');
  card.className = 'panel anim-fade-up';
  card.style.cssText = 'margin-bottom: var(--space-base);';

  // ── Rarity stars + name + status header ───
  const header = document.createElement('div');
  header.className = 'panel-header';
  header.innerHTML = `
    <span>
      <span class="vehicle-rarity" data-rarity="${rarity}">${rarityStars(rarity)}</span>
      <span style="margin-left: var(--space-sm);">${displayName}</span>
    </span>
    <span class="text-sm font-data text-secondary">${formatStatus(vehicle.status)}</span>
  `;
  card.appendChild(header);

  const body = document.createElement('div');
  body.className = 'panel-body';

  // ── First Start banner ────────────────────
  if (isFirstStartReady && vehicle.status === 'in_progress') {
    const banner = document.createElement('div');
    banner.style.cssText = `
      background: linear-gradient(90deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05));
      border: 1px solid var(--rarity-5);
      border-radius: var(--radius-sm);
      padding: var(--space-md);
      margin-bottom: var(--space-base);
      text-align: center;
      font-weight: 700;
      color: var(--rarity-5);
      cursor: pointer;
      animation: pulseGlow 2s ease infinite;
    `;
    banner.textContent = '🔑 READY FOR FIRST START';
    banner.addEventListener('click', () => {
      navigate(`#/workbench/${instanceId}`);
    });
    body.appendChild(banner);
  }

  // ── System dots grid ──────────────────────
  const systemsGrid = document.createElement('div');
  systemsGrid.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-xs) var(--space-lg);
    margin-bottom: var(--space-base);
    font-size: var(--font-size-xs);
    font-family: var(--font-data);
  `;

  for (const sysId of systemOrder) {
    const completion = systemCompletions[sysId] || 0;
    const pct = Math.round(completion * 100);
    const filledDots = completionToDots(completion);
    const systemName = partTree
      ? shortSystemName(sysId)
      : shortSystemName(sysId);

    const row = document.createElement('div');
    row.className = 'flex items-center justify-between';
    row.style.cssText = 'padding: 2px 0;';
    row.innerHTML = `
      <span class="text-secondary" style="min-width: 48px;">${systemName}</span>
      ${renderSystemDots(filledDots)}
      <span class="text-muted" style="min-width: 30px; text-align: right;">${pct}%</span>
    `;
    systemsGrid.appendChild(row);
  }

  body.appendChild(systemsGrid);

  // ── Overall progress bar ──────────────────
  const overallWrap = document.createElement('div');
  overallWrap.style.cssText = 'margin-bottom: var(--space-base);';

  const overallLabel = document.createElement('div');
  overallLabel.className = 'flex items-center justify-between';
  overallLabel.style.cssText = 'font-size: var(--font-size-xs); margin-bottom: var(--space-xs);';
  overallLabel.innerHTML = `
    <span class="text-secondary font-data">Overall</span>
    <span class="font-data" style="font-weight: 600;">${overallPct}%</span>
  `;
  overallWrap.appendChild(overallLabel);

  const barTrack = document.createElement('div');
  barTrack.className = 'condition-bar';
  barTrack.style.cssText = 'height: 10px;';

  const barFill = document.createElement('div');
  barFill.className = 'condition-bar__fill';
  barFill.style.cssText = `
    --fill-pct: ${overallPct}%;
    --fill-color: ${overallPct >= 90 ? 'var(--condition-excellent)' : overallPct >= 70 ? 'var(--condition-good)' : overallPct >= 50 ? 'var(--condition-fair)' : overallPct >= 30 ? 'var(--condition-poor)' : 'var(--condition-critical)'};
  `;
  barTrack.appendChild(barFill);
  overallWrap.appendChild(barTrack);
  body.appendChild(overallWrap);

  // ── Action row ────────────────────────────
  const actions = document.createElement('div');
  actions.className = 'flex items-center justify-between gap-sm';
  actions.style.cssText = 'flex-wrap: wrap;';

  if (!readOnly) {
    if (vehicle.status === 'in_progress') {
      // Open Workbench button
      const workbenchBtn = document.createElement('button');
      workbenchBtn.className = 'btn btn--primary';
      workbenchBtn.textContent = 'Open Workbench';
      workbenchBtn.addEventListener('click', () => {
        navigate(`#/workbench/${instanceId}`);
      });
      actions.appendChild(workbenchBtn);

      // Nickname input
      const nicknameWrap = document.createElement('div');
      nicknameWrap.className = 'flex items-center gap-xs';
      nicknameWrap.innerHTML = '<span class="text-muted text-xs">Nickname:</span>';

      const nicknameInput = document.createElement('input');
      nicknameInput.type = 'text';
      nicknameInput.value = vehicle.nickname || '';
      nicknameInput.placeholder = 'none';
      nicknameInput.maxLength = 24;
      nicknameInput.style.cssText = `
        background: var(--bg-primary);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text-primary);
        font-family: var(--font-data);
        font-size: var(--font-size-xs);
        padding: var(--space-xs) var(--space-sm);
        width: 120px;
        outline: none;
        transition: border-color var(--transition-fast);
      `;
      nicknameInput.addEventListener('focus', () => {
        nicknameInput.style.borderColor = 'var(--accent)';
      });
      nicknameInput.addEventListener('blur', () => {
        nicknameInput.style.borderColor = 'var(--border)';
        const newName = nicknameInput.value.trim();
        if (newName !== vehicle.nickname) {
          vehicle.nickname = newName;
          state.save();
        }
      });
      nicknameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') nicknameInput.blur();
      });
      nicknameWrap.appendChild(nicknameInput);
      actions.appendChild(nicknameWrap);

    } else if (vehicle.status === 'complete') {
      // Sell button
      const sellBtn = document.createElement('button');
      sellBtn.className = 'btn btn--danger';
      const basePrice = getVehicleBasePrice(rarity);
      const mult = calcQualityMultiplier(vehicle, rarity);
      const salePrice = Math.round(basePrice * mult);
      const wtBonus = getVehicleWTBonus(rarity);
      sellBtn.textContent = `Sell (${formatYen(salePrice)} + ${wtBonus} WT)`;
      sellBtn.addEventListener('click', () => {
        showSellConfirm(instanceId, vehicle, displayName, salePrice, wtBonus);
      });
      actions.appendChild(sellBtn);

      // Showcase button
      const showcaseBtn = document.createElement('button');
      showcaseBtn.className = 'btn btn--secondary';
      showcaseBtn.textContent = 'Move to Showcase';
      showcaseBtn.addEventListener('click', () => {
        vehicle.status = 'showcase';
        state.save();
        renderGarage();
      });
      actions.appendChild(showcaseBtn);

    } else if (vehicle.status === 'showcase') {
      // Passive income info
      const incomeInfo = document.createElement('span');
      incomeInfo.className = 'font-data text-sm';
      incomeInfo.style.color = 'var(--condition-good)';
      incomeInfo.textContent = '+¥50/day passive income';
      actions.appendChild(incomeInfo);

      // Nickname display (read-only in showcase)
      if (vehicle.nickname) {
        const nick = document.createElement('span');
        nick.className = 'text-muted text-xs font-data';
        nick.textContent = `"${vehicle.nickname}"`;
        actions.appendChild(nick);
      }
    }
  }

  body.appendChild(actions);
  card.appendChild(body);

  return card;
}

// ── Sell Confirmation Modal ─────────────────────────────────

function showSellConfirm(instanceId, vehicle, displayName, salePrice, wtBonus) {
  const { state } = getApp();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  modal.innerHTML = `
    <div class="modal-header">
      <span class="modal-header__title">Sell Vehicle</span>
      <button class="modal-header__close" id="sell-close">×</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom: var(--space-base);">
        Are you sure you want to sell <strong>${displayName}</strong>${vehicle.nickname ? ` ("${vehicle.nickname}")` : ''}?
      </p>
      <p class="font-data text-sm" style="margin-bottom: var(--space-sm);">
        You'll receive: <strong style="color: var(--condition-good);">${formatYen(salePrice)}</strong> + <strong style="color: var(--accent);">${wtBonus} WT</strong>
      </p>
      <p class="text-xs text-muted">This action cannot be undone.</p>
    </div>
    <div class="modal-actions">
      <button class="btn btn--secondary" id="sell-cancel">Cancel</button>
      <button class="btn btn--danger" id="sell-confirm">Sell</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close handlers
  const close = () => overlay.remove();

  overlay.querySelector('#sell-close').addEventListener('click', close);
  overlay.querySelector('#sell-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#sell-confirm').addEventListener('click', () => {
    // Award currencies
    state.updateCurrency('yen', salePrice);
    state.updateCurrency('wrenchTokens', wtBonus);

    // Update stats
    const profile = state.getProfile();
    profile.stats.carsCompleted = (profile.stats.carsCompleted || 0) + 1;
    profile.stats.totalYenEarned = (profile.stats.totalYenEarned || 0) + salePrice;

    // Remove vehicle
    delete profile.garage.vehicles[instanceId];
    state.save();

    close();
    refreshHeader();
    renderGarage();
  });
}

// ── Status label formatter ──────────────────────────────────

function formatStatus(status) {
  switch (status) {
    case 'in_progress': return 'IN PROGRESS';
    case 'complete':    return 'COMPLETE';
    case 'showcase':    return 'SHOWCASE';
    default:            return status.toUpperCase();
  }
}

// ── Visit View (read-only) ──────────────────────────────────

export async function renderVisit(profileId) {
  const root = document.getElementById('game-root');
  const { sync } = getApp();

  root.innerHTML = '<div class="game-content"><div class="game-container" id="visit-container"><div class="text-secondary" style="padding: var(--space-lg); text-align: center;">Loading garage...</div></div></div>';

  // Fetch the other player's profile
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
    container.innerHTML = `
      <div style="padding: var(--space-xl); text-align: center;">
        <p class="text-secondary" style="margin-bottom: var(--space-base);">Could not load this player's garage.</p>
        <button class="btn btn--secondary" id="visit-back">← Back</button>
      </div>
    `;
    container.querySelector('#visit-back').addEventListener('click', () => navigate('#/garage'));
    return;
  }

  // ── Header ──────────────────────────────────
  const headerRow = document.createElement('div');
  headerRow.className = 'flex items-center justify-between';
  headerRow.style.cssText = 'padding: var(--space-lg) 0 var(--space-sm) 0;';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn--ghost';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', () => navigate('#/garage'));

  const titleEl = document.createElement('h2');
  titleEl.style.cssText = 'font-size: var(--font-size-xl); font-weight: 700;';
  titleEl.textContent = `${profileId.charAt(0).toUpperCase() + profileId.slice(1)}'s Garage`;

  const garageValue = calcGarageValue(visitProfile);
  const valueEl = document.createElement('span');
  valueEl.className = 'font-data text-secondary text-sm';
  valueEl.textContent = `Value: ${formatYen(garageValue)}`;

  headerRow.append(backBtn, titleEl, valueEl);
  container.appendChild(headerRow);

  // ── Stats row ───────────────────────────────
  const stats = visitProfile.stats || {};
  const statsRow = document.createElement('div');
  statsRow.className = 'flex gap-lg';
  statsRow.style.cssText = 'padding: 0 0 var(--space-base) 0; font-family: var(--font-data); font-size: var(--font-size-xs); color: var(--text-secondary);';
  statsRow.innerHTML = `
    <span>Cars Completed: <strong style="color: var(--text-primary);">${stats.carsCompleted || 0}</strong></span>
    <span>Total Repairs: <strong style="color: var(--text-primary);">${stats.totalRepairs || 0}</strong></span>
  `;
  container.appendChild(statsRow);

  // ── Vehicle cards (read-only) ───────────────
  const vehicles = visitProfile.garage ? visitProfile.garage.vehicles : {};
  const instanceIds = Object.keys(vehicles);

  // Load part trees
  const partTrees = {};
  await Promise.all(
    instanceIds.map(async (id) => {
      const v = vehicles[id];
      const tree = await loadPartTree(v.modelId);
      if (tree) partTrees[id] = tree;
    })
  );

  if (instanceIds.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'panel';
    empty.innerHTML = '<div class="panel-body text-muted" style="text-align: center; padding: var(--space-xl);">This garage is empty.</div>';
    container.appendChild(empty);
    return;
  }

  // Group by status
  const groups = { in_progress: [], complete: [], showcase: [] };
  for (const id of instanceIds) {
    const status = vehicles[id].status || 'in_progress';
    (groups[status] || groups.in_progress).push(id);
  }

  for (const [status, ids] of Object.entries(groups)) {
    if (ids.length === 0) continue;

    if (status !== 'in_progress') {
      const sectionLabel = document.createElement('div');
      sectionLabel.className = 'text-secondary';
      sectionLabel.style.cssText = 'padding: var(--space-lg) 0 var(--space-sm) 0; font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;';
      sectionLabel.textContent = status === 'complete' ? '── COMPLETED ──' : '── SHOWCASE ──';
      container.appendChild(sectionLabel);
    }

    for (const id of ids) {
      const card = buildVehicleCard(id, vehicles[id], partTrees[id], true);
      container.appendChild(card);
    }
  }
}
