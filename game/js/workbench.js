// ════════════════════════════════════════════════════════════
//  workbench.js — Workbench view: system navigator + part detail
// ════════════════════════════════════════════════════════════

import { navigate, getApp, refreshHeader } from './main.js';
import { startWrenchWork    } from './mechanics/wrench.js';
import { startPrecisionWork } from './mechanics/precision.js';
import { startDiagnosis     } from './mechanics/diagnosis.js';
import { startBodywork      } from './mechanics/bodywork.js';

// ── Part tree cache (shared with garage.js pattern) ─────────
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

// ── Helpers ──────────────────────────────────────────────────

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

function formatYen(amount) {
  return `¥${Number(amount).toLocaleString()}`;
}

// ── Condition helpers ────────────────────────────────────────

const CONDITION_THRESHOLDS = [
  { min: 0.90, label: 'EXCELLENT',  css: 'excellent',  color: 'var(--condition-excellent)' },
  { min: 0.71, label: 'GOOD',       css: 'good',       color: 'var(--condition-good)' },
  { min: 0.51, label: 'FAIR',       css: 'fair',       color: 'var(--condition-fair)' },
  { min: 0.31, label: 'POOR',       css: 'poor',       color: 'var(--condition-poor)' },
  { min: 0.11, label: 'CRITICAL',   css: 'critical',   color: 'var(--condition-critical)' },
  { min: 0.00, label: 'DESTROYED',  css: 'destroyed',  color: 'var(--condition-destroyed)' },
];

function getConditionInfo(condition) {
  if (condition === null || condition === undefined) {
    return { label: 'UNKNOWN', css: 'destroyed', color: 'var(--text-muted)', pct: 0 };
  }
  const pct = Math.round(condition * 100);
  for (const t of CONDITION_THRESHOLDS) {
    if (condition >= t.min) return { ...t, pct };
  }
  return { ...CONDITION_THRESHOLDS[CONDITION_THRESHOLDS.length - 1], pct };
}

// ── Repair type helpers ──────────────────────────────────────

const REPAIR_TYPES = {
  wrench:    { icon: '🔧', label: 'Wrench',    color: 'var(--wrench-color)' },
  precision: { icon: '⚙️', label: 'Precision',  color: 'var(--precision-color)' },
  diagnosis: { icon: '🔍', label: 'Diagnosis',  color: 'var(--diagnosis-color)' },
  bodywork:  { icon: '🎨', label: 'Bodywork',   color: 'var(--bodywork-color)' },
};

function getRepairTypeInfo(type) {
  return REPAIR_TYPES[type] || REPAIR_TYPES.wrench;
}

// ── Difficulty dots (0.0-1.0 → 1-5 dots) ────────────────────

function difficultyDots(difficulty) {
  const filled = Math.max(1, Math.min(5, Math.ceil(difficulty * 5)));
  let html = '';
  for (let i = 0; i < 5; i++) {
    html += i < filled
      ? '<span style="color:var(--text-primary);">●</span>'
      : '<span style="color:var(--text-muted);">○</span>';
  }
  return html;
}

// ── System completion helpers ────────────────────────────────

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

// ── Lookup helpers across the part tree ──────────────────────

function findPartDef(partTree, partId) {
  if (!partTree || !partTree.systems) return null;
  for (const system of partTree.systems) {
    if (system.type === 'bundle' && system.id === partId) {
      return { ...system, _isBundle: true };
    }
    if (system.type === 'detailed' && system.subsystems) {
      for (const sub of system.subsystems) {
        if (sub.parts) {
          for (const p of sub.parts) {
            if (p.id === partId) return p;
          }
        }
      }
    }
  }
  return null;
}

function findPartName(partTree, partId) {
  const def = findPartDef(partTree, partId);
  return def ? def.name : partId;
}

function findSystemForPart(partTree, partId) {
  if (!partTree || !partTree.systems) return null;
  for (const system of partTree.systems) {
    if (system.type === 'bundle' && system.id === partId) return system;
    if (system.type === 'detailed' && system.subsystems) {
      for (const sub of system.subsystems) {
        if (sub.parts) {
          for (const p of sub.parts) {
            if (p.id === partId) return system;
          }
        }
      }
    }
  }
  return null;
}

// ── Toast notifications ──────────────────────────────────────

function showToast(message, durationMs = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = el('div', {
      id: 'toast-container',
      style: `position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
              z-index:400; display:flex; flex-direction:column; gap:8px;
              align-items:center; pointer-events:none;`,
    });
    document.body.appendChild(container);
  }
  const toast = el('div', {
    style: `background:var(--bg-elevated); border:1px solid var(--border);
            border-radius:var(--radius-md); padding:var(--space-sm) var(--space-base);
            font-size:var(--font-size-sm); color:var(--text-primary);
            font-family:var(--font-data); pointer-events:auto;
            animation:fadeUp 300ms ease; box-shadow:0 4px 24px rgba(0,0,0,0.4);`,
    textContent: message,
  });
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}

// ── Confetti ─────────────────────────────────────────────────

function spawnConfetti(count = 40) {
  const colors = ['#ef4444', '#f59e0b', '#22c55e', '#4e7fff', '#a855f7', '#fb7185', '#2dd4bf'];
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.className = 'confetti-dot';
    dot.style.left = `${Math.random() * 100}vw`;
    dot.style.top = `${-10 - Math.random() * 20}px`;
    dot.style.background = colors[Math.floor(Math.random() * colors.length)];
    dot.style.animationDuration = `${2 + Math.random() * 2}s`;
    dot.style.animationDelay = `${Math.random() * 0.8}s`;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 5000);
  }
}

// ══════════════════════════════════════════════════════════════
//  REPAIR LOG — per vehicle instance
// ══════════════════════════════════════════════════════════════

function getRepairLog(instanceId) {
  const { state } = getApp();
  const vehicle = state.getVehicle(instanceId);
  if (!vehicle) return [];
  if (!vehicle.repairLog) vehicle.repairLog = [];
  return vehicle.repairLog;
}

function addLogEntry(instanceId, icon, text) {
  const { state } = getApp();
  const vehicle = state.getVehicle(instanceId);
  if (!vehicle) return;
  if (!vehicle.repairLog) vehicle.repairLog = [];
  vehicle.repairLog.unshift({
    icon,
    text,
    time: Date.now(),
  });
  // Cap at 50 entries
  if (vehicle.repairLog.length > 50) vehicle.repairLog.length = 50;
  state.save();
}

// ══════════════════════════════════════════════════════════════
//  MAIN RENDER — renderWorkbench(vehicleInstanceId)
// ══════════════════════════════════════════════════════════════

/** @type {{ instanceId: string, partTree: object, selectedPartId: string|null, expandedSystems: Set<string>, mobileNavOpen: boolean }} */
let wb = null;

