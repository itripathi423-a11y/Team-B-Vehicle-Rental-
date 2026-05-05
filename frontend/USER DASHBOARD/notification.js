(function () {
  "use strict";

  const API = "/api/user/notifications";
  const PER_PAGE = 15;

  let offset = 0;
  let totalNotifs = 0;
  let unreadCount = 0;
  let panelOpen = false;
  let socket = null;

  const wrap = document.getElementById("notifWrap");
  const btn = document.getElementById("notifBtn");
  const panel = document.getElementById("notifPanel");
  const list = document.getElementById("npList");
  const dot = document.getElementById("notifDot");
  const countBadge = document.getElementById("notifCount");
  const markAllBtn = document.getElementById("npMarkAll");
  const loadMoreBtn = document.getElementById("npLoadMore");
  const foot = document.getElementById("npFoot");

  if (!wrap) return;

  function waitForUserId(cb, attempts = 0) {
    if (window._userId) return cb(window._userId);
    if (attempts > 60) {
      console.warn("[Notif] No _userId found");
      return;
    }
    setTimeout(() => waitForUserId(cb, attempts + 1), 100);
  }

  const TYPE_ICON = {
    booking: "🚗",
    kyc: "🛡️",
    reminder: "⏰",
    service: "🔧",
    general: "🔔",
  };
  function typeIcon(t) {
    return TYPE_ICON[t] || "🔔";
  }

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setBadge(n) {
    unreadCount = Math.max(0, n);
    if (unreadCount > 0) {
      dot.style.display = "block";
      countBadge.style.display = "flex";
      countBadge.textContent = unreadCount > 99 ? "99+" : unreadCount;
    } else {
      dot.style.display = "none";
      countBadge.style.display = "none";
    }
  }
  function incBadge() {
    setBadge(unreadCount + 1);
  }
  function decBadge() {
    setBadge(unreadCount - 1);
  }
  function zeroBadge() {
    setBadge(0);
  }

  function buildItem(n, flash = false) {
    const el = document.createElement("div");
    el.className = `np-item${n.is_read ? "" : " unread"}${flash ? " new-flash" : ""}`;
    el.dataset.id = n.id;
    el.innerHTML = `
            <div class="np-icon ${esc(n.type)}">${typeIcon(n.type)}</div>
            <div class="np-content">
              <div class="np-item-title">${esc(n.title)}</div>
              <div class="np-item-msg">${esc(n.message)}</div>
              <div class="np-item-time">${timeAgo(n.created_at)}</div>
            </div>`;
    el.addEventListener("click", () => {
      if (el.classList.contains("unread")) markOneRead(n.id, el);
    });
    return el;
  }

  async function loadNotifications(reset = false) {
    if (reset) {
      offset = 0;
      list.innerHTML = '<div class="np-placeholder">Loading…</div>';
    }
    try {
      const res = await fetch(`${API}?limit=${PER_PAGE}&offset=${offset}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) throw new Error("Failed");

      totalNotifs = data.total;
      setBadge(data.unread);
      if (reset) list.innerHTML = "";

      if (!data.notifications.length && reset) {
        list.innerHTML = `<div class="np-empty"><div class="np-empty-icon">🔔</div><div>No notifications yet</div></div>`;
        foot.style.display = "none";
        return;
      }

      data.notifications.forEach((n) => list.appendChild(buildItem(n)));
      offset += data.notifications.length;
      foot.style.display = offset < totalNotifs ? "block" : "none";
    } catch {
      if (reset)
        list.innerHTML =
          '<div class="np-empty">Could not load notifications.</div>';
    }
  }

  async function markOneRead(id, el) {
    try {
      await fetch(`${API}/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      el.classList.remove("unread");
      decBadge();
    } catch {}
  }

  markAllBtn.addEventListener("click", async () => {
    try {
      await fetch(`${API}/read-all`, {
        method: "PATCH",
        credentials: "include",
      });
      list
        .querySelectorAll(".np-item.unread")
        .forEach((el) => el.classList.remove("unread"));
      zeroBadge();
    } catch {}
  });

  loadMoreBtn.addEventListener("click", () => loadNotifications(false));

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    panelOpen = !panelOpen;
    panel.classList.toggle("open", panelOpen);
    if (panelOpen) loadNotifications(true);
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) {
      panelOpen = false;
      panel.classList.remove("open");
    }
  });

  const toast = document.createElement("div");
  toast.className = "notif-toast";
  document.body.appendChild(toast);
  let toastTimer = null;

  function showToast(n) {
    toast.innerHTML = `
            <div class="nt-icon">${typeIcon(n.type)}</div>
            <div class="nt-body">
              <div class="nt-title">${esc(n.title)}</div>
              <div class="nt-msg">${esc(n.message)}</div>
            </div>
            <button class="nt-close" title="Dismiss">✕</button>`;
    toast
      .querySelector(".nt-close")
      .addEventListener("click", () => toast.classList.remove("show"));
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 5000);
  }

  waitForUserId((userId) => {
    socket = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("🔔 Notification socket connected:", socket.id);
      socket.emit("join", { userId });
    });

    socket.on("disconnect", () =>
      console.log("🔌 Notification socket disconnected"),
    );

    // ── CORRECTED notification handler ──────────────────────────
    socket.on("notification", (data) => {
      console.log("Notification received:", data);

      // 1. Increment the bell badge
      incBadge();

      // 2. Prepend new item to the top of the list
      const item = buildItem({ ...data, is_read: 0 }, true);
      if (list) {
        const empty = list.querySelector(".np-placeholder, .np-empty");
        if (empty) empty.remove();
        list.prepend(item);
      }

      // 3. Show toast only when the panel is closed
      if (!panelOpen) {
        showToast(data);
      }

      // 4. Remove flash highlight class after animation completes
      setTimeout(() => item.classList.remove("new-flash"), 1000);
    });
    // ── END corrected handler ────────────────────────────────────

    socket.on("connect_error", (err) =>
      console.warn("Socket connect error:", err.message),
    );
  });

  (async () => {
    try {
      const res = await fetch(`${API}/unread-count`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setBadge(data.count);
    } catch {}
  })();
})();
