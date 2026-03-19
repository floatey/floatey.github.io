// ════════════════════════════════════════════════════════════
//  shop.js — Parts Shop view
//  Sections: Replacement Parts (context-sensitive) + Tools
// ════════════════════════════════════════════════════════════

import { getApp, refreshHeader }  from './main.js';
import { formatYen }               from './utils.js';

// ── Static tool catalogue (from GDD Section 6) ──────────────

const TOOLS = [
  { id: 'impact_wrench',       name: 'Impact Wrench',          mechanic: 'wrench',    effect: 'Every 15th click = auto-5× burst',          cost: 500,  icon: '🔧' },
  { id: 'penetrating_oil',     name: 'Penetrating Oil (×10)',  mechanic: 'wrench',    effect: '–30% resistance on 1 repair',               cost: 50,   icon: '🫗', consumable: true },
  { id: 'torque_wrench',       name: 'Torque Wrench',          mechanic: 'precision', effect: '–15% sweep speed',                          cost: 800,  icon: '🔧' },
  { id: 'angle_gauge',         name: 'Angle Gauge',            mechanic: 'precision', effect: 'Green zone +10% wider',                     cost: 600,  icon: '📐' },
  { id: 'multimeter',          name: 'Multimeter',             mechanic: 'diagnosis', effect: 'Always reveals 1 extra clue',               cost: 400,  icon: '⚡' },
  { id: 'compression_tester',  name: 'Compression Tester',     mechanic: 'diagnosis', effect: 'Exact cylinder compression numbers',        cost: 350,  icon: '🔬' },
  { id: 'boost_leak_tester',   name: 'Boost Leak Tester',      mechanic: 'diagnosis', effect: 'Exact boost leak source',                   cost: 450,  icon: '💨' },
  { id: 'da_polisher',         name: 'DA Polisher',            mechanic: 'bodywork',  effect: '2× fill rate',                             cost: 700,  icon: '✨' },
  { id: 'media_blaster',       name: 'Media Blaster',          mechanic: 'bodywork',  effect: 'Instant-clear rust zones',                 cost: 1200, icon: '💥' },
];

const MECHANIC_COLORS = {
  wrench:    'var(--wrench-color)',
  precision: 'var(--precision-color)',
  diagnosis: 'var(--diagnosis-color)',
  bodywork:  'var(--bodywork-color)',
};

const RARITY_LABELS = {
  common:   { label: 'Common',   color: 'var(--rarity-3)' },
  uncommon: { label: 'Uncommon', color: 'var(--accent)'   },
  rare:     { label: 'Rare',     color: 'var(--rarity-4)' },
};

// ── Helpers ──────────────────────────────────────────────────

// FIX: Part tree cache — vehicles.json only has metadata, not part definitions.
// We load the real part tree JSON (e.g. data/parts/ae86.json) and cache it here.
const _partTreeCache = {};

async function loadPartTreeForShop(modelId) {
  if (_partTreeCache[modelId]) return _partTreeCache[modelId];
  try {
    const resp = await fetch(`data/parts/${modelId}.json`);
    if (!resp.ok) return null;
    const tree = await resp.json();
    _partTreeCache[modelId] = tree;
    return tree;
  } catch {
    return null;
  }
}

/**
 * Walk a real part-tree JSON to find a part definition by ID.
 * Handles both 'detailed' systems (with subsystems/parts) and 'bundle' systems.
 */
function findPartDefInTree(partId, partTree) {
  if (!partTree || !partTree.systems) return null;
  for (const system of partTree.systems) {
    if (system.type === 'bundle' && system.id === partId) return system;
    if (system.type === 'detailed' && system.subsystems) {
      for (const sub of system.subsystems) {
        if (sub.parts) {
          const found = sub.parts.find(p => p.id === partId);
          if (found) return found;
        }
      }
    }
  }
  return null;
}

/**
 * Walk every owned vehicle and collect parts with condition <= 0.30 (DESTROYED + CRITICAL).
 * These are parts the player can choose to replace instead of repairing.
 * Now async so it can load the real part-tree JSON for accurate names and costs.
 */