export async function renderWorkbench(vehicleInstanceId) {
  const root = document.getElementById('game-root');
  const { state } = getApp();
  const vehicle = state.getVehicle(vehicleInstanceId);

  if (!vehicle) {
    root.innerHTML = `<div class="game-content"><div class="game-container">
      <p style="padding:48px 0; text-align:center; color:var(--text-muted);">Vehicle not found.</p>
      <button class="btn btn--secondary" onclick="location.hash='#/garage'">← Back to Garage</button>
    </div></div>`;
    return;
  }

  // Show loading
  root.innerHTML = `<div class="game-content"><div class="game-container">
    <div style="padding:48px 0; text-align:center; color:var(--text-muted);">Loading workbench…</div>
  </div></div>`;

  const partTree = await loadPartTree(vehicle.modelId);
  if (!partTree) {
    root.innerHTML = `<div class="game-content"><div class="game-container">
      <p style="padding:48px 0; text-align:center; color:var(--text-muted);">Could not load part data for this vehicle.</p>
      <button class="btn btn--secondary" onclick="location.hash='#/garage'">← Back to Garage</button>
    </div></div>`;
    return;
  }

  // Initialize workbench state
  wb = {
    instanceId: vehicleInstanceId,
    partTree,
    selectedPartId: null,
    expandedSystems: new Set(),
    mobileNavOpen: false,
  };

  // Check for first start readiness
  const systemsMap = buildSystemPartsMap(partTree);
  const firstStartReady = state.isFirstStartReady(vehicleInstanceId, systemsMap);
  const alreadyStarted = vehicle.status === 'complete' || vehicle.status === 'showcase' || vehicle.firstStartDone;

  if (firstStartReady && !alreadyStarted) {
    renderFirstStartOverlay(vehicleInstanceId, partTree, vehicle);
    return;
  }

  renderWorkbenchUI();
}

// ── Main workbench UI render ─────────────────────────────────

function renderWorkbenchUI() {
  const root = document.getElementById('game-root');
  const { state } = getApp();
  const { instanceId, partTree } = wb;
  const vehicle = state.getVehicle(instanceId);

  root.innerHTML = '';

  const content = el('div', { className: 'game-content' });
  const container = el('div', {
    className: 'game-container',
    style: 'max-width:1100px;',
  });

  // ── Mobile toggle ──────────────────────────────
  const mobileToggle = el('button', {
    className: 'btn btn--secondary w-full',
    style: `display:none; margin-bottom:var(--space-sm); font-family:var(--font-data);
            font-size:var(--font-size-sm);`,
    textContent: wb.mobileNavOpen ? 'Systems ▲' : 'Systems ▼',
  });
  mobileToggle.id = 'wb-mobile-toggle';
  const mqMobile = window.matchMedia('(max-width: 639px)');
  function updateMobileToggle() {
    mobileToggle.style.display = mqMobile.matches ? 'block' : 'none';
  }
  updateMobileToggle();
  mqMobile.addEventListener('change', updateMobileToggle);

  mobileToggle.addEventListener('click', () => {
    wb.mobileNavOpen = !wb.mobileNavOpen;
    const nav = document.getElementById('wb-system-nav');
    if (nav) {
      nav.classList.toggle('is-open', wb.mobileNavOpen);
    }
    mobileToggle.textContent = wb.mobileNavOpen ? 'Systems ▲' : 'Systems ▼';
  });

  container.appendChild(mobileToggle);

  // ── Split view layout ──────────────────────────
  const splitView = el('div', { className: 'split-view' });

  // LEFT PANEL — System Navigator
  const sidebar = el('div', {
    className: 'sidebar sidebar--mobile-collapse' + (wb.mobileNavOpen ? ' is-open' : ''),
    id: 'wb-system-nav',
  });

  const sidebarPanel = el('div', { className: 'panel' });
  const sidebarHeader = el('div', { className: 'panel-header' });
  sidebarHeader.textContent = 'SYSTEMS';
  sidebarPanel.appendChild(sidebarHeader);

  const systemList = el('div', {
    className: 'system-list',
    style: 'max-height:calc(100vh - 260px); overflow-y:auto;',
  });

  renderSystemList(systemList);
  sidebarPanel.appendChild(systemList);
  sidebar.appendChild(sidebarPanel);
  splitView.appendChild(sidebar);

  // RIGHT PANEL — Main Area
  const mainArea = el('div', { className: 'main-area' });

  // Active repair area (container for mechanic UI)
  const mechanicContainer = el('div', {
    id: 'wb-mechanic-area',
    className: 'mechanic-area',
    style: 'min-height:0;',
  });
  mainArea.appendChild(mechanicContainer);

  // Part detail area
  const partDetailContainer = el('div', { id: 'wb-part-detail' });
  renderPartDetail(partDetailContainer);
  mainArea.appendChild(partDetailContainer);

  // Repair log
  const logSection = el('div', { style: 'margin-top:var(--space-base);' });
  const logHeader = el('div', {
    style: `font-size:var(--font-size-sm); font-weight:600; text-transform:uppercase;
            letter-spacing:0.06em; color:var(--text-secondary); margin-bottom:var(--space-sm);`,
    textContent: 'REPAIR LOG',
  });
  logSection.appendChild(logHeader);

  const logContainer = el('div', { className: 'repair-log', id: 'wb-repair-log' });
  renderRepairLog(logContainer);
  logSection.appendChild(logContainer);
  mainArea.appendChild(logSection);

  splitView.appendChild(mainArea);
  container.appendChild(splitView);

  // ── Skill bar (bottom) ─────────────────────────
  const skillBarSection = el('div', {
    style: `margin-top:var(--space-base); padding:var(--space-md) var(--space-base);
            background:var(--bg-elevated); border:1px solid var(--border);
            border-radius:var(--radius-md);`,
    id: 'wb-skill-bar',
  });
  renderSkillBar(skillBarSection);
  container.appendChild(skillBarSection);

  content.appendChild(container);
  root.appendChild(content);
}

// ══════════════════════════════════════════════════════════════
//  SYSTEM LIST — Left Panel Navigator
// ══════════════════════════════════════════════════════════════

