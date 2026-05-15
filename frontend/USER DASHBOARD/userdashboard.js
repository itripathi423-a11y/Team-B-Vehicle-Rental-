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

  fetch(`http://localhost:5000/api/reviews/form/${bookingId}`, {
    credentials: "include",
    headers: authHeaders(),
  })
    .then((res) => {
      if (res.status === 409) {
        sessionStorage.setItem(sessionKey, "true");
        return null;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!data) return;

      sessionStorage.setItem(sessionKey, "true");

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
        let starsHtml = "";
        for (let i = 1; i <= 5; i++) {
          starsHtml += `
            <svg viewBox="0 0 24 24" style="width:22px;height:22px">
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                fill="${i <= selectedRating ? "#f59e0b" : "#e5e7eb"}"
                stroke="${i <= selectedRating ? "#d97706" : "#d1d5db"}"
                stroke-width="1"
              />
            </svg>`;
        }
        successStars.innerHTML = starsHtml;
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

/* ══════════════════════════════════════════════════════
   TOUR PACKAGE DETAIL MODAL
   ══════════════════════════════════════════════════════ */

/**
 * Opens the tour package detail modal with full package + vehicle info.
 * The "Book Now" button inside the modal fires the same booking redirect
 * that the old "Book Now" card button used.
 */
function openPkgModal(pkg) {
  const modal = document.getElementById("pkgDetailModal");
  if (!modal) return;

  const IMAGE_BASE_TOUR = "http://localhost:5000/uploads/tours/";
  const IMAGE_BASE_VEH = "http://localhost:5000/uploads/vehicles/";

  const GRADIENTS = [
    "dp-gradient--green",
    "dp-gradient--navy",
    "dp-gradient--brown",
    "dp-gradient--purple",
    "dp-gradient--teal",
    "dp-gradient--red",
  ];
  const MOUNTAIN_SVG = `<svg viewBox="0 0 80 50" fill="none" stroke="white" stroke-width="1.5"><polyline points="5,45 30,12 50,30 65,18 75,45"/><circle cx="60" cy="14" r="5" fill="white" opacity="0.4"/></svg>`;

  const gradientClass = GRADIENTS[pkg._index % GRADIENTS.length];

  /* Hero image */
  const heroEl = modal.querySelector(".pkm-hero");
  if (heroEl) {
    if (pkg.image_url) {
      heroEl.innerHTML = `<img src="${IMAGE_BASE_TOUR}${escHtml(pkg.image_url)}"
        alt="${escHtml(pkg.title)}"
        onerror="this.parentElement.innerHTML='<div class=\\'pkm-hero-fallback ${gradientClass}\\'>${MOUNTAIN_SVG}</div>'" />`;
    } else {
      heroEl.innerHTML = `<div class="pkm-hero-fallback ${gradientClass}">${MOUNTAIN_SVG}</div>`;
    }
  }

  /* Package info */
  modal.querySelector(".pkm-title").textContent = pkg.title || "—";
  modal.querySelector(".pkm-desc").textContent =
    pkg.description || "An unforgettable journey through Nepal.";
  modal.querySelector(".pkm-duration").textContent =
    `${pkg.duration_days || 1} ${pkg.duration_days === 1 ? "Day" : "Days"}`;
  modal.querySelector(".pkm-price-val").textContent =
    `Rs ${Number(pkg.price).toLocaleString("en-IN")}`;

  /* Vehicle section */
  const vehSection = modal.querySelector(".pkm-vehicle-section");
  const vehThumb = modal.querySelector(".pkm-veh-thumb");
  const vehName = modal.querySelector(".pkm-veh-name");
  const vehMeta = modal.querySelector(".pkm-veh-meta");
  const vehFeatures = modal.querySelector(".pkm-veh-features");

  if (pkg.vehicle) {
    const v = pkg.vehicle;
    if (vehSection) vehSection.style.display = "block";

    /* Thumbnail */
    if (vehThumb) {
      if (v.thumbnail) {
        vehThumb.innerHTML = `<img src="${IMAGE_BASE_VEH}${escHtml(v.thumbnail)}"
          alt="${escHtml(v.name)}"
          onerror="this.parentElement.textContent='${vehicleEmoji(v.body_type)}'" />`;
      } else {
        vehThumb.textContent = vehicleEmoji(v.body_type);
      }
    }

    if (vehName) vehName.textContent = v.name || "—";
    if (vehMeta) {
      vehMeta.textContent =
        `${v.brand || ""} ${v.model || ""} · ${v.year || ""} · ${v.body_type || ""} · ${v.fuel_type || ""} · ${v.transmission || ""} · ${v.seating_capacity || "—"} seats`
          .replace(/^\s·\s/, "")
          .trim();
    }

    /* Features */
    if (vehFeatures) {
      let features = [];
      try {
        features = JSON.parse(v.features || "[]");
      } catch {}
      if (features.length) {
        vehFeatures.innerHTML = features
          .map((f) => `<span class="pkm-feature-tag">${escHtml(f)}</span>`)
          .join("");
        vehFeatures.style.display = "flex";
      } else {
        vehFeatures.style.display = "none";
      }
    }
  } else {
    if (vehSection) vehSection.style.display = "none";
  }

  /* Wire the Book Now button */
  const bookBtn = modal.querySelector(".pkm-book-btn");
  if (bookBtn) {
    bookBtn.onclick = () => {
      const params = new URLSearchParams({
        source: "package",
        pkg_id: pkg.id || "",
        vehicle_id: pkg.vehicle_id || "",
        pkg_title: pkg.title || "",
        pkg_price: pkg.price || "",
        pkg_days: pkg.duration_days || "1",
        pkg_image: pkg.image_url || "",
      });
      window.location.href = `user.booking.html?${params.toString()}`;
    };
  }

  /* Show modal */
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closePkgModal() {
  const modal = document.getElementById("pkgDetailModal");
  if (modal) modal.classList.remove("open");
  document.body.style.overflow = "";
}

/* Close on backdrop click */
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("pkgDetailModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closePkgModal();
    });
  }

  /* ESC key */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePkgModal();
  });
});

