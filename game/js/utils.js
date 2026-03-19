// JDM RESTORATION GARAGE — Utils

window.Utils = (function () {

  // ── Part-tree fetch cache ────────────────────────────────────────
  var _partTreeCache = {};

  // ── Time / Format ────────────────────────────────────────────────

  function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60)     return "just now";
    if (diff < 3600)   return Math.floor(diff / 60) + " min ago";
    if (diff < 86400)  { const h = Math.floor(diff / 3600); return h + " hour" + (h > 1 ? "s" : "") + " ago"; }
    if (diff < 172800) return "yesterday";
    return Math.floor(diff / 86400) + " days ago";
  }

  function formatCurrency(amount) {
    return "¥" + Number(amount || 0).toLocaleString();
  }

  function formatWT(amount) {
    return (amount || 0) + " WT";
  }

  // ── Condition ────────────────────────────────────────────────────

  function getConditionLabel(condition) {
    if (condition === null || condition === undefined) return { label: "UNKNOWN", cssClass: "condition-critical" };
    if (condition <= 0.10) return { label: "DESTROYED", cssClass: "condition-destroyed" };
    if (condition <= 0.30) return { label: "CRITICAL",  cssClass: "condition-critical"  };
    if (condition <= 0.50) return { label: "POOR",      cssClass: "condition-poor"      };
    if (condition <= 0.70) return { label: "FAIR",      cssClass: "condition-fair"      };
    if (condition <= 0.89) return { label: "GOOD",      cssClass: "condition-good"      };
    return                        { label: "EXCELLENT", cssClass: "condition-excellent"  };
  }

  // ── Arrival Condition Generator ──────────────────────────────────

  function generateArrivalCondition(vehicleRarity) {
    const ranges = { 3: [0.20, 0.45], 4: [0.10, 0.35], 5: [0.05, 0.25] };
    const [min, max] = ranges[vehicleRarity] || [0.20, 0.45];
    let condition = min + Math.random() * (max - min);
    const systemShift = (Math.random() - 0.5) * 0.30;
    condition = Math.max(0.01, Math.min(0.60, condition + systemShift));
    if (Math.random() < 0.08) condition = 0.70 + Math.random() * 0.25; // lucky part
    return parseFloat(condition.toFixed(2));
  }

  // ── Dot Renderer ─────────────────────────────────────────────────

  function renderDots(filled, total) {
    let html = "";
    for (let i = 0; i < total; i++) {
      if (i < filled) {
        html += "<span class='dot dot-filled'>●</span>";
      } else {
        html += "<span class='dot dot-empty'>○</span>";
      }
    }
    return html;
  }

  // ── Completion Calculators ───────────────────────────────────────

  /**
   * @param {string[]} partIds        - IDs of revealed parts in this system
   * @param {Object}   partInstances  - map of partId → { condition, revealed }
   * @returns {{ completed: number, total: number, pct: number, filledDots: number }}
   */
  function calculateSystemCompletion(partIds, partInstances) {
    let total     = 0;
    let completed = 0;
    (partIds || []).forEach(function (partId) {
      const inst = partInstances[partId];
      if (!inst || !inst.revealed) return;
      total++;
      if (inst.condition !== null && inst.condition >= 0.70) completed++;
    });
    const pct        = total > 0 ? Math.round((completed / total) * 100) : 0;
    const filledDots = Math.round((completed / Math.max(total, 1)) * 5);
    return { completed, total, pct, filledDots };
  }

  /**
   * @param {Object} vehicleInstance  - { parts: { partId: { condition, revealed } } }
   * @returns {number} 0-100
   */
  function calculateOverallCompletion(vehicleInstance) {
    const parts = vehicleInstance.parts || {};
    let total     = 0;
    let completed = 0;
    Object.values(parts).forEach(function (inst) {
      if (!inst.revealed) return;
      total++;
      if (inst.condition !== null && inst.condition >= 0.70) completed++;
    });
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  // ── Part Tree Loader (with cache) ────────────────────────────────

  function loadPartTree(modelId) {
    if (_partTreeCache[modelId]) {
      return Promise.resolve(_partTreeCache[modelId]);
    }
    return fetch("data/parts/" + modelId + ".json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " fetching " + modelId + ".json");
        return res.json();
      })
      .then(function (json) {
        _partTreeCache[modelId] = json;
        return json;
      });
  }

  return {
    timeAgo,
    formatCurrency,
    formatWT,
    getConditionLabel,
    generateArrivalCondition,
    renderDots,
    calculateSystemCompletion,
    calculateOverallCompletion,
    loadPartTree
  };
})();
