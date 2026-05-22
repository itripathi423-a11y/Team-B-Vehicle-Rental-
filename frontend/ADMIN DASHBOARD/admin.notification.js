(function () {
  "use strict";

  /* ── Config ──────────────────────────────────────────────────── */
  const API_BASE = "http://localhost:5000/api/admin/notifications";
  const PER_PAGE = 20;

  /* ── State ───────────────────────────────────────────────────── */
  let offset = 0;
  let totalNotifs = 0;
  let unreadCount = 0;
  let panelOpen = false;
  let _socket = null;

  /* ── Inject CSS ─────────────────────────────────────────────── */
  const style = document.createElement("style");
  style.textContent = `
    /* ── Notification wrap ── */
    .an-wrap { position: relative; }

    /* Bell dot — pulsing red */
    .an-dot {
      position: absolute;
      top: 4px; right: 4px;
      width: 9px; height: 9px;
      background: #ef4444;
      border-radius: 50%;
      border: 2px solid #fff;
      pointer-events: none;
      animation: anPulse 2s ease infinite;
    }
    @keyframes anPulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,.45); }
      50%      { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
    }

    /* Count badge */
    .an-count {
      position: absolute;
      top: -5px; right: -5px;
      min-width: 17px; height: 17px;
      padding: 0 4px;
      background: #ef4444;
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      border-radius: 99px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #fff;
      pointer-events: none;
      font-family: "Space Mono", monospace;
    }

    /* Panel */
    .an-panel {
      display: none;
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 380px;
      max-height: 520px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,.13);
      z-index: 9999;
      overflow: hidden;
      flex-direction: column;
    }
    .an-panel.open {
      display: flex;
      animation: anSlide .18s ease both;
    }
    @keyframes anSlide {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Panel header */
    .an-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 15px 18px 12px;
      border-bottom: 1px solid #f3f4f6;
      flex-shrink: 0;
      background: #fff;
    }
    .an-title { font-size: 14px; font-weight: 700; color: #111827; }
    .an-mark-all {
      font-size: 11.5px; color: #ff5c1a;
      background: none; border: none; cursor: pointer;
      font-family: "DM Sans", sans-serif; font-weight: 500; padding: 0;
    }
    .an-mark-all:hover { opacity: .7; }

    /* Scrollable list */
    .an-list { overflow-y: auto; flex: 1; overscroll-behavior: contain; }
    .an-list::-webkit-scrollbar { width: 5px; }
    .an-list::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }

    /* Placeholder / empty */
    .an-placeholder, .an-empty {
      padding: 36px 20px; text-align: center;
      font-size: 13px; color: #9ca3af;
    }
    .an-empty-icon { font-size: 34px; margin-bottom: 8px; }

    /* Notification item */
    .an-item {
      display: flex; gap: 12px;
      padding: 13px 18px;
      border-bottom: 1px solid #f9fafb;
      cursor: pointer;
      transition: background .15s;
      align-items: flex-start;
      position: relative;
    }
    .an-item:last-child { border-bottom: none; }
    .an-item:hover { background: #fafafa; }

    /* Unread */
    .an-item.unread { background: #fff8f5; }
    .an-item.unread:hover { background: #fff2ec; }
    .an-item.unread::before {
      content: ""; position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 3px; background: #ff5c1a;
      border-radius: 0 2px 2px 0;
    }

    /* Flash new item */
    @keyframes anHighlight {
      0%   { background: #fff0e8; }
      100% { background: #fff8f5; }
    }
    .an-item.new-flash { animation: anHighlight .9s ease forwards; }

    /* Icon bubble */
    .an-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 17px; flex-shrink: 0; margin-top: 1px;
    }
    .an-icon.booking  { background: #fff0e8; }
    .an-icon.kyc      { background: #f0fdf4; }
    .an-icon.enquiry  { background: #eff6ff; }
    .an-icon.review   { background: #fffbeb; }
    .an-icon.general  { background: #f3f4f6; }

    /* Text */
    .an-content { flex: 1; min-width: 0; }
    .an-item-title {
      font-size: 13px; font-weight: 600; color: #111827;
      margin-bottom: 3px; line-height: 1.35;
    }
    .an-item-msg {
      font-size: 12px; color: #6b7280; line-height: 1.55;
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    .an-item-time {
      font-size: 10.5px; color: #9ca3af; margin-top: 5px;
      font-family: "Space Mono", monospace;
    }

    /* Footer */
    .an-foot { border-top: 1px solid #f3f4f6; padding: 10px 18px; flex-shrink: 0; }
    .an-load-more {
      width: 100%; padding: 9px; background: none;
      border: 1px solid #e5e7eb; border-radius: 8px;
      font-family: "DM Sans", sans-serif; font-size: 12.5px;
      color: #6b7280; cursor: pointer; transition: all .2s;
    }
    .an-load-more:hover { border-color: #ff5c1a; color: #ff5c1a; }

    /* Toast */
    .an-toast {
      position: fixed; bottom: 24px; right: 24px;
      min-width: 280px; max-width: 340px;
      background: #111827; color: #fff;
      border-radius: 12px; padding: 14px 16px;
      display: flex; align-items: flex-start; gap: 12px;
      box-shadow: 0 6px 24px rgba(0,0,0,.2);
      z-index: 10000; opacity: 0; transform: translateY(10px);
      transition: opacity .25s, transform .25s; pointer-events: none;
    }
    .an-toast.show { opacity: 1; transform: translateY(0); pointer-events: all; }
    .an-toast-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
    .an-toast-body { flex: 1; min-width: 0; }
    .an-toast-title { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
    .an-toast-msg {
      font-size: 11.5px; color: rgba(255,255,255,.65); line-height: 1.5;
      display: -webkit-box; -webkit-line-clamp: 2;
      -webkit-box-orient: vertical; overflow: hidden;
    }
    .an-toast-close {
      background: none; border: none; color: rgba(255,255,255,.45);
      cursor: pointer; font-size: 16px; padding: 0; line-height: 1; flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);

  /* ── Build the HTML panel and replace the old bell button ────── */
  function buildPanel() {
    // Find the old notif-wrapper or notif-btn and replace it
    const oldWrapper =
      document.querySelector(".notif-wrapper") ||
      document.querySelector(".notif-btn")?.parentElement;

    const wrap = document.createElement("div");
    wrap.className = "an-wrap";
    wrap.id = "anWrap";

    wrap.innerHTML = `
      <button class="icon-btn" id="anBtn" title="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" width="17" height="17">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="an-dot"   id="anDot"   style="display:none"></span>
        <span class="an-count" id="anCount" style="display:none">0</span>
      </button>

      <div class="an-panel" id="anPanel">
        <div class="an-head">
          <span class="an-title">Notifications</span>
          <button class="an-mark-all" id="anMarkAll">Mark all read</button>
        </div>
        <div class="an-list" id="anList">
          <div class="an-placeholder">Loading…</div>
        </div>
        <div class="an-foot" id="anFoot" style="display:none">
          <button class="an-load-more" id="anLoadMore">Load older notifications</button>
        </div>
      </div>
    `;

    if (oldWrapper) {
      oldWrapper.replaceWith(wrap);
    } else {
      // fallback: prepend to topbar-right
      const topbarRight = document.querySelector(".topbar-right");
      if (topbarRight) topbarRight.prepend(wrap);
    }
  }

  buildPanel();

  /* ── DOM refs (after panel is injected) ──────────────────────── */
  const wrap = document.getElementById("anWrap");
  const btn = document.getElementById("anBtn");
  const panel = document.getElementById("anPanel");
  const list = document.getElementById("anList");
  const dot = document.getElementById("anDot");
  const countBadge = document.getElementById("anCount");
  const markAllBtn = document.getElementById("anMarkAll");
  const loadMoreBtn = document.getElementById("anLoadMore");
  const foot = document.getElementById("anFoot");

  if (!wrap) return;

  /* ── Type icons ──────────────────────────────────────────────── */
  const TYPE_ICON = {
    booking: "🚗",
    kyc: "🛡️",
    enquiry: "💬",
    review: "⭐",
    general: "🔔",
  };
  function typeIcon(t) {
    return TYPE_ICON[t] || "🔔";
  }

  /* ── Relative time ───────────────────────────────────────────── */
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

  /* ── HTML escape ─────────────────────────────────────────────── */
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Badge ───────────────────────────────────────────────────── */
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

  /* ── Build item ──────────────────────────────────────────────── */
  function buildItem(n, flash = false) {
    const el = document.createElement("div");
    el.className = `an-item${n.is_read ? "" : " unread"}${flash ? " new-flash" : ""}`;
    el.dataset.id = n.id;

    el.innerHTML = `
      <div class="an-icon ${esc(n.type)}">${typeIcon(n.type)}</div>
      <div class="an-content">
        <div class="an-item-title">${esc(n.title)}</div>
        <div class="an-item-msg">${esc(n.message)}</div>
        <div class="an-item-time">${timeAgo(n.created_at)}</div>
      </div>`;

    el.addEventListener("click", () => {
      if (el.classList.contains("unread")) markOneRead(n.id, el);
    });

    return el;
  }

  /* ── Load notifications ──────────────────────────────────────── */
  async function loadNotifications(reset = false) {
    if (reset) {
      offset = 0;
      list.innerHTML = '<div class="an-placeholder">Loading…</div>';
    }
    try {
      const res = await fetch(
        `${API_BASE}?limit=${PER_PAGE}&offset=${offset}`,
        {
          credentials: "include",
        },
      );
      const data = await res.json();
      if (!data.success) throw new Error("Failed");

      totalNotifs = data.total;
      setBadge(data.unread);

      if (reset) list.innerHTML = "";

      if (!data.notifications.length && reset) {
        list.innerHTML = `
          <div class="an-empty">
            <div class="an-empty-icon">🔔</div>
            <div>No notifications yet</div>
          </div>`;
        foot.style.display = "none";
        return;
      }

      data.notifications.forEach((n) => list.appendChild(buildItem(n)));
      offset += data.notifications.length;
      foot.style.display = offset < totalNotifs ? "block" : "none";
    } catch {
      if (reset)
        list.innerHTML =
          '<div class="an-empty">Could not load notifications.</div>';
    }
  }

  /* ── Mark one read ───────────────────────────────────────────── */
  async function markOneRead(id, el) {
    try {
      await fetch(`${API_BASE}/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      el.classList.remove("unread");
      decBadge();
    } catch {}
  }

  /* ── Mark all read ───────────────────────────────────────────── */
  markAllBtn.addEventListener("click", async () => {
    try {
      await fetch(`${API_BASE}/read-all`, {
        method: "PATCH",
        credentials: "include",
      });
      list
        .querySelectorAll(".an-item.unread")
        .forEach((el) => el.classList.remove("unread"));
      zeroBadge();
    } catch {}
  });

  /* ── Load more ───────────────────────────────────────────────── */
  loadMoreBtn.addEventListener("click", () => loadNotifications(false));

  /* ── Toggle panel ────────────────────────────────────────────── */
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

  /* ── Toast ───────────────────────────────────────────────────── */
  const toast = document.createElement("div");
  toast.className = "an-toast";
  document.body.appendChild(toast);
  let toastTimer = null;

  function showToast(n) {
    toast.innerHTML = `
      <div class="an-toast-icon">${typeIcon(n.type)}</div>
      <div class="an-toast-body">
        <div class="an-toast-title">${esc(n.title)}</div>
        <div class="an-toast-msg">${esc(n.message)}</div>
      </div>
      <button class="an-toast-close" title="Dismiss">✕</button>`;

    toast
      .querySelector(".an-toast-close")
      .addEventListener("click", () => toast.classList.remove("show"));

    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 5000);
  }

  /* ── Socket.io real-time ─────────────────────────────────────── */
  function initSocket() {
    // io() is available from the socket.io CDN script loaded in the page
    if (typeof io === "undefined") {
      console.warn(
        "[AdminNotif] socket.io client not loaded. Add CDN script before admin.notification.js",
      );
      return;
    }

    _socket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    _socket.on("connect", () => {
      console.log("🛡️ Admin notification socket connected:", _socket.id);
      _socket.emit("join_admin"); // join admin_room on server
    });

    _socket.on("disconnect", () => {
      console.log("🔌 Admin notification socket disconnected");
    });

    // New notification pushed from server to admin_room
    _socket.on("admin_notification", (n) => {
      console.log("📩 Admin real-time notification:", n.title);

      // 1. Update badge
      incBadge();

      // 2. Prepend to panel if open
      if (panelOpen) {
        const placeholder = list.querySelector(".an-placeholder, .an-empty");
        if (placeholder) placeholder.remove();
        list.prepend(buildItem(n, true));
        totalNotifs++;
        offset++;
      }

      // 3. Toast if panel is closed
      if (!panelOpen) showToast(n);
    });

    _socket.on("connect_error", (err) => {
      console.warn("[AdminNotif] Socket connect error:", err.message);
    });
  }

  initSocket();

  /* ── Initial badge load on page load ─────────────────────────── */
  (async () => {
    try {
      const res = await fetch(`${API_BASE}/unread-count`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setBadge(data.count);
    } catch {}
  })();
})();