function renderSystemList(container) {
  const { instanceId, partTree } = wb;
  const { state } = getApp();
  const vehicle = state.getVehicle(instanceId);
  const systemsMap = buildSystemPartsMap(partTree);

  container.innerHTML = '';

  for (const system of partTree.systems) {
    const systemPartIds = systemsMap[system.id] || [];
    const completion = calcSystemCompletion(vehicle, systemPartIds);
    const completionPct = Math.round(completion * 100);
    const filledDots = completionToDots(completion);
    const isComplete = completion >= 1.0;
    const isExpanded = wb.expandedSystems.has(system.id);

    // System item
    const systemItem = el('div', {
      className: 'system-item' + (isExpanded ? ' system-item--expanded' : ''),
    });

    const header = el('div', { className: 'system-item__header' });

    const nameWrap = el('div', { style: 'display:flex; align-items:center; gap:var(--space-sm);' });

    const arrow = el('span', { className: 'system-item__arrow', textContent: '▸' });
    nameWrap.appendChild(arrow);

    const name = el('span', { textContent: system.name });
    nameWrap.appendChild(name);

    if (isComplete) {
      const badge = el('span', {
        style: 'font-size:var(--font-size-xs); color:var(--condition-good); margin-left:var(--space-xs);',
        textContent: '✅',
      });
      nameWrap.appendChild(badge);
    }

    header.appendChild(nameWrap);

    const progressWrap = el('div', { className: 'system-item__progress' });
    progressWrap.innerHTML = `${renderSystemDots(filledDots)} <span style="margin-left:4px;">${completionPct}%</span>`;
    header.appendChild(progressWrap);

    systemItem.appendChild(header);

    // Click to expand/collapse
    systemItem.addEventListener('click', (e) => {
      e.stopPropagation();
      if (wb.expandedSystems.has(system.id)) {
        wb.expandedSystems.delete(system.id);
      } else {
        wb.expandedSystems.add(system.id);
      }
      const listEl = document.querySelector('.system-list');
      if (listEl) renderSystemList(listEl);
    });

    container.appendChild(systemItem);

    // Expanded content
    if (isExpanded) {
      if (system.type === 'bundle') {
        const bundleItem = renderBundleItem(system, vehicle);
        container.appendChild(bundleItem);
      } else if (system.type === 'detailed' && system.subsystems) {
        const subList = el('div', { className: 'subsystem-list', style: 'max-height:1000px;' });
        for (const sub of system.subsystems) {
          const subItem = el('div', {
            className: 'subsystem-item',
            style: 'font-weight:500; color:var(--text-secondary); padding-top:var(--space-sm); padding-bottom:2px;',
          });
          subItem.textContent = sub.name;
          subList.appendChild(subItem);

          if (sub.parts) {
            for (const part of sub.parts) {
              const partInstance = vehicle.parts[part.id];
              const partItem = renderPartItem(part, partInstance);
              subList.appendChild(partItem);
            }
          }
        }
        container.appendChild(subList);
      }
    }
  }
}

function renderBundleItem(system, vehicle) {
  const partInstance = vehicle.parts[system.id];
  const isSelected = wb.selectedPartId === system.id;
  const condition = partInstance ? partInstance.condition : null;
  const condInfo = getConditionInfo(condition);
  const repairInfo = getRepairTypeInfo(system.repairType);

  const item = el('div', {
    className: 'part-item' + (isSelected ? ' part-item--active' : ''),
    style: 'padding-left:var(--space-lg);',
  });

  const left = el('div', {
    style: 'display:flex; align-items:center; gap:var(--space-sm); min-width:0; flex:1;',
  });

  left.appendChild(el('span', {
    style: `width:8px; height:8px; border-radius:50%; background:${condInfo.color}; flex-shrink:0;`,
  }));
  left.appendChild(el('span', {
    style: 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;',
    textContent: `${system.name} (Bundle)`,
  }));

  const right = el('div', { className: 'part-item__condition' });
  right.innerHTML = `<span style="color:${condInfo.color};">${condInfo.pct}%</span> <span>${repairInfo.icon}</span>`;

  item.appendChild(left);
  item.appendChild(right);

  item.addEventListener('click', (e) => {
    e.stopPropagation();
    try { window.audioManager?.playClick(); } catch (_) {}
    wb.selectedPartId = system.id;
    refreshPartDetail();
    refreshSystemList();
  });

  return item;
}

function renderPartItem(partDef, partInstance) {
  const isRevealed = partInstance && partInstance.revealed;
  const isSelected = wb.selectedPartId === partDef.id;

  // Not yet revealed by a hiddenReveal action — fully hidden
  if (!isRevealed) {
    const item = el('div', { className: 'part-item part-item--hidden' });
    item.innerHTML = `<span style="display:flex;align-items:center;gap:var(--space-sm);">
      <span>🔒</span><span>???</span></span>`;
    return item;
  }

  // Prerequisites not yet met — hide from navigator until the blocker is fixed
  const prereqs = partDef.prerequisites || [];
  if (prereqs.length > 0) {
    const { state } = getApp();
    const vehicle = state.getVehicle(wb.instanceId);
    const unmet = prereqs.some(pid => {
      const p = vehicle?.parts[pid];
      return !p || p.condition === null || p.condition < 0.70;
    });
    if (unmet) {
      const item = el('div', { className: 'part-item part-item--hidden' });
      item.innerHTML = `<span style="display:flex;align-items:center;gap:var(--space-sm);">
        <span>🔒</span><span style="font-size:var(--font-size-xs);color:var(--text-muted);">Locked</span></span>`;
      return item;
    }
  }

  const condition = partInstance.condition;
  const condInfo = getConditionInfo(condition);
  const repairInfo = getRepairTypeInfo(partDef.repairType);

  const item = el('div', {
    className: 'part-item' + (isSelected ? ' part-item--active' : ''),
  });

  const left = el('div', {
    style: 'display:flex; align-items:center; gap:var(--space-sm); min-width:0; flex:1;',
  });

  left.appendChild(el('span', {
    style: `width:8px; height:8px; border-radius:50%; background:${condInfo.color}; flex-shrink:0;`,
  }));

  left.appendChild(el('span', {
    style: 'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;',
    textContent: partDef.name,
  }));

  const right = el('div', { className: 'part-item__condition' });
  right.innerHTML = `<span style="color:${condInfo.color};">${condInfo.pct}%</span> <span>${repairInfo.icon}</span>`;

  item.appendChild(left);
  item.appendChild(right);

  item.addEventListener('click', (e) => {
    e.stopPropagation();
    try { window.audioManager?.playClick(); } catch (_) {}
    wb.selectedPartId = partDef.id;
    refreshPartDetail();
    refreshSystemList();
    // On mobile, close nav after selecting
    if (window.innerWidth < 640) {
      wb.mobileNavOpen = false;
      const nav = document.getElementById('wb-system-nav');
      if (nav) nav.classList.remove('is-open');
      const toggle = document.getElementById('wb-mobile-toggle');
      if (toggle) toggle.textContent = 'Systems ▼';
    }
  });

  return item;
}

// ── Refresh helpers ──────────────────────────────────────────

function refreshSystemList() {
  const listEl = document.querySelector('.system-list');
  if (listEl) renderSystemList(listEl);
}

function refreshPartDetail() {
  const detailEl = document.getElementById('wb-part-detail');
  if (detailEl) renderPartDetail(detailEl);
}

function refreshRepairLog() {
  const logEl = document.getElementById('wb-repair-log');
  if (logEl) renderRepairLog(logEl);
}

function refreshSkillBar() {
  const skillEl = document.getElementById('wb-skill-bar');
  if (skillEl) renderSkillBar(skillEl);
}

// ══════════════════════════════════════════════════════════════
//  PART DETAIL — Right Panel
// ══════════════════════════════════════════════════════════════

