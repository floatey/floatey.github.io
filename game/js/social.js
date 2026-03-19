// JDM RESTORATION GARAGE — Social Features

window.SocialFeatures = (function () {

  function renderFeed(container, limit) {
    limit = limit || 20;
    container.innerHTML = "<p style='color:#888;font-size:0.9rem'>Loading feed...</p>";

    firebase.database().ref("tmcc-game/feed/")
      .orderByChild("timestamp")
      .limitToLast(limit)
      .once("value")
      .then(function (snap) {
        const entries = [];
        snap.forEach(function (child) { entries.push(child.val()); });
        entries.reverse(); // newest first

        if (!entries.length) {
          container.innerHTML = "<p style='color:#888;font-size:0.9rem'>No recent activity</p>";
          return;
        }

        const html = entries.map(function (e) {
          const time = e.timestamp ? Utils.timeAgo(e.timestamp) : "";
          return "<div class='feed-entry'>"
            + "<span class='feed-text'>" + _esc(e.name || "") + " " + _esc(e.detail || "") + "</span>"
            + (time ? "<span class='feed-time'> — " + time + "</span>" : "")
            + "</div>";
        }).join("");

        container.innerHTML = html;
      })
      .catch(function () {
        container.innerHTML = "<p style='color:#888;font-size:0.9rem'>Feed unavailable offline</p>";
      });
  }

  function _esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  return { renderFeed };
})();
