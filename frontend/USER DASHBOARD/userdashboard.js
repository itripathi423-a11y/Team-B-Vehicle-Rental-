/* =======================================================
   AUTO DEALER — User Dashboard JS
   Connects to your backend REST API to populate:
     - User profile + KYC status
     - Booking stats
     - Recent bookings table
     - Upcoming rental card
     - Available vehicles strip
   =======================================================
   SETUP: Change BASE_URL to your backend URL.
   All endpoints assume a session/cookie based auth OR
   a JWT token stored in localStorage as "ad_token".
   ======================================================= */

"use strict";

/* ── CONFIG ─────────────────────────────────────────── */
const BASE_URL = "http://127.0.0.1:5501/api"; // ← change to your API base

/* ── HELPERS ─────────────────────────────────────────── */

/** Get auth headers. Supports both cookie-session and JWT. */
function authHeaders() {
  const token = localStorage.getItem("ad_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/**
 * Wrapper around fetch that:
 *  - Adds auth headers automatically
 *  - Handles 401 → redirect to login
 *  - Returns parsed JSON or throws a readable error
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    credentials: "include", // sends cookies too
    headers: authHeaders(),
    ...options,
  });

  if (res.status === 401) {
    // Not logged in — send to login page
    window.location.href = "/login.html";
    return;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

/** Format a number as Nepali Rupees string e.g. "Rs 40,000" */
function fmtNPR(amount) {
  if (amount == null) return "—";
  return "Rs " + Number(amount).toLocaleString("en-IN");
}

/** Format an ISO date string to "Apr 10, 2026" */
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format an ISO datetime to "Apr 14, 9:00 AM" */
function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Days from now until a future date */
function daysUntil(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Status badge HTML */
function statusBadge(status) {
  const map = {
    Completed: "badge-green",
    Active: "badge-amber",
    Ongoing: "badge-amber",
    Pending: "badge-blue",
    Cancelled: "badge-red",
    Rejected: "badge-red",
  };
  const cls = map[status] || "badge-blue";
  return `<span class="badge ${cls}">${status}</span>`;
}

/** Skeleton loading row for the bookings table */
function skeletonRows(cols = 5, rows = 4) {
  const cell = `<td><div class="skeleton" style="height:14px;border-radius:4px;background:#f3f4f6;"></div></td>`;
  const row = `<tr>${cell.repeat(cols)}</tr>`;
  return row.repeat(rows);
}

/** Show inline error inside a container */
function showError(containerId, message) {
  const el = document.getElementById(containerId);
  if (el) {
    el.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:32px;color:#dc2626;font-size:13px;">
      ⚠ ${message}
    </td></tr>`;
  }
}

/* ── 1. USER PROFILE + KYC ───────────────────────────
   GET /api/user/profile
   Expected response:
   {
     id: 1,
     first_name: "Swikar",
     last_name: "Regmi",
     email: "swikar@example.com",
     phone: "9812345678",
     kyc_status: "Verified" | "Pending" | "Rejected",
     profile_photo: "uploads/users/photo.jpg" | null
   }
─────────────────────────────────────────────────────── */
async function loadUserProfile() {
  try {
    const user = await apiFetch("/user/profile");
    if (!user) return;

    const fullName = `${user.first_name} ${user.last_name}`;
    const initials =
      `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();
    const isVerified = user.kyc_status === "Verified";
    const hasPhoto = !!user.profile_photo;

    /* ── Greeting in welcome banner ── */
    const hour = new Date().getHours();
    const greet =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
    const welcomeH1 = document.querySelector(".welcome-text h1");
    if (welcomeH1) {
      welcomeH1.innerHTML = `${greet}, <span id="greetName">${user.first_name}</span> 👋`;
    }

    /* ── Helper: inject photo or initials into any avatar container ── */
    function populateAvatar(containerEl, initialsEl) {
      if (!containerEl) return;
      if (hasPhoto) {
        if (initialsEl) initialsEl.style.display = "none";
        // Remove any existing img first to avoid duplicates
        containerEl.querySelectorAll("img").forEach((i) => i.remove());
        const img = document.createElement("img");
        img.src = user.profile_photo;
        img.alt = fullName;
        containerEl.appendChild(img);
      } else {
        if (initialsEl) initialsEl.textContent = initials;
      }
      if (isVerified) {
        containerEl
          .querySelectorAll(".avatar-tick,.avatar-verified-badge")
          .forEach((t) => t.remove());
        const tick = document.createElement("span");
        tick.className = "avatar-tick";
        tick.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>`;
        containerEl.appendChild(tick);
      }
    }

    /* ── Sidebar avatar + name + kyc ── */
    populateAvatar(
      document.getElementById("sidebarAvatar"),
      document.getElementById("sidebarInitials"),
    );
    const sidebarNameEl = document.getElementById("sidebarName");
    if (sidebarNameEl) sidebarNameEl.textContent = fullName;
    const sidebarKycEl = document.getElementById("sidebarKyc");
    if (sidebarKycEl) {
      if (isVerified) {
        sidebarKycEl.textContent = "✔ KYC Verified";
        sidebarKycEl.className = "user-kyc-status verified";
      } else if (user.kyc_status === "Rejected") {
        sidebarKycEl.textContent = "✖ KYC Rejected";
        sidebarKycEl.className = "user-kyc-status unverified";
      } else {
        sidebarKycEl.textContent = "⚠ KYC Pending";
        sidebarKycEl.className = "user-kyc-status unverified";
      }
    }

    /* ── Topbar avatar + name + role ── */
    populateAvatar(
      document.getElementById("topbarAvatar"),
      document.getElementById("topbarInitials"),
    );
    const topbarNameEl = document.getElementById("topbarName");
    if (topbarNameEl) topbarNameEl.textContent = fullName;
    const topbarRoleEl = document.getElementById("topbarRole");
    if (topbarRoleEl) {
      topbarRoleEl.textContent = isVerified ? "✔ Verified Member" : "Member";
      topbarRoleEl.style.color = isVerified ? "#16a34a" : "";
    }

    /* ── KYC alert banner ── */
    const kycAlertEl = document.getElementById("kycAlert");
    if (kycAlertEl) {
      if (isVerified) {
        kycAlertEl.style.display = "none";
      } else if (user.kyc_status === "Rejected") {
        kycAlertEl.querySelector("strong").textContent =
          "Your KYC was rejected";
        kycAlertEl.querySelector("span").textContent =
          "Your identity verification was not approved. Please re-submit with valid documents.";
        kycAlertEl.style.background = "#fff1f2";
        kycAlertEl.style.borderColor = "#fecaca";
        kycAlertEl.style.borderLeftColor = "#dc2626";
        kycAlertEl.querySelector("svg").style.stroke = "#dc2626";
        kycAlertEl.querySelector(".kyc-alert-btn").style.background = "#dc2626";
      }
    }

    /* Store user id globally */
    window._userId = user.id;
  } catch (err) {
    console.error("Profile load failed:", err.message);
  }
}

/* ── 2. BOOKING STATS ────────────────────────────────
   GET /api/user/bookings/stats
   Expected response:
   {
     total: 7,
     completed: 5,
     active: 1,
     total_spent: 87000
   }
─────────────────────────────────────────────────────── */
async function loadStats() {
  try {
    const stats = await apiFetch("/user/bookings/stats");
    if (!stats) return;

    setElText("statTotal", stats.total ?? 0);
    setElText("statCompleted", stats.completed ?? 0);
    setElText("statActive", stats.active ?? 0);

    /* Format total spent as Rs 87k or Rs 1.2L */
    const spent = stats.total_spent ?? 0;
    let spentStr;
    if (spent >= 100000) {
      spentStr = "Rs " + (spent / 100000).toFixed(1) + "L";
    } else if (spent >= 1000) {
      spentStr = "Rs " + Math.round(spent / 1000) + "k";
    } else {
      spentStr = fmtNPR(spent);
    }
    setElText("statSpent", spentStr);
  } catch (err) {
    console.error("Stats load failed:", err.message);
    ["statTotal", "statCompleted", "statActive", "statSpent"].forEach((id) =>
      setElText(id, "—"),
    );
  }
}

function setElText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ── 3. RECENT BOOKINGS TABLE ────────────────────────
   GET /api/user/bookings?limit=5&sort=desc
   Expected response (array):
   [
     {
       id: 101,
       vehicle_name: "BMW 3 Series",
       license_plate: "BA 5678",
       duration_type: "1 Day",
       pickup_datetime: "2026-04-10T09:00:00",
       total_amount: 40000,
       status: "Completed" | "Active" | "Pending" | "Cancelled"
     },
     ...
   ]
─────────────────────────────────────────────────────── */
async function loadRecentBookings() {
  const tbody = document.getElementById("recentBookingsTbody");
  if (!tbody) return;

  // Show skeletons while loading
  tbody.innerHTML = skeletonRows(5, 4);

  try {
    const bookings = await apiFetch("/user/bookings?limit=5&sort=desc");

    if (!bookings || bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#9ca3af;font-size:13px;">
        No bookings yet. <a href="#" style="color:var(--orange);">Book your first vehicle →</a>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = bookings
      .map(
        (b) => `
      <tr>
        <td>
          <div class="veh-cell">
            <div class="veh-thumb">
              ${
                b.thumbnail
                  ? `<img src="${b.thumbnail}" alt="${b.vehicle_name}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;">`
                  : vehicleEmoji(b.body_type)
              }
            </div>
            <div>
              <p class="veh-name">${escHtml(b.vehicle_name)}</p>
              <p class="veh-plate">${escHtml(b.license_plate)}</p>
            </div>
          </div>
        </td>
        <td>${escHtml(b.duration_type)}</td>
        <td>${fmtDate(b.pickup_datetime)}</td>
        <td><span style="font-family:'Space Mono',monospace;font-size:12px;">${fmtNPR(b.total_amount)}</span></td>
        <td>${statusBadge(b.status)}</td>
      </tr>
    `,
      )
      .join("");
  } catch (err) {
    showError("recentBookingsTbody", err.message);
  }
}

/* ── 4. UPCOMING BOOKING CARD ────────────────────────
   GET /api/user/bookings/upcoming
   Expected response (single object or null):
   {
     id: 102,
     vehicle_name: "Toyota Fortuner",
     license_plate: "BA 1234",
     fuel_type: "Diesel",
     body_type: "SUV",
     seating_capacity: 7,
     duration_type: "8 Hours",
     pickup_datetime: "2026-04-14T09:00:00",
     total_amount: 18500
   }
─────────────────────────────────────────────────────── */
async function loadUpcomingBooking() {
  const card = document.getElementById("upcomingCard");
  if (!card) return;

  // Skeleton state
  card.innerHTML = `<p class="upcoming-label">● Next Booking</p>
    <div class="skeleton" style="height:20px;width:60%;border-radius:4px;background:rgba(255,255,255,0.08);margin-bottom:8px;"></div>
    <div class="skeleton" style="height:14px;width:80%;border-radius:4px;background:rgba(255,255,255,0.05);"></div>`;

  try {
    const b = await apiFetch("/user/bookings/upcoming");

    if (!b) {
      card.innerHTML = `
        <p class="upcoming-label">● Next Booking</p>
        <p style="color:rgba(255,255,255,0.35);font-size:13px;margin-top:12px;">No upcoming bookings.</p>
        <a href="#" class="welcome-cta" style="margin-top:18px;display:inline-flex;">Browse Vehicles →</a>`;
      return;
    }

    const days = daysUntil(b.pickup_datetime);
    const daysLabel =
      days === 0 ? "TODAY" : days === 1 ? "1 DAY" : `${days} DAYS`;

    card.innerHTML = `
      <p class="upcoming-label">● Next Booking</p>
      <p class="upcoming-car">${escHtml(b.vehicle_name)}</p>
      <p class="upcoming-meta">${escHtml(b.license_plate)} &nbsp;·&nbsp; ${escHtml(b.fuel_type)} ${escHtml(b.body_type)} &nbsp;·&nbsp; ${b.seating_capacity} seats</p>
      <div class="upcoming-row">
        <div>
          <div class="upcoming-info" style="margin-bottom:10px;">
            <span>Pickup</span>
            <strong>${fmtDateTime(b.pickup_datetime)}</strong>
          </div>
          <div class="upcoming-info">
            <span>Duration</span>
            <strong>${escHtml(b.duration_type)}</strong>
          </div>
        </div>
        <div class="countdown">
          <p class="countdown-num">${days}</p>
          <p class="countdown-lbl">${daysLabel} LEFT</p>
        </div>
      </div>
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center;">
        <span style="font-family:'Space Mono',monospace;font-size:11px;color:rgba(255,255,255,0.35);">TOTAL</span>
        <span style="font-family:'Space Mono',monospace;font-size:14px;color:#fff;font-weight:700;">${fmtNPR(b.total_amount)}</span>
      </div>`;
  } catch (err) {
    card.innerHTML = `<p class="upcoming-label">● Next Booking</p>
      <p style="color:#f87171;font-size:12px;margin-top:10px;">⚠ ${err.message}</p>`;
  }
}

/* ── 5. AVAILABLE VEHICLES STRIP ─────────────────────
   GET /api/vehicles?status=Available&limit=3
   Expected response (array):
   [
     {
       id: 1,
       name: "BMW 3 Series",
       brand: "BMW",
       model: "320i",
       year: 2023,
       body_type: "Sedan",
       fuel_type: "Petrol",
       transmission: "Automatic",
       seating_capacity: 5,
       price_4h: 15500,
       price_8h: 25000,
       price_1d: 40000,
       thumbnail: "uploads/vehicles/bmw.jpg" | null,
       status: "Available"
     },
     ...
   ]
─────────────────────────────────────────────────────── */
async function loadAvailableVehicles() {
  const strip = document.getElementById("vehiclesStrip");
  if (!strip) return;

  // Skeleton cards
  strip.innerHTML = [1, 2, 3]
    .map(
      () => `
    <div class="vehicle-card">
      <div class="vehicle-img" style="background:#f3f4f6;"></div>
      <div class="vehicle-body">
        <div class="skeleton" style="height:16px;width:70%;border-radius:4px;background:#f3f4f6;margin-bottom:8px;"></div>
        <div class="skeleton" style="height:12px;width:90%;border-radius:4px;background:#f3f4f6;margin-bottom:16px;"></div>
        <div class="skeleton" style="height:36px;border-radius:8px;background:#f3f4f6;"></div>
      </div>
    </div>`,
    )
    .join("");

  try {
    const vehicles = await apiFetch("/vehicles?status=Available&limit=3");

    if (!vehicles || vehicles.length === 0) {
      strip.innerHTML = `<p style="color:var(--muted);font-size:13px;grid-column:1/-1;">No vehicles available right now.</p>`;
      return;
    }

    strip.innerHTML = vehicles
      .map(
        (v) => `
      <div class="vehicle-card">
        <div class="vehicle-img">
          ${
            v.thumbnail
              ? `<img src="${v.thumbnail}" alt="${escHtml(v.name)}" />`
              : vehicleEmoji(v.body_type)
          }
          <span class="vehicle-avail">Available</span>
        </div>
        <div class="vehicle-body">
          <p class="vehicle-name">${escHtml(v.name)}</p>
          <div class="vehicle-meta">
            <span>${escHtml(v.fuel_type)}</span>
            <span>${v.seating_capacity} Seats</span>
            <span>${escHtml(v.transmission)}</span>
          </div>
          <div class="vehicle-price">
            <span class="price-val">${fmtNPR(v.price_4h)}</span>
            <span class="price-unit">/ 4hr</span>
          </div>
          <a href="booking.html?vehicle_id=${v.id}" class="book-btn">Book Now</a>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (err) {
    strip.innerHTML = `<p style="color:#dc2626;font-size:13px;grid-column:1/-1;">⚠ ${err.message}</p>`;
  }
}

/* ── 6. NOTIFICATIONS COUNT ──────────────────────────
   GET /api/user/notifications/unread-count
   Expected response: { count: 3 }
─────────────────────────────────────────────────────── */
async function loadNotifCount() {
  try {
    const data = await apiFetch("/user/notifications/unread-count");
    const dot = document.querySelector(".notif-dot");
    if (!dot) return;

    if (data?.count > 0) {
      dot.style.display = "block";
      dot.title = `${data.count} unread notifications`;
    } else {
      dot.style.display = "none";
    }
  } catch {
    // Silently fail — non-critical
  }
}

/* ── UTILITY: vehicle emoji by body type ─────────────── */
function vehicleEmoji(bodyType) {
  const map = {
    SUV: "🚙",
    Sedan: "🚗",
    Hatchback: "🚗",
    Pickup: "🛻",
    Van: "🚐",
    Minivan: "🚐",
    Convertible: "🏎️",
    Electric: "⚡",
  };
  return map[bodyType] || "🚗";
}

/** Escape HTML to prevent XSS */
function escHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── UPDATE HTML: add IDs needed by JS ───────────────
   The HTML file needs these id attributes added:
     stat cards:         id="statTotal" id="statCompleted" id="statActive" id="statSpent"
     bookings tbody:     id="recentBookingsTbody"
     upcoming card:      id="upcomingCard"
     vehicles strip:     id="vehiclesStrip"
   These are already in the updated HTML below.
─────────────────────────────────────────────────────── */

/* ── INIT: run everything on page load ───────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  // Run profile first (sets user name, KYC state)
  await loadUserProfile();

  // Run the rest in parallel for speed
  await Promise.allSettled([
    loadStats(),
    loadRecentBookings(),
    loadAvailableVehicles(),
    loadNotifCount(),
  ]);
});

/* ── AUTO-REFRESH every 60 seconds (optional) ────────── */
// Refreshes stats, upcoming booking, and notif count
// without a full page reload
setInterval(async () => {
  await Promise.allSettled([loadStats(), loadNotifCount()]);
}, 60_000);
