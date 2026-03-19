// JDM RESTORATION GARAGE — CLUSTER 02: State Manager (state.js)

window.GameState = (function () {
  let _profileId = null;
  let _data = null;
  let _dirty = false;


  function _generateDefault(profileId) {
    const now = Date.now();
    return {
      lastModified: now,
      currency: {
        sectionModified: now,
        yen: 1000,
        wrenchTokens: 20,
        donorParts: {}
      },
      garage: {
        sectionModified: now,
        vehicles: {}
      },
      skills: {
        sectionModified: now,
        wrench:    { level: 1, xp: 0 },
        precision: { level: 1, xp: 0 },
        diagnosis: { level: 1, xp: 0 },
        bodywork:  { level: 1, xp: 0 }
      },
      tools: {},
      gacha: { pity4: 0, pity5: 0, totalPulls: 0 },
      stats: {
        carsCompleted: 0,
        totalRepairs: 0,
        totalYenEarned: 0,
        lastDailyBonusDate: null
      }
    };
  }

  function _persist() {
    _data.lastModified = Date.now();
    localStorage.setItem("jdm_garage_" + _profileId, JSON.stringify(_data));
  }

  function _resolvePath(obj, parts, create) {
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (cur[key] === undefined || cur[key] === null || typeof cur[key] !== "object") {
        if (create) {
          cur[key] = {};
        } else {
          return undefined;
        }
      }
      cur = cur[key];
    }
    return cur;
  }


  function init(profileId) {
    _profileId = profileId;
    _dirty = false;
    const raw = localStorage.getItem("jdm_garage_" + profileId);
    if (raw) {
      try {
        _data = JSON.parse(raw);
        return true;
      } catch (e) {
        // fall through to default
      }
    }
    _data = _generateDefault(profileId);
    return false;
  }

  function get(path) {
    if (!_data || !path) return undefined;
    const parts = path.split(".");
    const parent = _resolvePath(_data, parts, false);
    if (parent === undefined) return undefined;
    return parent[parts[parts.length - 1]];
  }

  function set(path, value) {
    if (!_data || !path) return;
    const parts = path.split(".");
    const parent = _resolvePath(_data, parts, true);
    parent[parts[parts.length - 1]] = value;
    _persist();
    _markDirty();
  }

  function update(path, fn) {
    if (!_data || !path) return;
    const parts = path.split(".");
    const parent = _resolvePath(_data, parts, true);
    const key = parts[parts.length - 1];
    parent[key] = fn(parent[key]);
    _persist();
    _markDirty();
  }

  function getProfile() {
    return JSON.parse(JSON.stringify(_data));
  }

  function getProfileId() {
    return _profileId;
  }

  function setProfile(data) {
    _data = data;
    _persist(); // does NOT mark dirty — came from remote
  }

  function isDirty() {
    return _dirty;
  }

  function clearDirty() {
    _dirty = false;
  }

  function _markDirty() {
    _dirty = true;
  }

  function getLastModified() {
    return _data ? _data.lastModified : null;
  }

  return {
    init,
    get,
    set,
    update,
    getProfile,
    getProfileId,
    setProfile,
    isDirty,
    clearDirty,
    markDirty: _markDirty,
    getLastModified
  };
})();