async function collectReplaceableParts(state, vehicleData) {
  const profile    = state.getProfile();
  const vehicles   = profile.garage.vehicles;
  const parts      = [];

  const vehicleList = vehicleData?.vehicles || [];

  for (const [instanceId, vehicle] of Object.entries(vehicles)) {
    const meta = vehicleList.find(v => v.modelId === vehicle.modelId);
    const vehicleLabel = vehicle.nickname
      ? vehicle.nickname
      : (meta ? meta.displayName : vehicle.modelId.toUpperCase());

    const partTree = await loadPartTreeForShop(vehicle.modelId);

    for (const [partId, partState] of Object.entries(vehicle.parts)) {
      if (!partState.revealed || partState.condition === null) continue;
      if (partState.condition > 0.30) continue;

      const partDef = findPartDefInTree(partId, partTree);
      const isDestroyed = partState.condition <= 0.10;

      parts.push({
        instanceId,
        vehicleLabel,
        partId,
        partName:     partDef ? partDef.name        : partId,
        replaceCost:  partDef ? (partDef.replaceCost || partDef.bundleCost || 200) : 200,
        sourceRarity: partDef ? (partDef.sourceRarity || 'common') : 'common',
        modelId:      vehicle.modelId,
        condition:    partState.condition,
        isDestroyed,
      });
    }
  }

  // Sort: destroyed first, then by cost descending
  parts.sort((a, b) => {
    if (a.isDestroyed !== b.isDestroyed) return a.isDestroyed ? -1 : 1;
    return b.replaceCost - a.replaceCost;
  });

  return parts;
}

function platformKey(modelId) {
  return modelId ? modelId.toLowerCase() : '';
}

// ── Confirm dialog ───────────────────────────────────────────

