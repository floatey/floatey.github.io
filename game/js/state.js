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

  // ══════════════════════════════════════════════════════════
  //  SKILL XP MANAGEMENT
  // ══════════════════════════════════════════════════════════

  /**
   * XP needed to advance FROM level N to N+1.
   * Logarithmic curve ×1.5 per level:
   *   Lv 1→2:  100 XP
   *   Lv 2→3:  150 XP
   *   Lv 3→4:  225 XP
   *   …
   *   Lv 19→20: ~149,881 XP
   */
  _xpForLevel(n) {
    return Math.floor(100 * Math.pow(1.5, n - 1));
  }

  /** Returns the rank title for a given level. */
  _rankForLevel(level) {
    if (level <= 5)  return 'Apprentice';
    if (level <= 10) return 'Shade Tree';
    if (level <= 15) return 'Journeyman';
    return 'Master Tech';
  }

  /**
   * Add XP to a named skill. Handles multi-level-ups with XP overflow.
   * Caps at level 20. Saves state automatically.
   *
   * @param {string} skillName  - 'wrench' | 'precision' | 'diagnosis' | 'bodywork'
   * @param {number} amount     - XP to add (positive integer)
   * @returns {Array}           - Array of level-up objects: { skill, newLevel, newRank }
   *                             Empty array if no level-ups occurred.
   */
  addSkillXP(skillName, amount) {
    if (!this._state?.skills) return [];
    if (!this._state.skills[skillName]) return [];

    const skill    = this._state.skills[skillName];
    const levelUps = [];

    skill.xp = (skill.xp || 0) + Math.max(0, amount);

    while (skill.level < 20) {
      const needed = this._xpForLevel(skill.level);
      if (skill.xp < needed) break;
      skill.xp -= needed;
      skill.level++;
      levelUps.push({
        skill:    skillName,
        newLevel: skill.level,
        newRank:  this._rankForLevel(skill.level),
      });
    }

    // Hard-cap: at level 20 XP is frozen at 0
    if (skill.level >= 20) {
      skill.xp = 0;
    }

    this.save();
    return levelUps;
  }

  /**
   * Returns the current level for a skill (1–20).
   */
  getSkillLevel(skillName) {
    return this._state?.skills?.[skillName]?.level ?? 1;
  }

  /**
   * Returns XP progress toward the next level.
   * Shape: { current: number, needed: number, percent: number 0-100 }
   * At level 20 returns { current: 0, needed: 0, percent: 100 }.
   */
  getSkillXP(skillName) {
    const skill = this._state?.skills?.[skillName] ?? { level: 1, xp: 0 };
    if (skill.level >= 20) return { current: 0, needed: 0, percent: 100 };
    const needed  = this._xpForLevel(skill.level);
    const current = skill.xp || 0;
    const percent = Math.min(100, Math.round((current / needed) * 100));
    return { current, needed, percent };
  }

  /**
   * Returns the % efficiency bonus unlocked at the player's current skill level.
   *
   * Tier table (from GDD §6):
   *   Apprentice  (Lv  1-5):  +0%
   *   Shade Tree  (Lv  6-10): +10%
   *   Journeyman  (Lv 11-15): +20%
   *   Master Tech (Lv 16-20): +30%
   */
  getSkillBonus(skillName) {
    const level = this.getSkillLevel(skillName);
    if (level <= 5)  return 0;
    if (level <= 10) return 10;
    if (level <= 15) return 20;
    return 30;
  }

  // ── Tool helpers ───────────────────────────────────────

  /**
   * Returns true if the player owns a given tool (any truthy value in tools map).
   * Works for both permanent tools (stored as `true`) and consumables (stored as a count).
   */
  hasTool(toolId) {
    const t = this._state?.tools?.[toolId];
    if (t === undefined || t === false || t === null) return false;
    if (typeof t === 'number') return t > 0;
    return !!t;
  }

  /**
   * Returns the remaining charge count for a consumable tool.
   * For permanent (non-consumable) tools, returns Infinity.
   * Returns 0 if tool is not owned.
   */
  getToolCharges(toolId) {
    const t = this._state?.tools?.[toolId];
    if (t === undefined || t === false || t === null) return 0;
    if (typeof t === 'number') return t;
    if (typeof t === 'boolean' && t) return Infinity; // permanent tool
    if (typeof t === 'object' && typeof t.charges === 'number') return t.charges;
    return 0;
  }

  /**
   * Decrement one charge from a consumable tool.
   * No-ops on permanent tools (returns true without saving).
   * Returns false if tool not owned or out of charges.
   */
  useToolCharge(toolId) {
    if (!this._state?.tools) return false;
    const t = this._state.tools[toolId];

    if (t === true) return true; // permanent — never consumed

    if (typeof t === 'number') {
      if (t <= 0) return false;
      this._state.tools[toolId] = t - 1;
      this.save();
      return true;
    }

    if (typeof t === 'object' && t !== null && typeof t.charges === 'number') {
      if (t.charges <= 0) return false;
      t.charges--;
      this.save();
      return true;
    }

    return false;
  }
}
