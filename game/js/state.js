// ════════════════════════════════════════════════════════════
//  state.js — Central game state manager (localStorage)
// ════════════════════════════════════════════════════════════

import { uid, generateArrivalCondition, deepClone } from './utils.js';

const LS_PREFIX = 'jdm_game_';

function defaultState(profileId) {
  return {
    profileId,
    lastModified: 0,
    currency: {
      yen: 1000,
      wrenchTokens: 20,
      donorParts: {}
    },
    garage: {
      vehicles: {}
    },
    skills: {
      wrench:    { level: 1, xp: 0 },
      precision: { level: 1, xp: 0 },
      diagnosis: { level: 1, xp: 0 },
      bodywork:  { level: 1, xp: 0 }
    },
    tools: {},
    gacha: {
      pity4: 0,
      pity5: 0,
      totalPulls: 0
    },
    stats: {
      carsCompleted: 0,
      totalRepairs: 0,
      totalYenEarned: 0
    }
  };
}

export class GameState {
  constructor() {
    this._state   = null;
    this._dirty   = false;
    this._profile = null;   // active profileId
  }

  // ── Profile lifecycle ───────────────────────────────────

  /**
   * Load (or create) a profile from localStorage.
   * Returns the state object.
   */
  load(profileId) {
    this._profile = profileId;
    const key  = LS_PREFIX + profileId;
    const raw  = localStorage.getItem(key);

    if (raw) {
      try {
        this._state = JSON.parse(raw);
      } catch {
        console.warn(`Corrupted save for ${profileId}, resetting`);
        this._state = defaultState(profileId);
      }
    } else {
      this._state = defaultState(profileId);
    }

    // Ensure profile id matches (guards against rename edge case)
    this._state.profileId = profileId;
    this.save();
    return this._state;
  }

  /** Write current state to localStorage, update lastModified, set dirty. */
  save() {
    if (!this._state || !this._profile) return;
    this._state.lastModified = Date.now();
    const key = LS_PREFIX + this._profile;
    localStorage.setItem(key, JSON.stringify(this._state));
    this._dirty = true;
  }

  getCurrentProfileId() {
    return this._profile;
  }

  getProfile() {
    return this._state;
  }

  getState() {
    return this._state;
  }

  /** Replace state entirely (used by sync conflict resolution). */
  setState(fullState) {
    this._state = fullState;
    this._profile = fullState.profileId;
    this.save();
  }

  // ── Dirty tracking ─────────────────────────────────────

  markDirty()  { this._dirty = true; }
  isDirty()    { return this._dirty; }
  clearDirty() { this._dirty = false; }

  // ── Currency helpers ───────────────────────────────────

  /**
   * Adjust a currency value.
   * type: 'yen' | 'wrenchTokens' | donorParts key (e.g. 'donorParts.fc3s')
   */
  updateCurrency(type, delta) {
    if (type === 'yen') {
      this._state.currency.yen = Math.max(0, this._state.currency.yen + delta);
    } else if (type === 'wrenchTokens') {
      this._state.currency.wrenchTokens = Math.max(0, this._state.currency.wrenchTokens + delta);
    } else if (type.startsWith('donorParts.')) {
      const platform = type.split('.')[1];
      if (!this._state.currency.donorParts[platform]) {
        this._state.currency.donorParts[platform] = 0;
      }
      this._state.currency.donorParts[platform] = Math.max(
        0,
        this._state.currency.donorParts[platform] + delta
      );
    }
    this.save();
  }

  // ── Vehicle / garage helpers ───────────────────────────

  getVehicle(instanceId) {
    return this._state.garage.vehicles[instanceId] || null;
  }

  /**
   * Add a pulled or starter vehicle to the garage.
   *
   * @param {object} vehicleTemplate — the part-tree JSON for this model
   * @param {number} rarity — 3, 4, or 5
   * @param {string} modelId — e.g. 'ae86'
   * @returns {string} the generated instance ID
   */
  addVehicle(vehicleTemplate, rarity, modelId) {
    const instanceId = uid();

    // Build part instance map from the template's systems
    const parts = {};

    // Collect every part across all systems
    const allParts = [];              // { partDef, isHidden }
    const hiddenPartIds = new Set();  // parts that start hidden

    // First pass: find all hidden target IDs
    if (vehicleTemplate.systems) {
      for (const system of vehicleTemplate.systems) {
        if (system.type === 'detailed' && system.subsystems) {
          for (const sub of system.subsystems) {
            if (sub.parts) {
              for (const p of sub.parts) {
                if (p.hiddenReveal && p.hiddenReveal.targetPartId) {
                  hiddenPartIds.add(p.hiddenReveal.targetPartId);
                }
              }
            }
          }
        }
      }
    }

    // Second pass: generate instance state per part
    if (vehicleTemplate.systems) {
      for (const system of vehicleTemplate.systems) {
        if (system.type === 'detailed' && system.subsystems) {
          for (const sub of system.subsystems) {
            if (sub.parts) {
              for (const p of sub.parts) {
                const isHidden = hiddenPartIds.has(p.id);
                parts[p.id] = {
                  condition:      isHidden ? null : generateArrivalCondition(rarity, p),
                  installed:      true,
                  revealed:       !isHidden,
                  repairProgress: 0
                };
              }
            }
          }
        }
        // Bundle systems get a single condition entry keyed by system id
        if (system.type === 'bundle') {
          parts[system.id] = {
            condition:      generateArrivalCondition(rarity, system),
            installed:      true,
            revealed:       true,
            repairProgress: 0
          };
        }
      }
    }

    this._state.garage.vehicles[instanceId] = {
      modelId,
      nickname:   '',
      acquiredAt: Date.now(),
      status:     'in_progress',
      parts
    };

    this.save();
    return instanceId;
  }

  /**
   * Merge partial changes into a part's instance state.
   * e.g. updatePart('abc123', 'ae86_valve_cover', { condition: 0.85 })
   */
  updatePart(instanceId, partId, changes) {
    const vehicle = this.getVehicle(instanceId);
    if (!vehicle || !vehicle.parts[partId]) return;
    Object.assign(vehicle.parts[partId], changes);
    this.save();
  }

  // ── Completion helpers ─────────────────────────────────

  /**
   * Calculate what % of a system's parts are at or above 0.70 condition.
   * Only counts revealed parts.
   */
  getSystemCompletion(instanceId, systemParts) {
    const vehicle = this.getVehicle(instanceId);
    if (!vehicle) return 0;

    let total = 0;
    let done  = 0;

    for (const partId of systemParts) {
      const p = vehicle.parts[partId];
      if (!p || !p.revealed) continue;
      total++;
      if (p.condition !== null && p.condition >= 0.70) done++;
    }

    return total === 0 ? 0 : done / total;
  }

  /**
   * Check if the 6 core driveable systems are all 100% complete:
   * engine, fuel, cooling, exhaust, electrical, drivetrain.
   *
   * Accepts a map of systemId → [partId, ...] for the vehicle template.
   */
  isFirstStartReady(instanceId, coreSystemsMap) {
    const requiredSystems = ['engine', 'fuel', 'cooling', 'exhaust', 'electrical', 'drivetrain'];
    for (const sysId of requiredSystems) {
      const parts = coreSystemsMap[sysId];
      if (!parts) return false;
      const completion = this.getSystemCompletion(instanceId, parts);
      if (completion < 1.0) return false;
    }
    return true;
  }
}