function renderPartDetail(container) {
  const { instanceId, partTree, selectedPartId } = wb;
  const { state } = getApp();
  const vehicle = state.getVehicle(instanceId);

  container.innerHTML = '';

  if (!selectedPartId) {
    container.appendChild(el('div', {
      className: 'part-detail',
      style: 'text-align:center; padding:var(--space-xl); color:var(--text-muted);',
      textContent: 'Select a part from the system navigator to view details.',
    }));
    return;
  }

  const partDef = findPartDef(partTree, selectedPartId);
  const partInstance = vehicle.parts[selectedPartId];

  if (!partDef || !partInstance) {
    container.appendChild(el('div', {
      className: 'part-detail',
      style: 'color:var(--text-muted);',
      textContent: 'Part data not found.',
    }));
    return;
  }

  const isBundle = partDef._isBundle;
  const condition = partInstance.condition;
  const condInfo = getConditionInfo(condition);
  const repairType = partDef.repairType || 'wrench';
  const repairInfo = getRepairTypeInfo(repairType);
  const difficulty = partDef.difficulty || 0.5;

  const detail = el('div', { className: 'part-detail' });

  // 1. Part name
  detail.appendChild(el('div', {
    className: 'part-detail__name',
    textContent: partDef.name,
  }));

  // 2. Condition bar
  const condRow = el('div', { style: 'margin-bottom:var(--space-sm);' });
  const condLabel = el('div', {
    style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-xs);',
  });
  condLabel.appendChild(el('span', {
    className: 'font-data',
    style: 'font-size:var(--font-size-sm);',
    textContent: `Condition: ${condInfo.pct}%`,
  }));
  condLabel.appendChild(el('span', {
    className: `condition-label condition-label--${condInfo.css}`,
    textContent: condInfo.label,
  }));
  condRow.appendChild(condLabel);

  const condBar = el('div', { className: 'condition-bar' });
  const condFill = el('div', { className: 'condition-bar__fill' });
  condFill.style.setProperty('--fill-pct', `${condInfo.pct}%`);
  condFill.style.setProperty('--fill-color', condInfo.color);
  condBar.appendChild(condFill);
  condRow.appendChild(condBar);
  detail.appendChild(condRow);

  // 3. Repair type badge + Difficulty
  const meta = el('div', { className: 'part-detail__meta' });
  meta.innerHTML = `
    <span style="color:${repairInfo.color};">${repairInfo.icon} ${repairInfo.label}</span>
    <span>Difficulty: ${difficultyDots(difficulty)}</span>
  `;
  detail.appendChild(meta);

  // 4. Status + prerequisites check
  const statusSection = el('div', { style: 'margin-bottom:var(--space-md);' });

  let prereqsMet = true;
  let prereqNames = [];
  if (!isBundle && partDef.prerequisites && partDef.prerequisites.length > 0) {
    for (const prereqId of partDef.prerequisites) {
      const prereqInstance = vehicle.parts[prereqId];
      if (!prereqInstance || prereqInstance.condition === null || prereqInstance.condition < 0.70) {
        prereqsMet = false;
        prereqNames.push(findPartName(partTree, prereqId));
      }
    }
  }

  if (!prereqsMet) {
    statusSection.appendChild(el('div', {
      style: 'color:var(--condition-critical); font-size:var(--font-size-sm); margin-bottom:var(--space-sm);',
      textContent: `⚠ Requires: ${prereqNames.join(', ')}`,
    }));
  }

  if (condition <= 0.10) {
    statusSection.appendChild(el('div', {
      style: 'color:var(--condition-destroyed); font-size:var(--font-size-sm); font-weight:600;',
      textContent: 'Cannot repair. Must replace.',
    }));
  } else if (condition >= 0.90) {
    statusSection.appendChild(el('div', {
      style: 'color:var(--condition-excellent); font-size:var(--font-size-sm); font-weight:600;',
      textContent: 'Excellent condition. No work needed.',
    }));
  } else {
    statusSection.appendChild(el('div', {
      style: 'color:var(--text-secondary); font-size:var(--font-size-sm);',
      textContent: 'Repairable.',
    }));
  }

  detail.appendChild(statusSection);

  // 5. Action buttons
  const actions = el('div', { className: 'part-detail__actions' });

  if (condition <= 0.10) {
    const replaceCost = isBundle ? (partDef.bundleCost || 0) : (partDef.replaceCost || 0);

    const replaceBtn = el('button', {
      className: 'btn btn--primary',
      textContent: `Replace — ${formatYen(replaceCost)}`,
    });
    replaceBtn.addEventListener('click', () => handleReplace(selectedPartId, replaceCost));
    actions.appendChild(replaceBtn);

    const profile = state.getProfile();
    const platform = vehicle.modelId;
    const donorCount = (profile.currency.donorParts && profile.currency.donorParts[platform]) || 0;
    if (donorCount > 0) {
      const donorBtn = el('button', {
        className: 'btn btn--secondary',
        textContent: `Use Donor Part (${donorCount})`,
      });
      donorBtn.addEventListener('click', () => handleDonorReplace(selectedPartId, platform));
      actions.appendChild(donorBtn);
    }
  } else if (condition < 0.90) {
    const repairBtn = el('button', {
      className: 'btn btn--primary',
      textContent: 'Begin Repair',
    });
    if (!prereqsMet) {
      repairBtn.disabled = true;
    }
    repairBtn.addEventListener('click', () => {
      try { window.audioManager?.playClick(); } catch (_) {}
      handleBeginRepair(selectedPartId);
    });
    actions.appendChild(repairBtn);

    if (condition < 0.30) {
      const replaceCost = isBundle ? (partDef.bundleCost || 0) : (partDef.replaceCost || 0);
      const replaceBtn = el('button', {
        className: 'btn btn--secondary',
        textContent: `Replace — ${formatYen(replaceCost)}`,
      });
      replaceBtn.addEventListener('click', () => handleReplace(selectedPartId, replaceCost));
      actions.appendChild(replaceBtn);
    }
  }

  detail.appendChild(actions);

  // 6. Flavor text
  const flavorTexts = partDef.flavorText || [];
  if (flavorTexts.length > 0) {
    const randomFlavor = flavorTexts[Math.floor(Math.random() * flavorTexts.length)];
    detail.appendChild(el('div', {
      className: 'part-detail__flavor',
      style: 'margin-top:var(--space-base);',
      textContent: `"${randomFlavor}"`,
    }));
  }

  container.appendChild(detail);
}

// ══════════════════════════════════════════════════════════════
//  ACTION HANDLERS
// ══════════════════════════════════════════════════════════════

// ── Mechanic helpers ─────────────────────────────────────────

/**
 * Read the player's owned tools from state.
 * Returns an object with camelCase keys matching what each mechanic expects.
 */
function _getPlayerTools() {
  const { state } = getApp();
  const profile = state.getProfile();
  const raw = profile.tools || {};
  return {
    // Wrench
    impactWrench:      !!raw.impact_wrench,
    penetratingOil:    !!raw.penetrating_oil,
    // Precision
    torqueWrench:      !!raw.torque_wrench,
    angleGauge:        !!raw.angle_gauge,
    // Diagnosis
    multimeter:        !!raw.multimeter,
    compressionTester: !!raw.compression_tester,
    boostLeakTester:   !!raw.boost_leak_tester,
    // Bodywork
    daPolisher:        !!raw.da_polisher,
    mediaBlaster:      !!raw.media_blaster,
  };
}

