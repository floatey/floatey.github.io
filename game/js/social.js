// ════════════════════════════════════════════════════════════
//  social.js — Activity Feed, Garage Visits, Daily Part Gift
// ════════════════════════════════════════════════════════════

import { getApp, navigate } from './main.js';

// ── Profile metadata ────────────────────────────────────────

const PROFILES = {
  nick:     { name: 'Nick',     color: '#b87fff', initials: 'NI' },
  tarro:    { name: 'Tarro',    color: '#ff5270', initials: 'TA' },
  nathan:   { name: 'Nathan',   color: '#4e9fff', initials: 'NA' },
  damian:   { name: 'Damian',   color: '#2ed09b', initials: 'DA' },
  harrison: { name: 'Harrison', color: '#fbbf24', initials: 'HA' },
};

// ── Event type icon map ─────────────────────────────────────

const EVENT_ICONS = {
  pulled_vehicle:   '🎰',
  completed_system: '⚡',
  completed_car:    '🏁',
  gifted_part:      '🎁',
  repair:           '🔧',
};

function iconForEvent(eventType) {
  return EVENT_ICONS[eventType] ?? '🔧';
}

// ── Relative time helper ────────────────────────────────────

function relativeTime(timestamp) {
  const diffMs  = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60)               return 'just now';
  if (diffSec < 3600)             return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400)            return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7)        return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// ── Countdown helper ────────────────────────────────────────

