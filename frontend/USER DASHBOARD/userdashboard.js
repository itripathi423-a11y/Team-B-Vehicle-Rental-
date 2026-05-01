/* =======================================================
   AUTO DEALER — User Dashboard JS
   ======================================================= */

"use strict";

const BASE_URL = "http://localhost:5000/api";

function authHeaders() {
  const token = localStorage.getItem("ad_token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: authHeaders(),
    ...options,
  });

  if (res.status === 401) {
    window.location.href = "/index.html";
    return;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

/* ── FORMAT HELPERS ─────────────────────────────────── */

function fmtNPR(amount) {
  if (amount == null) return "—";
  return "Rs " + Number(amount).toLocaleString("en-IN");
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysUntil(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

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

function skeletonRows(cols = 5, rows = 4) {
  const cell = `<td><div class="skeleton" style="height:14px;border-radius:4px;background:#f3f4f6;"></div></td>`;
  const row = `<tr>${cell.repeat(cols)}</tr>`;
  return row.repeat(rows);
}

function showError(containerId, message) {
  const el = document.getElementById(containerId);
  if (el) {
    el.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:32px;color:#dc2626;font-size:13px;">
      ⚠ ${message}
    </td></tr>`;
  }
}

function escHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function setElText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ── 1. USER PROFILE + KYC ───────────────────────────── */
async function loadUserProfile() {
  try {
    const user = await apiFetch("/user/profile");
    if (!user) return;

    const fullName = `${user.first_name} ${user.last_name}`;
    const initials =
      `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();

    const kycStatus = (user.kyc_status || "not_submitted").toLowerCase();
    const isVerified = kycStatus === "verified";
    const isPending = kycStatus === "pending";
    const isRejected = kycStatus === "rejected";

    const hour = new Date().getHours();
    const greet =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";

    const welcomeH1 = document.querySelector(".welcome-text h1");
    if (welcomeH1) {
      welcomeH1.innerHTML = `${greet}, <span id="greetName">${escHtml(user.first_name)}</span> 👋`;
    }

    setElText("sidebarName", fullName);
    setElText("topbarName", fullName);
    setElText("ddName", fullName);
    setElText("ddEmail", user.email);
    setElText("statSpent", kycStatus.replace("_", " "));

    const sidebarKycEl = document.getElementById("sidebarKyc");
    if (sidebarKycEl) {
      if (isVerified) {
        sidebarKycEl.textContent = "✔ KYC Verified";
        sidebarKycEl.className = "user-kyc-status verified";
      } else if (isRejected) {
        sidebarKycEl.textContent = "✖ KYC Rejected";
        sidebarKycEl.className = "user-kyc-status unverified";
      } else if (isPending) {
        sidebarKycEl.textContent = "⏳ KYC Pending";
        sidebarKycEl.className = "user-kyc-status unverified";
      } else {
        sidebarKycEl.textContent = "⚠ KYC Not Submitted";
        sidebarKycEl.className = "user-kyc-status unverified";
      }
    }

    const topbarRoleEl = document.getElementById("topbarRole");
    if (topbarRoleEl) {
      topbarRoleEl.textContent = isVerified ? "✔ Verified Member" : "Member";
      topbarRoleEl.style.color = isVerified ? "#16a34a" : "";
    }

    function setAvatar(container, initialsEl) {
      if (!container) return;
      if (user.profile_photo) {
        if (initialsEl) initialsEl.style.display = "none";
        const img = document.createElement("img");
        img.src = user.profile_photo;
        img.alt = fullName;
        container.appendChild(img);
      } else {
        if (initialsEl) initialsEl.textContent = initials;
      }
    }

    setAvatar(
      document.getElementById("sidebarAvatar"),
      document.getElementById("sidebarInitials"),
    );
    setAvatar(
      document.getElementById("topbarAvatar"),
      document.getElementById("topbarInitials"),
    );

    window._userId = user.id;
  } catch (err) {
    console.error("Profile load failed:", err.message);
  }
}

/* ── 2. BOOKING STATS ────────────────────────────────── */
async function loadStats() {
  try {
    const stats = await apiFetch("/user/bookings/stats");
    if (!stats) return;
    setElText("statTotal", stats.total ?? 0);
    setElText("statCompleted", stats.completed ?? 0);
    setElText("statActive", stats.active ?? 0);
  } catch (err) {
    console.error("Stats load failed:", err.message);
  }
}

/* ── 3. RECENT BOOKINGS TABLE ────────────────────────── */
async function loadRecentBookings() {
  const IMAGE_BASE = "http://localhost:5000/uploads/vehicles/";
  const tbody = document.getElementById("recentBookingsTbody");
  if (!tbody) return;

  tbody.innerHTML = skeletonRows(5, 4);

  try {
    const res = await apiFetch("/user/bookings?limit=5&sort=desc");
    const bookings = Array.isArray(res)
      ? res
      : (res?.bookings ?? res?.data ?? []);

    if (!bookings.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:#6b7280;">No bookings yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = bookings
      .map((b) => {
        const thumbnail = b.thumbnail || b.vehicle_thumbnail;
        const amount = b.total_amount ?? b.total_price;
        const duration = b.duration_type || b.rental_type || "—";

        return `
        <tr>
          <td>
            <div class="veh-cell">
              <div class="veh-thumb">
                ${
                  thumbnail
                    ? `<img src="${IMAGE_BASE}${escHtml(thumbnail)}" alt="${escHtml(b.vehicle_name)}" onerror="this.style.display='none'" />`
                    : vehicleEmoji(b.body_type)
                }
              </div>
              <div>
                <p>${escHtml(b.vehicle_name)}</p>
                <p>${escHtml(b.license_plate)}</p>
              </div>
            </div>
          </td>
          <td>${escHtml(duration)}</td>
          <td>${fmtDate(b.pickup_datetime)}</td>
          <td>${fmtNPR(amount)}</td>
          <td>${statusBadge(b.status)}</td>
        </tr>
      `;
      })
      .join("");

    console.log("Bookings received:", bookings);
    triggerCompletedReviewPopup(bookings);
  } catch (err) {
    showError("recentBookingsTbody", err.message);
  }
}

/* ── REVIEW POPUP TRIGGER ────────────────────────────── */
function triggerCompletedReviewPopup(bookings) {
  if (!Array.isArray(bookings)) return;

  const booking = bookings.find((b) => {
    const id = b.booking_id || b.id;
    const status = String(b.status || "")
      .trim()
      .toLowerCase();
    return (
      status === "completed" && id && !sessionStorage.getItem("reviewed_" + id)
    );
  });

  if (!booking) return;

  const id = booking.booking_id || booking.id;
  setTimeout(() => {
    openReviewModal(id);
    sessionStorage.setItem("reviewed_" + id, "true");
  }, 800);
}

/* ── REVIEW MODAL OPEN ───────────────────────────────── */
function openReviewModal(bookingId) {
  if (!bookingId) return;

  const sessionKey = "reviewed_" + bookingId + "_open";
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "true");

  fetch(`http://localhost:5000/api/reviews/form/${bookingId}`, {
    credentials: "include",
    headers: authHeaders(),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!data) return;

      const vehNameEl = document.getElementById("reviewVehName");
      const vehMetaEl = document.getElementById("reviewVehMeta");
      const vehThumbEl = document.getElementById("reviewVehThumb");
      const backdropEl = document.getElementById("reviewBackdrop");
      const formView = document.getElementById("reviewFormView");
      const successView = document.getElementById("reviewSuccessView");
      const starErrEl = document.getElementById("reviewStarError");
      const sentimentEl = document.getElementById("reviewSentiment");
      const commentEl = document.getElementById("reviewComment");
      const charCountEl = document.getElementById("reviewCharCount");
      const submitBtn = document.getElementById("reviewSubmitBtn");

      if (vehNameEl)
        vehNameEl.innerText = data.vehicle_name || "Unknown Vehicle";
      if (vehMetaEl)
        vehMetaEl.innerText = `${data.brand || ""} ${data.model || ""}`.trim();

      /* Thumbnail */
      if (vehThumbEl) {
        if (data.thumbnail) {
          vehThumbEl.innerHTML = `<img
            src="http://localhost:5000/uploads/vehicles/${escHtml(data.thumbnail)}"
            style="width:100%;height:100%;object-fit:cover;border-radius:8px;"
            onerror="this.parentElement.innerHTML='🚗'" />`;
        } else {
          vehThumbEl.innerHTML = vehicleEmoji(data.body_type);
        }
      }

      window.reviewData = data;

      /* Reset all state */
      selectedRating = 0;
      document.querySelectorAll(".review-star").forEach((btn) => {
        btn.classList.remove("selected", "hovered");
      });

      if (sentimentEl) sentimentEl.textContent = "Tap a star to rate";
      if (commentEl) commentEl.value = "";
      if (charCountEl) charCountEl.textContent = "0 / 500";
      if (starErrEl) starErrEl.style.display = "none";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Review";
      }

      /* Show form, hide success */
      if (formView) formView.style.display = "block";
      if (successView) successView.style.display = "none";

      if (backdropEl) backdropEl.classList.remove("hidden");
    })
    .catch((err) => console.error("Review modal error:", err));
}

/* ── CLOSE REVIEW MODAL ──────────────────────────────── */
function closeReviewModal() {
  const backdropEl = document.getElementById("reviewBackdrop");
  if (backdropEl) backdropEl.classList.add("hidden");
  selectedRating = 0;
  window.reviewData = null;
}

/* ── CHAR COUNT ──────────────────────────────────────── */
function updateCharCount() {
  const textarea = document.getElementById("reviewComment");
  const charCountEl = document.getElementById("reviewCharCount");
  if (textarea && charCountEl) {
    charCountEl.textContent = `${textarea.value.length} / 500`;
  }
}

/* ── STAR RATING ─────────────────────────────────────── */
let selectedRating = 0;

const SENTIMENTS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

function previewStars(rating) {
  document.querySelectorAll(".review-star").forEach((btn, i) => {
    btn.classList.toggle("preview", i < rating);
  });
}

function clearPreview() {
  document.querySelectorAll(".review-star").forEach((btn, i) => {
    btn.classList.remove("preview");
    btn.classList.toggle("filled", i < selectedRating);
  });
}

function setRating(rating) {
  selectedRating = rating;

  document.querySelectorAll(".review-star").forEach((btn, i) => {
    btn.classList.toggle("filled", i < rating);
    btn.classList.remove("preview");
  });

  const sentimentEl = document.getElementById("reviewSentiment");
  if (sentimentEl) sentimentEl.textContent = SENTIMENTS[rating] || "";

  const starErrEl = document.getElementById("reviewStarError");
  if (starErrEl) starErrEl.style.display = "none";
}
/* ── SUBMIT REVIEW ───────────────────────────────────── */
function submitReview() {
  if (!window.reviewData) {
    alert("No review data found. Please try again.");
    return;
  }

  if (!selectedRating) {
    const starErrEl = document.getElementById("reviewStarError");
    if (starErrEl) starErrEl.style.display = "block";
    return;
  }

  const commentEl = document.getElementById("reviewComment");
  const comment = commentEl ? commentEl.value.trim() : "";

  const submitBtn = document.getElementById("reviewSubmitBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
  }

  fetch("http://localhost:5000/api/reviews/submit", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      booking_id: window.reviewData.booking_id,
      user_id: window.reviewData.user_id,
      vehicle_id: window.reviewData.vehicle_id,
      rating: selectedRating,
      comment,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(() => {
      const formView = document.getElementById("reviewFormView");
      const successView = document.getElementById("reviewSuccessView");
      const successStars = document.getElementById("reviewSuccessStars");

      if (formView) formView.style.display = "none";
      if (successView) successView.style.display = "flex";
      if (successStars) {
        successStars.textContent =
          "★".repeat(selectedRating) + "☆".repeat(5 - selectedRating);
      }

      sessionStorage.setItem(
        "reviewed_" + window.reviewData.booking_id,
        "true",
      );

      window.reviewData = null;
      selectedRating = 0;
    })
    .catch((err) => {
      console.error("Review submit error:", err);
      alert("Failed to submit review. Please try again.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Review";
      }
    });
}

/* ── NOTIFICATIONS COUNT ─────────────────────────────── */
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
    /* Silently fail — non-critical */
  }
}

/* ── INIT ────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  await loadUserProfile();
  await Promise.allSettled([
    loadStats(),
    loadRecentBookings(),
    loadNotifCount(),
  ]);
});

/* ── AUTO-REFRESH every 60 seconds ──────────────────── */
setInterval(async () => {
  await Promise.allSettled([loadStats(), loadNotifCount()]);
}, 60_000);