/**
 * Read the player's current skill level for a given repair type.
 * Defaults to 1 if not present.
 */
function _getSkillLevel(repairType) {
  const { state } = getApp();
  const profile = state.getProfile();
  return profile.skills?.[repairType]?.level ?? 1;
}

/**
 * Safely tear down whatever mechanic is currently running in the mechanic area.
 * Calls the bodywork cleanup hook if present, then clears innerHTML.
 */
function _teardownMechanic(mechanicArea) {
  if (typeof mechanicArea._bwCleanup === 'function') {
    try { mechanicArea._bwCleanup(); } catch (_) {}
    delete mechanicArea._bwCleanup;
  }
  mechanicArea.innerHTML = '';
  mechanicArea.style.minHeight = '0';
}

/**
 * Find the diagnostic scenario in the part tree whose correctDiagnosis
 * matches the given partId. Returns null if none found.
 */
function _findDiagnosticScenario(partId) {
  const { partTree } = wb;
  if (!partTree || !Array.isArray(partTree.diagnosticScenarios)) return null;
  return partTree.diagnosticScenarios.find(s => s.correctDiagnosis === partId) ?? null;
}

/**
 * Build an enriched vehicleParts map for startDiagnosis() by overlaying
 * template data (name, replaceCost) onto the live part instance state.
 * This lets diagnosis.js show human-readable names and accurate yen penalties.
 */
function _enrichedVehicleParts() {
  const { instanceId, partTree } = wb;
  const { state } = getApp();
  const vehicle = state.getVehicle(instanceId);
  if (!vehicle) return {};

  const enriched = {};
  for (const [partId, instance] of Object.entries(vehicle.parts)) {
    const def = findPartDef(partTree, partId);
    enriched[partId] = {
      ...instance,
      name:        def?.name        ?? partId,
      replaceCost: def?.replaceCost ?? def?.bundleCost ?? 0,
    };
  }
  return enriched;
}

// ── Diagnosis completion handler ─────────────────────────────

/**
 * Handle the onComplete callback from startDiagnosis().
 * Shape: { correctPartId, wasCorrect, yenPenalty, xpEarned, logEntries, revealsScenario }
 */
function handleDiagnosisComplete(result, mechanicArea) {
  const { instanceId, partTree } = wb;
  const { state } = getApp();

  _teardownMechanic(mechanicArea);

  // Write log entries regardless of outcome
  if (result.logEntries?.length) {
    for (const entry of result.logEntries) {
      addLogEntry(instanceId, result.wasCorrect ? '✓' : '✗', entry);
    }
  }

  // Award XP to diagnosis skill
  if (result.xpEarned > 0) {
    const profile = state.getProfile();
    if (profile.skills?.diagnosis) {
      profile.skills.diagnosis.xp += result.xpEarned;
      while (profile.skills.diagnosis.level < 20) {
        const xpToNext = profile.skills.diagnosis.level * 100;
        if (profile.skills.diagnosis.xp < xpToNext) break;
        profile.skills.diagnosis.xp -= xpToNext;
        profile.skills.diagnosis.level++;
        showToast(`⬆ Diagnosis leveled up to Lv.${profile.skills.diagnosis.level}!`, 4000);
      }
      state.save();
    }
  }

  if (result.wasCorrect) {
    // Correct diagnosis: apply the repair to the identified part
    completeRepair(result.correctPartId, {
      // diagnosis itself doesn't compute newCondition; completeRepair fallback will apply +30–55%
      xpEarned: 0,   // already credited above
      logEntries: [],
    });
    showToast(`✓ Correct diagnosis! ${findPartName(partTree, result.correctPartId)} marked for repair.`, 4000);

    // If there's a chained second scenario, launch it after a short pause
    if (result.revealsScenario) {
      const nextScenario = partTree.diagnosticScenarios?.find(s => s.id === result.revealsScenario);
      if (nextScenario) {
        showToast('More damage uncovered — continue diagnosing.', 3000);
        setTimeout(() => _launchDiagnosis(nextScenario, mechanicArea), 1200);
      }
    }
  } else {
    // Wrong diagnosis: deduct yen penalty
    if (result.yenPenalty > 0) {
      state.updateCurrency('yen', -result.yenPenalty);
      refreshHeader();
      showToast(`✗ Wrong diagnosis. Wasted ${formatYen(result.yenPenalty)} on a part you didn't need.`, 4500);
    } else {
      showToast('✗ Wrong diagnosis. Keep looking.', 3000);
    }
    addLogEntry(instanceId, '✗', `Wrong diagnosis — ${formatYen(result.yenPenalty)} wasted.`);
    state.save();
  }

  refreshSystemList();
  refreshPartDetail();
  refreshRepairLog();
  refreshSkillBar();
  refreshHeader();
}

/**
 * Launch the diagnosis mechanic for a given scenario object.
 * Extracted so it can be called both from handleBeginRepair and
 * from the chained-scenario path in handleDiagnosisComplete.
 */
function _launchDiagnosis(scenario, mechanicArea) {
  const playerTools = _getPlayerTools();
  const skillLevel  = _getSkillLevel('diagnosis');
  const vehicleParts = _enrichedVehicleParts();

  startDiagnosis(
    scenario,
    vehicleParts,
    mechanicArea,
    (result) => handleDiagnosisComplete(result, mechanicArea),
    playerTools,
    skillLevel,
  );
}

// ── Main repair dispatcher ───────────────────────────────────

/**
 * Launch the correct mechanic for the selected part's repairType.
 * All four mechanics share the same onComplete shape:
 *   { newCondition, xpEarned, logEntries }
 * except Diagnosis which has its own handler.
 */
function handleBeginRepair(partId) {
  const { instanceId, partTree } = wb;
  const { state } = getApp();
  const partDef = findPartDef(partTree, partId);
  if (!partDef) return;

  const vehicle = state.getVehicle(instanceId);
  const partInstance = vehicle?.parts[partId];
  if (!partInstance) return;

  const repairType  = partDef.repairType || 'wrench';
  const mechanicArea = document.getElementById('wb-mechanic-area');
  if (!mechanicArea) return;

  // Tear down any currently-running mechanic first
  _teardownMechanic(mechanicArea);

  const playerTools = _getPlayerTools();
  const skillLevel  = _getSkillLevel(repairType);

  // Shared onComplete for wrench / precision / bodywork
  function onRepairComplete({ newCondition, xpEarned, logEntries }) {
    _teardownMechanic(mechanicArea);
    completeRepair(partId, { newCondition, xpEarned, logEntries });
  }

  switch (repairType) {

    case 'wrench':
      startWrenchWork(partDef, partInstance, mechanicArea, onRepairComplete);
      break;

    case 'precision':
      startPrecisionWork(
        partDef,
        partInstance,
        mechanicArea,
        onRepairComplete,
        playerTools,
        skillLevel,
      );
      break;

    case 'diagnosis': {
      const scenario = _findDiagnosticScenario(partId);
      if (!scenario) {
        showToast('No diagnostic scenario found for this part.', 3000);
        addLogEntry(instanceId, '⚠', `No scenario for ${partDef.name} — check part tree data.`);
        return;
      }
      _launchDiagnosis(scenario, mechanicArea);
      break;
    }

    case 'bodywork':
      startBodywork(
        partDef,
        partInstance,
        mechanicArea,
        onRepairComplete,
        playerTools,
        skillLevel,
      );
      break;

    default:
      showToast(`Unknown repair type: ${repairType}`);
      break;
  }
}