/* ── 4. TOUR PACKAGES ────────────────────────────────── */
async function loadTourPackages() {
  const grid = document.getElementById("dashPkgGrid");
  const prevBtn = document.getElementById("dashPkgPrev");
  const nextBtn = document.getElementById("dashPkgNext");
  if (!grid) return;

  const PAGE_SIZE = 3;
  let allCards = [];
  let page = 0;

  const BADGE_LABELS = [
    "MOST POPULAR",
    "BEST VALUE",
    "ADVENTURE",
    "EXCLUSIVE",
    "TOP RATED",
    "NEW",
  ];
  const GRADIENTS = [
    "dp-gradient--green",
    "dp-gradient--navy",
    "dp-gradient--brown",
    "dp-gradient--purple",
    "dp-gradient--teal",
    "dp-gradient--red",
  ];
  const MOUNTAIN_SVG = `<svg viewBox="0 0 80 50" fill="none" stroke="white" stroke-width="1.5"><polyline points="5,45 30,12 50,30 65,18 75,45"/><circle cx="60" cy="14" r="5" fill="white" opacity="0.4"/></svg>`;

  function updateCarousel() {
    const total = allCards.length;
    const maxPage = Math.ceil(total / PAGE_SIZE) - 1;

    allCards.forEach((card, i) => {
      card.style.display =
        i >= page * PAGE_SIZE && i < (page + 1) * PAGE_SIZE ? "" : "none";
    });

    if (prevBtn) prevBtn.disabled = page === 0;
    if (nextBtn) nextBtn.disabled = page >= maxPage;
  }

  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      if (page > 0) {
        page--;
        updateCarousel();
      }
    });
  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      const maxPage = Math.ceil(allCards.length / PAGE_SIZE) - 1;
      if (page < maxPage) {
        page++;
        updateCarousel();
      }
    });

  try {
    const res = await fetch("http://localhost:5000/api/tour-packages", {
      credentials: "include",
    });
    const data = await res.json();
    const packages = data.data || [];

    if (!packages.length) {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:32px;color:#9ca3af;font-size:13px;">No packages available right now.</p>`;
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    grid.innerHTML = "";

    packages.forEach((pkg, i) => {
      pkg._index = i;
      // Remap flat vehicle columns → nested pkg.vehicle object
      if (pkg.vehicle_id) {
        pkg.vehicle = {
          id: pkg.vehicle_id,
          name: pkg.vehicle_name,
          brand: pkg.brand,
          model: pkg.model,
          year: pkg.year,
          body_type: pkg.body_type,
          fuel_type: pkg.fuel_type,
          transmission: pkg.transmission,
          seating_capacity: pkg.seating_capacity,
          features: pkg.features,
          thumbnail: pkg.thumbnail,
        };
      }
      const badge = BADGE_LABELS[i % BADGE_LABELS.length];
      const gradient = GRADIENTS[i % GRADIENTS.length];
      const price = Number(pkg.price).toLocaleString();
      const days = pkg.duration_days || 1;
      const imgHTML = pkg.image_url
        ? `<img src="http://localhost:5000/uploads/tours/${escHtml(pkg.image_url)}" alt="${escHtml(pkg.title)}" />`
        : `<div class="dp-gradient ${gradient}">${MOUNTAIN_SVG}</div>`;

      const card = document.createElement("div");
      card.className = "dp-card";
      card.innerHTML = `
        <div class="dp-img-wrap">
          ${imgHTML}
          <span class="dp-badge">${badge}</span>
          <div class="dp-duration">
            <span class="dp-dur-dot"></span>
            ${days} ${days === 1 ? "Day" : "Days"}
          </div>
        </div>
        <div class="dp-body">
          <h3 class="dp-title">${escHtml(pkg.title)}</h3>
          <p class="dp-desc">${escHtml(pkg.description || pkg.destination_name || "An unforgettable journey through Nepal.")}</p>
          <div class="dp-footer">
            <div>
              <p class="dp-price-label">NPR</p>
              <p class="dp-price">${price}<span>per package</span></p>
            </div>
            <button class="dp-view-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              View
            </button>
          </div>
        </div>
      `;

      /* Fix broken tour image */
      const imgEl = card.querySelector("img");
      if (imgEl) {
        imgEl.addEventListener("error", () => {
          imgEl.parentElement.innerHTML = `<div class="dp-gradient ${gradient}">${MOUNTAIN_SVG}</div>`;
        });
      }

      /* View button → open detail modal */
      card.querySelector(".dp-view-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        openPkgModal(pkg);
      });

      /* Clicking the card itself also opens modal */
      card.addEventListener("click", () => openPkgModal(pkg));

      grid.appendChild(card);
      allCards.push(card);
    });

    updateCarousel();
  } catch (err) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:32px;color:#dc2626;font-size:13px;">⚠ Could not load packages.</p>`;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    console.error("Packages load error:", err);
  }
}

/* ── INIT ────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  await loadUserProfile();
  await Promise.allSettled([
    loadStats(),
    loadRecentBookings(),
    loadTourPackages(),
    loadNotifCount(),
  ]);
});

/* ── AUTO-REFRESH every 60 seconds ──────────────────── */
setInterval(async () => {
  await Promise.allSettled([loadStats(), loadNotifCount()]);
}, 60_000);