function showConfirm(title, message, confirmLabel, onConfirm) {
  dismissConfirm();

  const overlay = document.createElement('div');
  overlay.id = 'shop-confirm-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal anim-fade-up" role="dialog" aria-modal="true" aria-labelledby="shop-confirm-title">
      <div class="modal-header">
        <span class="modal-header__title" id="shop-confirm-title">${title}</span>
        <button class="modal-header__close" id="shop-confirm-close" aria-label="Cancel">×</button>
      </div>
      <div class="modal-body">
        <p style="font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.6;">${message}</p>
      </div>
      <div class="modal-actions">
        <button class="btn btn--secondary" id="shop-confirm-cancel">Cancel</button>
        <button class="btn btn--primary"   id="shop-confirm-ok">${confirmLabel}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => dismissConfirm();

  overlay.querySelector('#shop-confirm-close').addEventListener('click', close);
  overlay.querySelector('#shop-confirm-cancel').addEventListener('click', close);
  overlay.querySelector('#shop-confirm-ok').addEventListener('click', () => {
    dismissConfirm();
    onConfirm();
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

function dismissConfirm() {
  const existing = document.getElementById('shop-confirm-overlay');
  if (existing) existing.remove();
}

// ── Section renderers ─────────────────────────────────────────

function renderCurrencyBar(profile) {
  const { yen, wrenchTokens, donorParts } = profile.currency;

  const bar = document.createElement('div');
  bar.className = 'panel';
  bar.style.cssText = 'margin-bottom: var(--space-base);';

  const inner = document.createElement('div');
  inner.className = 'panel-body';
  inner.style.cssText = 'display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-lg);';

  const yenEl = document.createElement('div');
  yenEl.className = 'currency-display';
  yenEl.innerHTML = `
    <span class="currency-display__icon">¥</span>
    <span style="font-size: var(--font-size-lg); color: var(--rarity-5);">${formatYen(yen)}</span>
  `;

  const wtEl = document.createElement('div');
  wtEl.className = 'currency-display';
  wtEl.innerHTML = `
    <span style="color: var(--accent);">🔧</span>
    <span style="font-size: var(--font-size-base); color: var(--text-secondary);">${wrenchTokens} <span style="color: var(--text-muted); font-size: var(--font-size-xs);">WT</span></span>
  `;

  inner.append(yenEl, wtEl);

  if (donorParts && Object.keys(donorParts).length > 0) {
    const donorEl = document.createElement('div');
    donorEl.style.cssText = 'display: flex; flex-wrap: wrap; gap: var(--space-sm); align-items: center;';

    const label = document.createElement('span');
    label.className = 'text-muted text-xs font-data';
    label.style.cssText = 'text-transform: uppercase; letter-spacing: 0.06em;';
    label.textContent = 'Donor Parts:';
    donorEl.appendChild(label);

    for (const [platform, count] of Object.entries(donorParts)) {
      if (count <= 0) continue;
      const chip = document.createElement('span');
      chip.className = 'font-data';
      chip.style.cssText = `
        display: inline-flex; align-items: center; gap: var(--space-xs);
        padding: 2px var(--space-sm);
        background: var(--bg-primary);
        border: 1px solid var(--rarity-4);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        color: var(--rarity-4);
      `;
      chip.textContent = `${platform.toUpperCase()} ×${count}`;
      donorEl.appendChild(chip);
    }
    inner.appendChild(donorEl);
  }

  bar.appendChild(inner);
  return bar;
}

function renderReplacementParts(replaceableParts, profile) {
  const panel = document.createElement('div');
  panel.className = 'panel';

  const header = document.createElement('div');
  header.className = 'panel-header';
  header.textContent = 'Replacement Parts';
  panel.appendChild(header);

  const body = document.createElement('div');
  body.className = 'panel-body';
  body.style.cssText = 'padding: 0;';

  // ── Quality legend ──
  const legend = document.createElement('div');
  legend.style.cssText = `
    padding: var(--space-sm) var(--space-base);
    border-bottom: 1px solid var(--border);
    display: flex; flex-wrap: wrap; gap: var(--space-base);
    font-size: var(--font-size-xs); font-family: var(--font-data);
    color: var(--text-muted);
  `;
  legend.innerHTML = `
    <span>Buy (¥) → <strong style="color:var(--text-secondary);">85%</strong> aftermarket</span>
    <span>Donor Part → <strong style="color:var(--rarity-4);">100%</strong> OEM</span>
  `;
  body.appendChild(legend);

  if (replaceableParts.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      padding: var(--space-xl) var(--space-base);
      text-align: center;
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    `;
    empty.textContent = 'All parts above 30% — nothing needs replacing. Nice.';
    body.appendChild(empty);
    panel.appendChild(body);
    return panel;
  }

  for (const item of replaceableParts) {
    body.appendChild(renderReplacementRow(item, profile));
  }

  panel.appendChild(body);
  return panel;
}

function renderReplacementRow(item, profile) {
  const { instanceId, vehicleLabel, partId, partName, replaceCost, sourceRarity, modelId, condition, isDestroyed } = item;
  const yen      = profile.currency.yen;
  const donors   = profile.currency.donorParts || {};
  const platform = platformKey(modelId);
  const hasDonor = (donors[platform] || 0) > 0;
  const donorCount = donors[platform] || 0;
  const canAfford = yen >= replaceCost;
  const condPct = Math.round(condition * 100);

  const rarityInfo = RARITY_LABELS[sourceRarity] || RARITY_LABELS.common;

  const row = document.createElement('div');
  row.style.cssText = `
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-base);
    border-bottom: 1px solid var(--border);
  `;

  const infoEl = document.createElement('div');
  infoEl.style.cssText = 'flex: 1; min-width: 140px;';
  infoEl.innerHTML = `
    <div style="font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 2px;">${partName}</div>
    <div style="font-size: var(--font-size-xs); color: var(--text-muted); font-family: var(--font-data);">
      ${vehicleLabel}
      <span style="margin-left:6px; color:${isDestroyed ? 'var(--condition-destroyed)' : 'var(--condition-critical)'}; font-weight:600;">
        ${condPct}% ${isDestroyed ? 'DESTROYED' : 'CRITICAL'}
      </span>
    </div>
  `;

  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; align-items: center; gap: var(--space-sm); flex-shrink: 0;';

  const buyBtn = document.createElement('button');
  if (canAfford) {
    buyBtn.className = 'btn btn--primary';
    buyBtn.innerHTML = `Buy ${formatYen(replaceCost)} <span style="font-size:10px;opacity:0.7;">→ 85%</span>`;
    buyBtn.addEventListener('click', () => {
      showConfirm(
        `Buy Replacement`,
        `Buy an aftermarket <strong>${partName}</strong> for <strong style="color: var(--rarity-5);">${formatYen(replaceCost)}</strong>?<br>
         <span style="font-size:0.8rem;color:var(--text-muted);">Aftermarket — condition set to 85%.</span>`,
        `Buy — ${formatYen(replaceCost)}`,
        () => executeBuyReplacement(instanceId, partId, replaceCost, false)
      );
    });
  } else {
    buyBtn.className = 'btn btn--secondary';
    buyBtn.disabled = true;
    buyBtn.innerHTML = `
      <span style="color: var(--text-muted); font-size: var(--font-size-xs);">
        Need ${formatYen(replaceCost - yen)} more
      </span>
    `;
  }
  actions.appendChild(buyBtn);

  if (hasDonor) {
    const donorBtn = document.createElement('button');
    donorBtn.className = 'btn btn--secondary';
    donorBtn.style.cssText = 'border-color: var(--rarity-4); color: var(--rarity-4);';
    donorBtn.innerHTML = `Donor <span style="font-size:10px;">→ 100% · ${donorCount} left</span>`;
    donorBtn.addEventListener('click', () => {
      showConfirm(
        `Use Donor Part`,
        `Use a <strong style="color: var(--rarity-4);">${platform.toUpperCase()} Donor Part</strong> for <strong>${partName}</strong>?<br>
         <span style="font-size:0.8rem;color:var(--rarity-4);">OEM pull — condition set to 100%.</span><br>
         <span style="font-size:0.8rem;color:var(--text-muted);">${donorCount} remaining.</span>`,
        'Use Donor Part',
        () => executeBuyReplacement(instanceId, partId, 0, true, platform)
      );
    });
    actions.appendChild(donorBtn);
  }

  row.append(infoEl, actions);
  return row;
}

function executeBuyReplacement(instanceId, partId, cost, useDonor, platform) {
  const { state, sync } = getApp();

  if (useDonor && platform) {
    state.updateCurrency(`donorParts.${platform}`, -1);
  } else {
    state.updateCurrency('yen', -cost);
  }

  // Donor parts are OEM pulls → 100%. Yen buys aftermarket → 85%.
  const newCondition = useDonor ? 1.00 : 0.85;
  state.updatePart(instanceId, partId, { condition: newCondition });
  state.markDirty();

  if (sync) sync.requestWrite?.();
  refreshHeader();
  renderShop();
}

function renderToolsSection(profile) {
  const panel = document.createElement('div');
  panel.className = 'panel';

  const header = document.createElement('div');
  header.className = 'panel-header';
  header.textContent = 'Tools & Upgrades';
  panel.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'shop-grid';
  panel.appendChild(grid);

  for (const tool of TOOLS) {
    grid.appendChild(renderToolCard(tool, profile));
  }

  return panel;
}

function renderToolCard(tool, profile) {
  const { state } = getApp();
  const tools    = profile.tools || {};
  const yen      = profile.currency.yen;

  const isConsumable = !!tool.consumable;
  const ownedVal     = tools[tool.id];
  const isOwned      = !isConsumable && !!ownedVal;
  const count        = isConsumable ? (typeof ownedVal === 'number' ? ownedVal : 0) : 0;
  const canAfford    = yen >= tool.cost;

  let cardClass = 'shop-item';
  if (isOwned)        cardClass += ' shop-item--owned';
  else if (canAfford) cardClass += ' shop-item--affordable';

  const card = document.createElement('div');
  card.className = cardClass;

  const iconEl = document.createElement('div');
  iconEl.style.cssText = 'font-size: 28px; line-height: 1;';
  iconEl.textContent = tool.icon;

  const nameEl = document.createElement('div');
  nameEl.className = 'shop-item__name';
  nameEl.textContent = tool.name;

  const mechanicColor = MECHANIC_COLORS[tool.mechanic] || 'var(--accent)';
  const badge = document.createElement('span');
  badge.className = 'font-data';
  badge.style.cssText = `
    display: inline-block;
    font-size: var(--font-size-xs);
    padding: 2px var(--space-sm);
    border-radius: var(--radius-sm);
    border: 1px solid ${mechanicColor};
    color: ${mechanicColor};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    align-self: flex-start;
  `;
  badge.textContent = tool.mechanic;

  const effectEl = document.createElement('div');
  effectEl.className = 'shop-item__desc';
  effectEl.textContent = tool.effect;

  const bottomRow = document.createElement('div');
  bottomRow.style.cssText = 'display: flex; flex-direction: column; gap: var(--space-xs); margin-top: auto;';

  if (isOwned) {
    const ownedLabel = document.createElement('span');
    ownedLabel.className = 'shop-price';
    ownedLabel.style.cssText = 'color: var(--condition-good); font-size: var(--font-size-xs);';
    ownedLabel.textContent = 'OWNED ✓';
    bottomRow.appendChild(ownedLabel);
  } else {
    const priceEl = document.createElement('div');
    priceEl.className = 'shop-price';
    if (!canAfford) {
      priceEl.style.cssText = 'color: var(--text-muted);';
    }
    priceEl.textContent = `${formatYen(tool.cost)}`;

    if (isConsumable && count > 0) {
      priceEl.textContent += ` — ${count} remaining`;
    }

    const buyBtn = document.createElement('button');
    buyBtn.className = canAfford ? 'btn btn--primary' : 'btn btn--secondary';
    buyBtn.disabled  = !canAfford;
    buyBtn.textContent = canAfford ? `Buy — ${formatYen(tool.cost)}` : `Need ${formatYen(tool.cost - yen)} more`;

    if (canAfford) {
      buyBtn.addEventListener('click', () => {
        showConfirm(
          `Buy ${tool.name}`,
          `Purchase <strong>${tool.name}</strong> for <strong style="color: var(--rarity-5);">${formatYen(tool.cost)}</strong>?<br>
           <span style="font-size: var(--font-size-xs); color: var(--text-secondary); font-style: italic;">${tool.effect}</span>`,
          `Buy — ${formatYen(tool.cost)}`,
          () => executeBuyTool(tool)
        );
      });
    }

    bottomRow.append(priceEl, buyBtn);
  }

  card.append(iconEl, nameEl, badge, effectEl, bottomRow);
  return card;
}

function executeBuyTool(tool) {
  const { state, sync } = getApp();
  const profile = state.getProfile();

  if (!profile.tools) profile.tools = {};

  if (tool.consumable) {
    const current = typeof profile.tools[tool.id] === 'number'
      ? profile.tools[tool.id]
      : 0;
    profile.tools[tool.id] = current + 10;
  } else {
    profile.tools[tool.id] = true;
  }

  state.updateCurrency('yen', -tool.cost);
  state.markDirty();
  state.save();

  if (sync) sync.requestWrite?.();
  refreshHeader();
  renderShop();
}

// ── Main render entry point ───────────────────────────────────

export async function renderShop() {
  const root = document.getElementById('game-root');
  if (!root) return;

  const { state, vehicleData } = getApp();
  if (!state || !state.getCurrentProfileId()) return;

  const profile = state.getProfile();

  root.innerHTML = '';

  const content = document.createElement('div');
  content.className = 'game-content';

  const container = document.createElement('div');
  container.className = 'game-container';
  container.style.cssText = 'padding-top: var(--space-base);';

  const titleRow = document.createElement('div');
  titleRow.style.cssText = `
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: var(--space-base);
    flex-wrap: wrap;
    gap: var(--space-sm);
  `;
  const titleEl = document.createElement('h2');
  titleEl.className = 'font-data';
  titleEl.style.cssText = 'font-size: var(--font-size-lg); font-weight: 700; letter-spacing: -0.02em;';
  titleEl.textContent = 'Parts Shop';
  titleRow.appendChild(titleEl);
  container.appendChild(titleRow);

  container.appendChild(renderCurrencyBar(profile));

  const replaceableParts = await collectReplaceableParts(state, vehicleData);

  container.appendChild(renderReplacementParts(replaceableParts, profile));

  const spacer = document.createElement('div');
  spacer.style.cssText = 'height: var(--space-base);';
  container.appendChild(spacer);

  container.appendChild(renderToolsSection(profile));

  content.appendChild(container);
  root.appendChild(content);
}