/**
 * Apply the result of a completed repair to game state and refresh the UI.
 * Called by both the wrench mechanic callback and the replace handlers.
 *
 * @param {string} partId
 * @param {object} overrides  - optional: { newCondition, xpEarned, logEntries }
 */
function completeRepair(partId, overrides = {}) {
  const { instanceId, partTree } = wb;
  const { state } = getApp();
  const vehicle = state.getVehicle(instanceId);
  const partDef = findPartDef(partTree, partId);
  if (!vehicle || !partDef) return;

  const partInstance = vehicle.parts[partId];
  if (!partInstance) return;

  // ── Apply condition ──
  const oldCondition = partInstance.condition || 0;
  const newCondition = overrides.newCondition != null
    ? overrides.newCondition
    : parseFloat(Math.min(1.0, oldCondition + 0.30 + Math.random() * 0.25).toFixed(2));

  state.updatePart(instanceId, partId, { condition: parseFloat(newCondition.toFixed(2)) });

  // ── Log entries ──
  if (overrides.logEntries && overrides.logEntries.length > 0) {
    for (const entry of overrides.logEntries) {
      addLogEntry(instanceId, '✓', entry);
    }
  } else {
    addLogEntry(instanceId, '✓', `Repaired ${partDef.name} (${Math.round(oldCondition * 100)}% → ${Math.round(newCondition * 100)}%)`);
  }

  // ── XP award ──
  // If wrench.js computed xpEarned (with combo multipliers), use it directly.
  // Otherwise fall back to the workbench's own awardXP calculation.
  if (overrides.xpEarned != null) {
    const profile = state.getProfile();
    const repairType = partDef.repairType || 'wrench';
    if (profile.skills?.[repairType]) {
      profile.skills[repairType].xp += overrides.xpEarned;
      // FIX: recalculate xpToNext on each iteration of the level-up loop
      while (profile.skills[repairType].level < 20) {
        const xpToNext = profile.skills[repairType].level * 100;
        if (profile.skills[repairType].xp < xpToNext) break;
        profile.skills[repairType].xp -= xpToNext;
        profile.skills[repairType].level++;
        showToast(`⬆ ${repairType.charAt(0).toUpperCase() + repairType.slice(1)} leveled up to Lv.${profile.skills[repairType].level}!`, 4000);
      }
    }
  } else {
    awardXP(partDef.repairType, partDef.difficulty || 0.5);
  }

  // ── Stats ──
  const profile = state.getProfile();
  profile.stats.totalRepairs = (profile.stats.totalRepairs || 0) + 1;
  state.save();

  // ── Side effects ──
  checkHiddenReveal(partId, 'repair');
  checkSystemCompletion(partId);

  // ── Clear selection if the selected part just became locked ──
  // Repairing partId may have changed conditions such that the currently
  // selected part now has unmet prerequisites and should be hidden.
  if (wb.selectedPartId && wb.selectedPartId !== partId) {
    const selectedDef = findPartDef(partTree, wb.selectedPartId);
    if (selectedDef) {
      const selectedPrereqs = selectedDef.prerequisites || [];
      if (selectedPrereqs.length > 0) {
        const stillUnmet = selectedPrereqs.some(pid => {
          const p = vehicle.parts[pid];
          return !p || p.condition === null || p.condition < 0.70;
        });
        if (stillUnmet) wb.selectedPartId = null;
      }
    }
  }

  // ── Refresh UI ──
  refreshSystemList();
  refreshPartDetail();
  refreshRepairLog();
  refreshSkillBar();
  refreshHeader();

  showToast(`${partDef.name} repaired!`);
}