function countdownUntil(targetTs) {
  const diffMs  = Math.max(0, targetTs - Date.now());
  const h       = Math.floor(diffMs / 3_600_000);
  const m       = Math.floor((diffMs % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

// ════════════════════════════════════════════════════════════
//  postFeedEvent — write a feed entry via syncManager
// ════════════════════════════════════════════════════════════

/**
 * Post an event to the shared activity feed.
 *
 * @param {string} eventType  — e.g. 'pulled_vehicle', 'completed_system'
 * @param {string} detail     — human-readable display text
 */
export async function postFeedEvent(eventType, detail) {
  const { sync, state } = getApp();
  if (!sync || !state) return;

  const profileId = state.getCurrentProfileId();
  if (!profileId) return;

  const event = {
    who:    profileId,
    what:   eventType,
    detail,
    when:   Date.now(),
  };

  try {
    await sync.postToFeed(event);
  } catch (err) {
    console.warn('[Social] postFeedEvent failed:', err);
  }
}

// ════════════════════════════════════════════════════════════
//  renderFeed — render the activity feed into a DOM container
// ════════════════════════════════════════════════════════════

/**
 * Render the activity feed into `container`.
 * Adds a manual refresh button and handles offline state.
 *
 * @param {HTMLElement} container
 */
export async function renderFeed(container) {
  if (!container) return;

  container.innerHTML = '';

  // ── Header row ──────────────────────────────────────────
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-sm, 8px);';

  const title = document.createElement('h3');
  title.textContent = 'Activity Feed';
  title.style.cssText = 'margin: 0; font-size: var(--font-size-sm, 0.85rem); color: var(--text-secondary, #9ca0b8); text-transform: uppercase; letter-spacing: 0.08em;';

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'btn';
  refreshBtn.textContent = '↻ Refresh';
  refreshBtn.style.cssText = 'font-size: var(--font-size-xs, 0.75rem); padding: 2px 8px;';
  refreshBtn.addEventListener('click', () => renderFeed(container));

  header.append(title, refreshBtn);
  container.appendChild(header);

  // ── Feed list ────────────────────────────────────────────
  const list = document.createElement('ul');
  list.className = 'feed-list';
  container.appendChild(list);

  // ── Loading state ────────────────────────────────────────
  const loading = document.createElement('li');
  loading.style.cssText = 'color: var(--text-muted, #6b7080); font-size: var(--font-size-sm, 0.85rem); padding: var(--space-sm, 8px) 0; list-style: none;';
  loading.textContent = 'Loading feed…';
  list.appendChild(loading);

  const { sync } = getApp();

  // ── Offline guard ────────────────────────────────────────
  if (!sync || !window._firebase) {
    loading.textContent = 'Feed unavailable offline.';
    loading.style.color = 'var(--text-muted, #6b7080)';
    return;
  }

  // ── Fetch entries ────────────────────────────────────────
  let entries = [];
  try {
    entries = await sync.readFeed();
  } catch {
    loading.textContent = 'Feed unavailable offline.';
    return;
  }

  list.innerHTML = '';

  if (!entries.length) {
    const empty = document.createElement('li');
    empty.style.cssText = 'color: var(--text-muted, #6b7080); font-size: var(--font-size-sm, 0.85rem); padding: var(--space-sm, 8px) 0; list-style: none;';
    empty.textContent = 'No activity yet. Get wrenching!';
    list.appendChild(empty);
    return;
  }

  // ── Render entries (max 50, newest first) ────────────────
  const shown = entries.slice(0, 50);

  for (const entry of shown) {
    const profile = PROFILES[entry.who] ?? { name: entry.who ?? '?', color: '#555', initials: '??' };
    const icon    = iconForEvent(entry.what);

    const li = document.createElement('li');
    li.className = 'feed-entry';

    // Avatar circle
    const avatar = document.createElement('span');
    avatar.className = 'feed-avatar';
    avatar.textContent = profile.initials;
    avatar.style.cssText = `
      display: inline-flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem; border-radius: 50%;
      background: ${profile.color}22; border: 2px solid ${profile.color};
      color: ${profile.color}; font-size: 0.65rem; font-weight: 700;
      flex-shrink: 0;
    `;

    // Text block
    const textWrap = document.createElement('span');
    textWrap.className = 'feed-text';
    textWrap.style.cssText = 'flex: 1; min-width: 0;';

    const nameSpan = document.createElement('strong');
    nameSpan.style.color = profile.color;
    nameSpan.textContent = profile.name;

    const detailSpan = document.createElement('span');
    detailSpan.style.cssText = 'color: var(--text-primary, #cdd1e8);';
    detailSpan.textContent = ` ${icon} ${entry.detail ?? ''}`;

    textWrap.append(nameSpan, detailSpan);

    // Timestamp
    const timeSpan = document.createElement('span');
    timeSpan.className = 'feed-time';
    timeSpan.textContent = relativeTime(entry.when ?? 0);
    timeSpan.style.cssText = 'font-size: var(--font-size-xs, 0.72rem); color: var(--text-muted, #6b7080); white-space: nowrap; flex-shrink: 0;';

    li.style.cssText = 'display: flex; align-items: center; gap: var(--space-sm, 8px); padding: var(--space-sm, 8px) 0; border-bottom: 1px solid var(--border-subtle, #2a2d3e); list-style: none;';
    li.append(avatar, textWrap, timeSpan);
    list.appendChild(li);
  }
}

// ════════════════════════════════════════════════════════════
//  renderGiftModal — daily donor part gift UI
// ════════════════════════════════════════════════════════════

/**
 * Render (and show) the daily part gift modal.
 * Reads donor parts from state, writes pending gift to Firebase via sync.
 */
export function renderGiftModal() {
  const { state, sync } = getApp();
  if (!state) return;

  const profile    = state.getProfile();
  const profileId  = state.getCurrentProfileId();
  const donorParts = profile?.currency?.donorParts ?? {};

  // Remove existing modal if any
  const existing = document.getElementById('gift-modal-overlay');
  if (existing) existing.remove();

  // ── Overlay ──────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'gift-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position: fixed; inset: 0; z-index: 900; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7);';

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // ── Modal card ───────────────────────────────────────────
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = `
    background: var(--bg-card, #1a1d2e);
    border: 1px solid var(--border, #3a3f5c);
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 380px;
    width: 90%;
    color: var(--text-primary, #cdd1e8);
  `;

  // ── Header ───────────────────────────────────────────────
  const headerEl = document.createElement('div');
  headerEl.className = 'modal-header';
  headerEl.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;';

  const titleEl = document.createElement('h2');
  titleEl.textContent = '🎁 Send a Donor Part';
  titleEl.style.cssText = 'margin: 0; font-size: 1.1rem; color: var(--text-primary, #cdd1e8);';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn';
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'font-size: 1rem; padding: 2px 8px; background: transparent; border: none; cursor: pointer; color: var(--text-muted, #6b7080);';
  closeBtn.addEventListener('click', () => overlay.remove());

  headerEl.append(titleEl, closeBtn);

  // ── Body ─────────────────────────────────────────────────
  const bodyEl = document.createElement('div');
  bodyEl.className = 'modal-body';
  bodyEl.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';

  // ── Cooldown check ───────────────────────────────────────
  const lastGift     = profile?.lastGiftSent ?? 0;
  const cooldownMs   = 24 * 60 * 60 * 1000;
  const nextGiftAt   = lastGift + cooldownMs;
  const onCooldown   = lastGift > 0 && Date.now() < nextGiftAt;

  if (onCooldown) {
    const countdownEl = document.createElement('p');
    countdownEl.style.cssText = 'margin: 0; color: var(--text-secondary, #9ca0b8); font-size: 0.9rem; text-align: center; padding: 1rem 0;';
    countdownEl.textContent = `⏱ Next gift available in: ${countdownUntil(nextGiftAt)}`;

    // Live countdown update
    const ticker = setInterval(() => {
      if (Date.now() >= nextGiftAt) {
        clearInterval(ticker);
        renderGiftModal(); // re-render with controls available
        return;
      }
      countdownEl.textContent = `⏱ Next gift available in: ${countdownUntil(nextGiftAt)}`;
    }, 30_000);

    bodyEl.appendChild(countdownEl);
    modal.append(headerEl, bodyEl);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    return;
  }

  // ── No donor parts? ──────────────────────────────────────
  const availablePlatforms = Object.entries(donorParts).filter(([, qty]) => qty > 0);

  if (!availablePlatforms.length) {
    const noneEl = document.createElement('p');
    noneEl.style.cssText = 'margin: 0; color: var(--text-secondary, #9ca0b8); font-size: 0.9rem; text-align: center; padding: 1rem 0;';
    noneEl.textContent = "You don't have any Donor Parts to send yet.";
    bodyEl.appendChild(noneEl);
    modal.append(headerEl, bodyEl);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    return;
  }

  // ── Part select ──────────────────────────────────────────
  const partLabel = document.createElement('label');
  partLabel.style.cssText = 'font-size: 0.85rem; color: var(--text-secondary, #9ca0b8);';
  partLabel.textContent = 'Which Donor Part?';

  const partSelect = document.createElement('select');
  partSelect.style.cssText = `
    width: 100%; padding: 0.5rem 0.75rem;
    background: var(--bg-input, #12141f); border: 1px solid var(--border, #3a3f5c);
    border-radius: 8px; color: var(--text-primary, #cdd1e8); font-size: 0.9rem;
  `;

  for (const [platform, qty] of availablePlatforms) {
    const opt = document.createElement('option');
    opt.value = platform;
    opt.textContent = `${platformLabel(platform)} Donor Part (×${qty})`;
    partSelect.appendChild(opt);
  }

  // ── Recipient select ─────────────────────────────────────
  const recipLabel = document.createElement('label');
  recipLabel.style.cssText = 'font-size: 0.85rem; color: var(--text-secondary, #9ca0b8);';
  recipLabel.textContent = 'Send to:';

  const recipSelect = document.createElement('select');
  recipSelect.style.cssText = partSelect.style.cssText;

  for (const [id, meta] of Object.entries(PROFILES)) {
    if (id === profileId) continue;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = meta.name;
    recipSelect.appendChild(opt);
  }

  // ── Status feedback ──────────────────────────────────────
  const statusEl = document.createElement('p');
  statusEl.style.cssText = 'margin: 0; min-height: 1.2em; font-size: 0.85rem; color: var(--text-muted, #6b7080);';

  // ── Actions ──────────────────────────────────────────────
  const actionsEl = document.createElement('div');
  actionsEl.className = 'modal-actions';
  actionsEl.style.cssText = 'display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const sendBtn = document.createElement('button');
  sendBtn.className = 'btn btn--primary';
  sendBtn.textContent = 'Send Gift';
  sendBtn.addEventListener('click', async () => {
    const partType  = partSelect.value;
    const recipient = recipSelect.value;

    if (!partType || !recipient) return;

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';
    statusEl.textContent = '';

    try {
      await sendDonorGift(profileId, recipient, partType, state, sync);
      statusEl.style.color = 'var(--color-success, #2ed09b)';
      statusEl.textContent = `✓ Sent 1 ${platformLabel(partType)} Donor Part to ${PROFILES[recipient]?.name ?? recipient}!`;
      sendBtn.textContent = 'Sent!';

      // Post to feed
      await postFeedEvent(
        'gifted_part',
        `Sent a ${platformLabel(partType)} Donor Part to ${PROFILES[recipient]?.name ?? recipient}`
      );

      // Auto-close after brief success display
      setTimeout(() => overlay.remove(), 1800);
    } catch (err) {
      console.error('[Social] sendDonorGift failed:', err);
      statusEl.style.color = 'var(--color-danger, #ff5270)';
      statusEl.textContent = 'Failed to send. Try again.';
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Gift';
    }
  });

  actionsEl.append(cancelBtn, sendBtn);
  bodyEl.append(partLabel, partSelect, recipLabel, recipSelect, statusEl);
  modal.append(headerEl, bodyEl, actionsEl);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ── Internal: write gift to Firebase and deduct from sender ─

async function sendDonorGift(senderId, recipientId, partType, state, sync) {
  if (!sync || !window._firebase) throw new Error('Offline');

  // Deduct from sender's inventory
  state.updateCurrency(`donorParts.${partType}`, -1);

  // Record last gift timestamp to enforce cooldown
  const profile = state.getProfile();
  profile.lastGiftSent = Date.now();
  state.save();
  if (sync.write) sync.write();

  // Write pending gift node for recipient
  const { getDatabase, ref, push, set } =
    await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js');

  const db       = window._firebase.db;
  const giftPath = `tmcc-game/profiles/${recipientId}/pendingGifts`;
  const giftRef  = push(ref(db, giftPath));

  await set(giftRef, {
    from:     senderId,
    partType,
    amount:   1,
    when:     Date.now(),
  });
}

// ════════════════════════════════════════════════════════════
//  checkPendingGifts — consume gifts on profile load
// ════════════════════════════════════════════════════════════

/**
 * Check for and consume any pending gifts for the current profile.
 * Call this from the profile selection / load flow.
 *
 * Shows an in-game notification for each gift received.
 */
export async function checkPendingGifts() {
  const { state, sync } = getApp();
  if (!state || !sync || !window._firebase) return;

  const profileId = state.getCurrentProfileId();
  if (!profileId) return;

  const { getDatabase, ref, get, remove } =
    await import('https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js');

  const db       = window._firebase.db;
  const giftsRef = ref(db, `tmcc-game/profiles/${profileId}/pendingGifts`);

  let snapshot;
  try {
    snapshot = await get(giftsRef);
  } catch (err) {
    console.warn('[Social] checkPendingGifts read failed:', err);
    return;
  }

  if (!snapshot.exists()) return;

  const gifts = snapshot.val();

  for (const [pushId, gift] of Object.entries(gifts)) {
    try {
      // Add donor part to state
      state.updateCurrency(`donorParts.${gift.partType}`, gift.amount ?? 1);

      // Delete the consumed gift node
      const entryRef = ref(db, `tmcc-game/profiles/${profileId}/pendingGifts/${pushId}`);
      await remove(entryRef);

      // Show notification
      const senderName = PROFILES[gift.from]?.name ?? gift.from ?? 'Someone';
      showGiftNotification(
        `🎁 Received ${gift.amount ?? 1} ${platformLabel(gift.partType)} Donor Part from ${senderName}!`
      );
    } catch (err) {
      console.warn('[Social] Failed to consume gift:', pushId, err);
    }
  }
}

// ── Gift notification banner ─────────────────────────────────

function showGiftNotification(message) {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
    z-index: 950;
    background: var(--bg-card, #1a1d2e);
    border: 1px solid var(--rarity-4, #4e9fff);
    border-radius: 10px;
    padding: 0.75rem 1.25rem;
    color: var(--text-primary, #cdd1e8);
    font-size: 0.9rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    max-width: 90vw;
    text-align: center;
    animation: social-notif-in 0.3s ease;
  `;
  notif.textContent = message;

  // CSS keyframes (injected once)
  if (!document.getElementById('social-notif-style')) {
    const style = document.createElement('style');
    style.id = 'social-notif-style';
    style.textContent = `
      @keyframes social-notif-in {
        from { opacity: 0; transform: translateX(-50%) translateY(12px); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.transition = 'opacity 0.4s';
    notif.style.opacity = '0';
    setTimeout(() => notif.remove(), 400);
  }, 4000);
}

// ════════════════════════════════════════════════════════════
//  renderVisit — read-only garage view for another player
// ════════════════════════════════════════════════════════════

/**
 * Fetch a remote profile and render a read-only garage view.
 * Renders into `document.getElementById('game-root')`.
 *
 * @param {string} profileId — the profile to visit
 */
export async function renderVisit(profileId) {
  const root = document.getElementById('game-root');
  if (!root) return;

  const meta = PROFILES[profileId];
  const name = meta?.name ?? profileId;

  root.innerHTML = '';

  // ── Loading state ────────────────────────────────────────
  const loadingEl = document.createElement('div');
  loadingEl.style.cssText = 'text-align: center; padding: 3rem 1rem; color: var(--text-muted, #6b7080);';
  loadingEl.textContent = `Loading ${name}'s garage…`;
  root.appendChild(loadingEl);

  const { sync } = getApp();

  // ── Offline guard ────────────────────────────────────────
  if (!sync || !window._firebase) {
    loadingEl.textContent = `Could not load ${name}'s garage. You appear to be offline.`;
    return;
  }

  let remoteProfile = null;
  try {
    remoteProfile = await sync.readProfile(profileId);
  } catch {
    // fall through — will show error state
  }

  root.innerHTML = '';

  // ── Could not load ───────────────────────────────────────
  if (!remoteProfile) {
    const errorEl = document.createElement('div');
    errorEl.style.cssText = 'text-align: center; padding: 3rem 1rem; color: var(--text-secondary, #9ca0b8);';
    errorEl.textContent = `Could not load ${name}'s garage. They might not have started yet.`;
    root.appendChild(errorEl);
    return;
  }

  // ── Visit header ─────────────────────────────────────────
  const visitHeader = document.createElement('div');
  visitHeader.style.cssText = `
    display: flex; align-items: center; gap: var(--space-md, 12px);
    padding: var(--space-md, 12px) var(--space-lg, 20px);
    border-bottom: 1px solid var(--border, #3a3f5c);
    background: var(--bg-card, #1a1d2e);
    margin-bottom: var(--space-md, 12px);
  `;

  const visitAvatar = document.createElement('span');
  visitAvatar.textContent = meta?.initials ?? name.slice(0, 2).toUpperCase();
  visitAvatar.style.cssText = `
    display: inline-flex; align-items: center; justify-content: center;
    width: 2.5rem; height: 2.5rem; border-radius: 50%;
    background: ${meta?.color ?? '#555'}22;
    border: 2px solid ${meta?.color ?? '#555'};
    color: ${meta?.color ?? '#555'};
    font-size: 0.75rem; font-weight: 700;
    flex-shrink: 0;
  `;

  const visitTitleEl = document.createElement('div');
  visitTitleEl.innerHTML = `
    <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary, #cdd1e8);">
      ${name}'s Garage <span style="font-size:0.75rem; font-weight:400; color:var(--text-muted,#6b7080); margin-left:0.4rem;">— Read Only</span>
    </div>
    <div style="font-size: 0.8rem; color: var(--text-muted,#6b7080); margin-top: 2px;">
      Last active: ${remoteProfile.lastModified ? relativeTime(remoteProfile.lastModified) : 'Unknown'}
    </div>
  `;

  visitHeader.append(visitAvatar, visitTitleEl);
  root.appendChild(visitHeader);

  // ── Delegate to garage.js visit renderer if available ────
  try {
    const { renderGarageVisit } = await import('./garage.js');
    if (typeof renderGarageVisit === 'function') {
      renderGarageVisit(remoteProfile, root);
      return;
    }
  } catch {
    // garage.js may not export renderGarageVisit yet — fall back to inline renderer
  }

  // ── Inline fallback: vehicle list ────────────────────────
  const vehicles = remoteProfile?.garage?.vehicles ?? {};
  const vehicleEntries = Object.entries(vehicles);

  if (!vehicleEntries.length) {
    const emptyEl = document.createElement('div');
    emptyEl.style.cssText = 'text-align: center; padding: 2rem 1rem; color: var(--text-muted, #6b7080);';
    emptyEl.textContent = `${name}'s garage is empty — no vehicles yet.`;
    root.appendChild(emptyEl);
    return;
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-md, 12px); padding: var(--space-md, 12px) var(--space-lg, 20px);';

  for (const [, vehicle] of vehicleEntries) {
    const card = document.createElement('div');
    card.style.cssText = `
      background: var(--bg-card, #1a1d2e);
      border: 1px solid var(--border, #3a3f5c);
      border-radius: 10px;
      padding: 1rem;
    `;

    // Part completion summary
    const parts      = vehicle.parts ?? {};
    const allParts   = Object.values(parts);
    const revealed   = allParts.filter(p => p.revealed);
    const completed  = revealed.filter(p => p.condition !== null && p.condition >= 0.70);
    const pct        = revealed.length ? Math.round((completed.length / revealed.length) * 100) : 0;

    const statusColors = { complete: '#2ed09b', showcase: '#b87fff', in_progress: '#fbbf24' };
    const statusColor  = statusColors[vehicle.status] ?? '#9ca0b8';

    card.innerHTML = `
      <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary, #cdd1e8); margin-bottom: 4px;">
        ${vehicle.nickname || vehicle.modelId?.toUpperCase() || 'Unknown'}
      </div>
      <div style="font-size: 0.78rem; color: var(--text-muted, #6b7080); margin-bottom: 8px;">
        ${vehicle.modelId ? `Model: ${vehicle.modelId}` : ''}
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="flex: 1; height: 6px; background: var(--bg-base, #0f111a); border-radius: 3px; overflow: hidden;">
          <div style="height: 100%; width: ${pct}%; background: ${statusColor}; border-radius: 3px; transition: width 0.4s;"></div>
        </div>
        <span style="font-size: 0.78rem; color: ${statusColor}; font-weight: 600;">${pct}%</span>
      </div>
      <div style="margin-top: 6px; font-size: 0.75rem; color: ${statusColor}; text-transform: uppercase; letter-spacing: 0.06em;">
        ${vehicle.status?.replace('_', ' ') ?? 'unknown'}
      </div>
    `;

    grid.appendChild(card);
  }

  root.appendChild(grid);
}

// ════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════

/**
 * Human-readable platform/chassis label from a donor part key.
 * e.g. 'fc3s' → 'FC3S'  |  'ae86' → 'AE86'
 */
function platformLabel(key) {
  // Common acronym overrides
  const LABELS = {
    fc3s: 'FC3S', fd3s: 'FD3S', ae86: 'AE86', crx: 'CRX',
    s13: 'S13',   dc2: 'DC2',   aw11: 'AW11', z31: 'Z31',
    sti: 'WRX STI', jza80: 'Supra', bnr34: 'GT-R', egsx: '2G Eclipse',
  };
  return LABELS[key] ?? key.toUpperCase();
}
