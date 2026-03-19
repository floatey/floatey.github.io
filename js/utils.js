// ════════════════════════════════════════════════════════════
//  utils.js — Shared pure utility functions
// ════════════════════════════════════════════════════════════

/** Random 8-character alphanumeric ID */
export function uid() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/** Clamp a number between min and max */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Random float in [min, max) */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/** Random integer in [min, max] (inclusive) */
export function randomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from an array */
export function pickRandom(array) {
  if (!array || array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Weighted random selection.
 * @param {Array<{value: *, weight: number}>} items
 * @returns {*} the selected value
 */
export function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

/** Format a number as ¥1,234 */
export function formatYen(amount) {
  return '¥' + Math.floor(amount).toLocaleString('en-US');
}

/**
 * Return a condition display object { label, color, cssClass }
 * per GDD Section 4 thresholds.
 */
export function formatCondition(value) {
  if (value === null || value === undefined) {
    return { label: 'UNKNOWN', color: '#666', cssClass: 'cond-unknown' };
  }
  const info = _conditionTier(value);
  return info;
}

/** Simple label string for a condition value */
export function conditionLabel(value) {
  if (value === null || value === undefined) return 'UNKNOWN';
  return _conditionTier(value).label;
}

function _conditionTier(v) {
  if (v <= 0.10) return { label: 'DESTROYED',  color: '#ef4444', cssClass: 'cond-destroyed' };
  if (v <= 0.30) return { label: 'CRITICAL',   color: '#f97316', cssClass: 'cond-critical'  };
  if (v <= 0.50) return { label: 'POOR',       color: '#eab308', cssClass: 'cond-poor'      };
  if (v <= 0.70) return { label: 'FAIR',        color: '#84cc16', cssClass: 'cond-fair'      };
  if (v <= 0.89) return { label: 'GOOD',        color: '#22c55e', cssClass: 'cond-good'      };
  return              { label: 'EXCELLENT',   color: '#10b981', cssClass: 'cond-excellent' };
}

/**
 * Relative time string. "just now", "2 minutes ago", etc.
 * @param {number} timestamp — ms epoch
 */
export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10)   return 'just now';
  if (seconds < 60)   return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)   return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)     return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30)      return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Standard debounce */
export function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/** Standard throttle (leading-edge) */
export function throttle(fn, ms) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * Arrival condition generator — copied verbatim from GDD Section 4.
 *
 * @param {number} vehicleRarity — 3, 4, or 5
 * @param {object} part — the part definition (unused by algorithm, kept for future extension)
 * @returns {number} condition 0.01–0.95, two decimals
 */
export function generateArrivalCondition(vehicleRarity, part) {
  const ranges = { 3: [0.20, 0.45], 4: [0.10, 0.35], 5: [0.05, 0.25] };
  const [min, max] = ranges[vehicleRarity] || ranges[3];

  // Base roll within rarity range
  let condition = min + Math.random() * (max - min);

  // Per-system variance: each system shifts ±15%
  const systemShift = (Math.random() - 0.5) * 0.30;
  condition = Math.max(0.01, Math.min(0.60, condition + systemShift));

  // Some parts are lucky (VR positive surprise)
  if (Math.random() < 0.08) {
    condition = 0.70 + Math.random() * 0.25; // "This one's actually fine"
  }

  return parseFloat(condition.toFixed(2));
}

/** JSON-based deep clone */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Linear interpolation */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
