// JDM RESTORATION GARAGE — Utils

window.Utils = (function () {

  function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60)          return "just now";
    if (diff < 3600)        return Math.floor(diff / 60) + " min ago";
    if (diff < 86400)       { const h = Math.floor(diff / 3600); return h + " hour" + (h > 1 ? "s" : "") + " ago"; }
    if (diff < 172800)      return "yesterday";
    return Math.floor(diff / 86400) + " days ago";
  }

  function formatCurrency(amount) {
    return "¥" + Number(amount || 0).toLocaleString();
  }

  function formatWT(amount) {
    return (amount || 0) + " WT";
  }

  return { timeAgo, formatCurrency, formatWT };
})();