function handleReplace(partId, cost) {
  const { instanceId, partTree } = wb;
  const { state } = getApp();
  const profile = state.getProfile();

  if (profile.currency.yen < cost) {
    showToast(`Not enough yen! Need ${formatYen(cost)}.`);
    return;
  }

  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal' });
  const partDef = findPartDef(partTree, partId);
  const partName = partDef ? partDef.name : partId;

  modal.innerHTML = `
    <div class="modal-header">
      <span class="modal-header__title">Replace Part</span>
      <button class="modal-header__close" data-action="close">×</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:12px;">Replace <strong>${escHtml(partName)}</strong>?</p>
      <p class="font-data" style="font-size:var(--font-size-sm);">Cost: <strong style="color:var(--rarity-5);">${formatYen(cost)}</strong></p>
      <p style="font-size:var(--font-size-xs); color:var(--text-muted); margin-top:8px;">Part will be set to 95% condition.</p>
    </div>
    <div class="modal-actions">
      <button class="btn btn--secondary" data-action="close">Cancel</button>
      <button class="btn btn--primary" data-action="replace">Replace</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (action === 'close' || e.target === overlay) {
      close();
    } else if (action === 'replace') {
      state.updateCurrency('yen', -cost);
      state.updatePart(instanceId, partId, { condition: 0.95 });
      addLogEntry(instanceId, '✓', `Replaced ${partName} (${formatYen(cost)})`);
      checkHiddenReveal(partId, 'remove');
      checkSystemCompletion(partId);
      close();
      refreshSystemList();
      refreshPartDetail();
      refreshRepairLog();
      refreshHeader();
      showToast(`${partName} replaced!`);
    }
  });
}

function handleDonorReplace(partId, platform) {
  const { instanceId, partTree } = wb;
  const { state } = getApp();
  const partDef = findPartDef(partTree, partId);
  const partName = partDef ? partDef.name : partId;

  state.updateCurrency(`donorParts.${platform}`, -1);
  state.updatePart(instanceId, partId, { condition: 0.95 });
  addLogEntry(instanceId, '✓', `Replaced ${partName} (Donor Part)`);
  checkHiddenReveal(partId, 'remove');
  checkSystemCompletion(partId);
  refreshSystemList();
  refreshPartDetail();
  refreshRepairLog();
  refreshHeader();
  showToast(`${partName} replaced with donor part!`);
}

// ── Hidden Part Reveal ───────────────────────────────────────

function checkHiddenReveal(partId, action) {
  const { instanceId, partTree } = wb;
  const { state } = getApp();
  const vehicle = state.getVehicle(instanceId);
  const partDef = findPartDef(partTree, partId);

  if (!partDef || partDef._isBundle || !partDef.hiddenReveal) return;

  const reveal = partDef.hiddenReveal;
  if (reveal.revealsOnAction !== action) return;

  const targetPartInstance = vehicle.parts[reveal.targetPartId];
  if (!targetPartInstance || targetPartInstance.revealed) return;

  if (Math.random() > reveal.chance) return;

  const randomCondition = parseFloat((0.05 + Math.random() * 0.40).toFixed(2));
  state.updatePart(instanceId, reveal.targetPartId, {
    condition: randomCondition,
    revealed: true,
  });

  const targetDef = findPartDef(partTree, reveal.targetPartId);
  const targetName = targetDef ? targetDef.name : reveal.targetPartId;

  addLogEntry(instanceId, '★', `Discovered: ${targetName} — ${reveal.flavorText}`);
  showToast(`★ Discovered: ${targetName}`, 4000);

  setTimeout(() => {
    refreshSystemList();
    refreshRepairLog();
  }, 100);
}

// ── System Completion Check ──────────────────────────────────

function checkSystemCompletion(partId) {
  const { instanceId, partTree } = wb;
  const { state } = getApp();
  const vehicle = state.getVehicle(instanceId);

  const system = findSystemForPart(partTree, partId);
  if (!system) return;

  const systemsMap = buildSystemPartsMap(partTree);
  const systemPartIds = systemsMap[system.id] || [];
  const completion = calcSystemCompletion(vehicle, systemPartIds);

  if (completion >= 1.0) {
    if (!vehicle.completedSystems) vehicle.completedSystems = {};
    if (vehicle.completedSystems[system.id]) return;

    vehicle.completedSystems[system.id] = true;

    const bonus = 200 + Math.floor(Math.random() * 300);
    state.updateCurrency('yen', bonus);
    state.save();

    addLogEntry(instanceId, '✅', `SYSTEM COMPLETE: ${system.name} — +${formatYen(bonus)} bonus!`);
    showToast(`✅ ${system.name} COMPLETE! +${formatYen(bonus)}`, 4000);

    // 🔊 Four-note ascending arpeggio reward
    try { window.audioManager?.play('system_complete'); } catch (_) { /* audio not yet ready */ }

    // Post to activity feed
    try {
      const { sync } = getApp();
      const profile = state.getProfile();
      if (sync && typeof sync.postToFeed === 'function') {
        sync.postToFeed({
          who: profile.profileId,
          what: 'completed_system',
          detail: `completed the ${system.name} on their ${partTree.displayName}`,
          when: Date.now(),
        });
      }
    } catch (e) {
      console.warn('Could not post system completion to feed:', e);
    }

    // Check for first start readiness
    const firstStartReady = state.isFirstStartReady(instanceId, systemsMap);
    const alreadyStarted = vehicle.firstStartDone;

    if (firstStartReady && !alreadyStarted) {
      setTimeout(() => {
        renderFirstStartOverlay(instanceId, partTree, vehicle);
      }, 1500);
    }
  }
}

// ── XP Award (fallback for non-wrench mechanics) ─────────────

function awardXP(repairType, difficulty) {
  const { state } = getApp();
  const profile = state.getProfile();
  if (!profile.skills || !profile.skills[repairType]) return;

  const baseXP = Math.round(10 + difficulty * 40);
  const skill = profile.skills[repairType];
  skill.xp += baseXP;

  // FIX: recalculate xpToNext per iteration
  while (skill.level < 20) {
    const xpToNext = skill.level * 100;
    if (skill.xp < xpToNext) break;
    skill.xp -= xpToNext;
    skill.level++;
    showToast(`⬆ ${repairType.charAt(0).toUpperCase() + repairType.slice(1)} leveled up to Lv.${skill.level}!`, 4000);
  }

  state.save();
}

// ══════════════════════════════════════════════════════════════
//  REPAIR LOG — render
// ══════════════════════════════════════════════════════════════

function renderRepairLog(container) {
  const { instanceId } = wb;
  const log = getRepairLog(instanceId);
  container.innerHTML = '';

  if (log.length === 0) {
    container.appendChild(el('div', {
      style: 'padding:var(--space-sm); color:var(--text-muted); font-style:italic;',
      textContent: 'No repair activity yet. Select a part to begin.',
    }));
    return;
  }

  for (const entry of log) {
    const isDiscovery = entry.icon === '★';
    const isComplete = entry.icon === '✅' || entry.icon === '✓';

    const row = el('div', {
      className: 'log-entry' + (isDiscovery ? ' log-entry--discovery' : '') + (isComplete ? ' log-entry--complete' : ''),
    });

    const time = new Date(entry.time);
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

    row.appendChild(el('span', { className: 'log-entry__time', textContent: timeStr }));
    row.appendChild(el('span', { textContent: entry.icon, style: 'flex-shrink:0;' }));
    row.appendChild(el('span', { className: 'log-entry__text', textContent: entry.text }));

    container.appendChild(row);
  }
}

// ══════════════════════════════════════════════════════════════
//  SKILL BAR — bottom of workbench
// ══════════════════════════════════════════════════════════════

function renderSkillBar(container) {
  const { state } = getApp();
  const profile = state.getProfile();
  const skills = profile.skills || {};

  container.innerHTML = '';

  const header = el('div', {
    style: `font-size:var(--font-size-xs); font-weight:600; text-transform:uppercase;
            letter-spacing:0.06em; color:var(--text-secondary); margin-bottom:var(--space-sm);`,
    textContent: 'SKILLS',
  });
  container.appendChild(header);

  const skillDefs = [
    { key: 'wrench',    label: 'Wrench',    cssClass: 'wrench' },
    { key: 'precision', label: 'Precision',  cssClass: 'precision' },
    { key: 'diagnosis', label: 'Diagnosis',  cssClass: 'diagnosis' },
    { key: 'bodywork',  label: 'Bodywork',   cssClass: 'bodywork' },
  ];

  const grid = el('div', {
    style: 'display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:var(--space-sm);',
  });

  for (const sd of skillDefs) {
    const skill = skills[sd.key] || { level: 1, xp: 0 };
    const xpToNext = skill.level * 100;
    const xpPct = Math.min(100, Math.round((skill.xp / xpToNext) * 100));

    const bar = el('div', { className: 'skill-bar' });

    bar.appendChild(el('span', {
      className: 'skill-bar__label',
      innerHTML: `${sd.label} <strong style="color:var(--text-primary);">Lv.${skill.level}</strong>`,
    }));

    const track = el('div', { className: 'skill-bar__track' });
    const fill = el('div', { className: `skill-bar__fill skill-bar__fill--${sd.cssClass}` });
    fill.style.setProperty('--fill-pct', `${xpPct}%`);
    track.appendChild(fill);
    bar.appendChild(track);

    grid.appendChild(bar);
  }

  container.appendChild(grid);
}

// ══════════════════════════════════════════════════════════════
//  FIRST START SEQUENCE
// ══════════════════════════════════════════════════════════════

function renderFirstStartOverlay(instanceId, partTree, vehicle) {
  const { state } = getApp();

  const existing = document.getElementById('first-start-overlay');
  if (existing) existing.remove();

  const overlay = el('div', {
    id: 'first-start-overlay',
    style: `position:fixed; inset:0; z-index:300; background:var(--bg-primary);
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            padding:var(--space-xl); text-align:center; animation:fadeIn 600ms ease;`,
  });

  const inner = el('div', { style: 'max-width:500px; width:100%;' });

  inner.appendChild(el('div', {
    style: `font-family:var(--font-data); font-size:var(--font-size-sm); letter-spacing:0.2em;
            color:var(--text-secondary); margin-bottom:var(--space-md);`,
    textContent: '══════════════════════════',
  }));
  inner.appendChild(el('div', {
    style: `font-size:var(--font-size-xl); font-weight:700; margin-bottom:var(--space-sm);
            color:var(--text-primary);`,
    textContent: 'READY FOR FIRST START',
  }));
  inner.appendChild(el('div', {
    style: `font-family:var(--font-data); font-size:var(--font-size-sm); letter-spacing:0.2em;
            color:var(--text-secondary); margin-bottom:var(--space-lg);`,
    textContent: '══════════════════════════',
  }));

  inner.appendChild(el('div', {
    style: 'color:var(--text-secondary); margin-bottom:var(--space-lg);',
    textContent: 'All critical systems are go.',
  }));

  const criticalSystems = ['Engine', 'Fuel', 'Cooling', 'Exhaust', 'Electrical', 'Drivetrain'];
  const checkGrid = el('div', {
    style: 'display:grid; grid-template-columns:repeat(3, 1fr); gap:var(--space-sm); margin-bottom:var(--space-xl);',
  });
  for (const sys of criticalSystems) {
    checkGrid.appendChild(el('span', {
      style: 'font-family:var(--font-data); font-size:var(--font-size-sm); color:var(--condition-good);',
      textContent: `✓ ${sys}`,
    }));
  }
  inner.appendChild(checkGrid);

  const keyBtn = el('button', {
    className: 'btn btn--primary btn--large',
    style: `width:100%; max-width:300px; margin:0 auto var(--space-lg);
            display:block; font-family:var(--font-data); letter-spacing:0.05em;`,
    textContent: 'TURN THE KEY',
  });

  const crankText = el('div', {
    style: 'font-family:var(--font-data); font-size:var(--font-size-sm); color:var(--text-muted); min-height:2em;',
    textContent: 'Hold to crank...',
  });

  let holdTimer = null;
  let crankPhase = 0;

  function onHoldStart() {
    crankPhase = 0;
    keyBtn.textContent = 'CRANKING...';
    keyBtn.style.background = 'var(--wrench-color)';

    holdTimer = setInterval(() => {
      crankPhase++;
      const dots = '.'.repeat((crankPhase % 3) + 1);
      crankText.textContent = `cranking${dots} cranking${dots} cranking${dots}`;

      if (crankPhase >= 6) {
        clearInterval(holdTimer);
        holdTimer = null;
        triggerFirstStart(overlay, inner, instanceId, partTree, vehicle);
      }
    }, 400);
  }

  function onHoldEnd() {
    if (holdTimer) {
      clearInterval(holdTimer);
      holdTimer = null;
      keyBtn.textContent = 'TURN THE KEY';
      keyBtn.style.background = '';
      crankText.textContent = 'Hold to crank...';
    }
  }

  keyBtn.addEventListener('mousedown', onHoldStart);
  keyBtn.addEventListener('mouseup', onHoldEnd);
  keyBtn.addEventListener('mouseleave', onHoldEnd);
  keyBtn.addEventListener('touchstart', (e) => { e.preventDefault(); onHoldStart(); });
  keyBtn.addEventListener('touchend', onHoldEnd);
  keyBtn.addEventListener('touchcancel', onHoldEnd);

  inner.appendChild(keyBtn);
  inner.appendChild(crankText);

  const skipBtn = el('button', {
    className: 'btn btn--ghost',
    style: 'margin-top:var(--space-xl);',
    textContent: '← Continue Working',
  });
  skipBtn.addEventListener('click', () => {
    overlay.remove();
    renderWorkbenchUI();
  });
  inner.appendChild(skipBtn);

  overlay.appendChild(inner);
  document.body.appendChild(overlay);
}

function triggerFirstStart(overlay, inner, instanceId, partTree, vehicle) {
  const { state } = getApp();

  vehicle.firstStartDone = true;
  vehicle.status = 'complete';
  state.save();

  // 🔊 The centrepiece moment — play the full crank → catch → idle sequence.
  // The synth's 2.1 s crank phase aligns naturally with the overlay transition,
  // and the idle rumble plays through the "SHE'S ALIVE" text reveal.
  try { window.audioManager?.play('engine_start'); } catch (_) { /* audio not yet ready */ }

  overlay.style.transition = 'background 1.5s ease';
  overlay.style.background = 'linear-gradient(180deg, #1a0a00 0%, #2d1800 50%, #0a0e1a 100%)';

  inner.innerHTML = '';

  const firstStartText = partTree.firstStartText ||
    "She catches. The engine settles into a steady idle. She's alive.";

  inner.appendChild(el('div', {
    style: `font-size:var(--font-size-xl); font-weight:700; color:var(--condition-good);
            margin-bottom:var(--space-lg); animation:fadeIn 800ms ease;`,
    textContent: "🔑 SHE'S ALIVE",
  }));

  inner.appendChild(el('div', {
    style: `font-size:var(--font-size-base); color:var(--text-primary); line-height:1.8;
            max-width:460px; margin:0 auto var(--space-xl); animation:fadeIn 1200ms ease;
            font-style:italic;`,
    textContent: firstStartText,
  }));

  inner.appendChild(el('div', {
    style: `font-family:var(--font-data); font-size:var(--font-size-sm); color:var(--rarity-5);
            margin-bottom:var(--space-xl); animation:fadeIn 1600ms ease;`,
    textContent: `${partTree.displayName} — First Start Complete`,
  }));

  spawnConfetti(60);

  // Post to activity feed
  try {
    const { sync } = getApp();
    const profile = state.getProfile();
    if (sync && typeof sync.postToFeed === 'function') {
      sync.postToFeed({
        who: profile.profileId,
        what: 'completed_car',
        detail: `started the ${partTree.displayName} for the first time!`,
        when: Date.now(),
      });
    }
  } catch (e) {
    console.warn('Could not post to feed:', e);
  }

  addLogEntry(instanceId, '🔑', `FIRST START! ${partTree.displayName} is alive!`);

  const btnRow = el('div', {
    style: 'display:flex; gap:var(--space-md); justify-content:center; flex-wrap:wrap; animation:fadeIn 2000ms ease;',
  });

  const continueBtn = el('button', {
    className: 'btn btn--primary btn--large',
    textContent: 'Continue to Workbench',
  });
  continueBtn.addEventListener('click', () => {
    overlay.remove();
    renderWorkbenchUI();
  });

  const garageBtn = el('button', {
    className: 'btn btn--secondary btn--large',
    textContent: '← Back to Garage',
  });
  garageBtn.addEventListener('click', () => {
    overlay.remove();
    navigate('#/garage');
  });

  btnRow.appendChild(continueBtn);
  btnRow.appendChild(garageBtn);
  inner.appendChild(btnRow);
}
