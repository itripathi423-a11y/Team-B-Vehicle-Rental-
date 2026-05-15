"use strict";
// ── AUTO REDIRECT LOGGED-IN USER TO DASHBOARD ──
(async () => {
  try {
    const res = await fetch("http://localhost:5000/api/user/profile", {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      const role = data.user?.role || data.role;
      if (role === "user") {
        window.location.href = "/USER DASHBOARD/userdashboard.html";
      }
      // admin stays on homepage — do nothing
    }
  } catch {
    // not logged in — stay on homepage
  }
})();

function escHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function vehicleEmoji(t) {
  return (
    { SUV: "🚙", Sedan: "🚗", Hatchback: "🚗", Pickup: "🛻", Van: "🚐" }[t] ||
    "🚗"
  );
}

function buildPackageBookingURL(pkg) {
  const params = new URLSearchParams({
    source: "package",
    pkg_id: pkg.id || "",
    vehicle_id: pkg.vehicle_id || "",
    pkg_title: pkg.title || "",
    pkg_price: pkg.price || "",
    pkg_days: pkg.duration_days || "1",
    pkg_image: pkg.image_url || "",
  });
  return `../USER%20DASHBOARD/user.booking.html?${params.toString()}`;
}

async function getUserRole() {
  try {
    const res = await fetch("http://localhost:5000/api/user/profile", {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user?.role || data.role || null;
  } catch {
    return null;
  }
}

async function isLoggedIn() {
  const role = await getUserRole();
  return role !== null;
}

async function redirectIfLoggedIn(loggedInPage, guestPage) {
  const role = await getUserRole();
  if (role === "user") {
    window.location.href = loggedInPage;
  } else if (role === "admin") {
    window.location.href = guestPage;
  } else {
    window.location.href = guestPage;
  }
}

// ── Package modal constants ───────────────────────────────────────────────────

const GRADIENTS_HP = [
  "pkg-gradient--green",
  "pkg-gradient--navy",
  "pkg-gradient--brown",
  "pkg-gradient--purple",
  "pkg-gradient--teal",
  "pkg-gradient--red",
];

const MOUNTAIN_SVG_HP = `<svg viewBox="0 0 80 50" fill="none" stroke="white" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
  <polyline points="5,45 30,12 50,30 65,18 75,45"/>
  <circle cx="60" cy="14" r="5" fill="white" opacity="0.4"/>
</svg>`;

// ── Package detail modal ──────────────────────────────────────────────────────

function openPkgModal(pkg, idx) {
  const modal = document.getElementById("pkgDetailModal");
  if (!modal) return;

  const gradient = GRADIENTS_HP[idx % GRADIENTS_HP.length];

  const heroEl = modal.querySelector(".pkm-hero");
  if (heroEl) {
    if (pkg.image_url) {
      heroEl.innerHTML = `<img
        src="http://localhost:5000/uploads/tours/${escHtml(pkg.image_url)}"
        alt="${escHtml(pkg.title)}"
        onerror="this.parentElement.innerHTML='<div class=\\'pkm-hero-fallback pkg-gradient ${gradient}\\'>${MOUNTAIN_SVG_HP}</div>'" />`;
    } else {
      heroEl.innerHTML = `<div class="pkm-hero-fallback pkg-gradient ${gradient}">${MOUNTAIN_SVG_HP}</div>`;
    }
  }

  modal.querySelector(".pkm-title").textContent = pkg.title || "—";
  modal.querySelector(".pkm-desc").textContent =
    pkg.description || "An unforgettable journey through Nepal.";
  modal.querySelector(".pkm-duration").textContent =
    `${pkg.duration_days || 1} ${pkg.duration_days === 1 ? "Day" : "Days"}`;
  modal.querySelector(".pkm-price-val").textContent = `Rs ${Number(
    pkg.price,
  ).toLocaleString("en-IN")}`;

  const vehicle = pkg.vehicle_id
    ? {
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
      }
    : null;

  const vehSection = modal.querySelector(".pkm-vehicle-section");
  const vehThumb = modal.querySelector(".pkm-veh-thumb");
  const vehName = modal.querySelector(".pkm-veh-name");
  const vehMeta = modal.querySelector(".pkm-veh-meta");
  const vehFeatures = modal.querySelector(".pkm-veh-features");

  if (vehicle) {
    vehSection.style.display = "block";

    if (vehThumb) {
      vehThumb.innerHTML = vehicle.thumbnail
        ? `<img
            src="http://localhost:5000/uploads/vehicles/${escHtml(vehicle.thumbnail)}"
            alt="${escHtml(vehicle.name)}"
            onerror="this.parentElement.textContent='${vehicleEmoji(vehicle.body_type)}'" />`
        : vehicleEmoji(vehicle.body_type);
    }

    if (vehName) vehName.textContent = vehicle.name || "—";

    if (vehMeta) {
      vehMeta.textContent = [
        vehicle.brand,
        vehicle.model,
        vehicle.year,
        vehicle.body_type,
        vehicle.fuel_type,
        vehicle.transmission,
        vehicle.seating_capacity ? vehicle.seating_capacity + " seats" : null,
      ]
        .filter(Boolean)
        .join(" · ");
    }

    if (vehFeatures) {
      let features = [];
      try {
        features = JSON.parse(vehicle.features || "[]");
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
    vehSection.style.display = "none";
  }

  const bookBtn = modal.querySelector(".pkm-book-btn");
  if (bookBtn) {
    const freshBtn = bookBtn.cloneNode(true);
    bookBtn.replaceWith(freshBtn);

    freshBtn.addEventListener("click", async () => {
      freshBtn.textContent = "Checking...";
      freshBtn.disabled = true;

      const role = await getUserRole();
      const url = buildPackageBookingURL(pkg);

      if (!role) {
        sessionStorage.setItem("postLoginRedirect", url);
        window.location.href = "../index.html";
        return;
      }

      if (role === "admin") {
        freshBtn.textContent = "Book Now";
        freshBtn.disabled = false;
        return; // admin stays on page
      }

      window.location.href = url;
    });
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closePkgModal() {
  const modal = document.getElementById("pkgDetailModal");
  if (modal) modal.classList.remove("open");
  document.body.style.overflow = "";
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("pkgDetailModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closePkgModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePkgModal();
  });

  // ── Featured Vehicles ───────────────────────────────────────────────────────
  fetch("http://localhost:5000/api/vehicles?limit=3")
    .then((res) => res.json())
    .then((response) => {
      let cars = response.data || [];
      const container = document.querySelector(".grid");
      if (!container) return;
      container.innerHTML = "";

      cars.sort((a, b) => b.id - a.id);
      cars = cars.slice(0, 3);

      cars.forEach((car) => {
        const card = document.createElement("div");
        card.classList.add("card");
        card.innerHTML = `
          <div class="card-img">
            <img
              src="http://localhost:5000/uploads/vehicles/${escHtml(car.thumbnail)}"
              alt="${escHtml(car.name)}"
              onerror="this.style.background='#1e1e1e'" />
          </div>
          <div class="card-content">
            <div class="card-top">
              <h3>${escHtml(car.name)}</h3>
              <span class="card-type">${escHtml(car.body_type || "—")} • ${escHtml(car.transmission || "—")}</span>
            </div>
            <div class="price-block">
              <div><span>4 hr</span><span>Rs ${Number(car.price_4h).toLocaleString()}</span></div>
              <div><span>8 hr</span><span>Rs ${Number(car.price_8h).toLocaleString()}</span></div>
              <div><span>1 day</span><span>Rs ${Number(car.price_1d).toLocaleString()}</span></div>
            </div>
            <button class="card-btn" data-id="${car.id}">View Details</button>
          </div>
        `;
        container.appendChild(card);
      });

      document.querySelectorAll(".card-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          redirectIfLoggedIn(
            `/USER%20DASHBOARD/vehicle-details.html?id=${id}`,
            `/HOME/cars-details.html?id=${id}`,
          );
        });
      });
    })
    .catch((err) => console.error("Vehicles fetch error:", err));

  // ── Popular Destinations ────────────────────────────────────────────────────
  fetch("http://localhost:5000/api/destinations")
    .then((res) => res.json())
    .then((response) => {
      const destinations = response.data || [];
      const grid = document.getElementById("destinationsGrid");
      const prevBtn = document.getElementById("destPrev");
      const nextBtn = document.getElementById("destNext");
      if (!grid) return;

      grid.innerHTML = "";

      destinations.forEach((dest) => {
        const card = document.createElement("div");
        card.classList.add("dest-card");
        card.innerHTML = `
          <div class="dest-img-wrap">
            <img
              src="http://localhost:5000/uploads/vehicles/${escHtml(dest.image_url)}"
              alt="${escHtml(dest.name)}"
              style="cursor:pointer" />
            <div class="dest-overlay"><h3>${escHtml(dest.name)}</h3></div>
          </div>
        `;
        card.addEventListener("click", () => {
          window.location.href = `/HOME/car.html?destination_id=${dest.id}`;
        });
        grid.appendChild(card);
      });

      const PAGE_SIZE = 3;
      let page = 0;
      const totalPages = Math.ceil(destinations.length / PAGE_SIZE);

      function updateDestGrid() {
        grid.querySelectorAll(".dest-card").forEach((card, i) => {
          card.style.display =
            i >= page * PAGE_SIZE && i < (page + 1) * PAGE_SIZE ? "" : "none";
        });
        prevBtn.classList.toggle("hidden", page === 0);
        nextBtn.classList.toggle("hidden", page >= totalPages - 1);
      }

      prevBtn.addEventListener("click", () => {
        if (page > 0) {
          page--;
          updateDestGrid();
        }
      });
      nextBtn.addEventListener("click", () => {
        if (page < totalPages - 1) {
          page++;
          updateDestGrid();
        }
      });

      updateDestGrid();
    })
    .catch((err) => console.error("Destinations fetch error:", err));

  // ── Tour Packages ───────────────────────────────────────────────────────────
  fetch("http://localhost:5000/api/tour-packages")
    .then((res) => res.json())
    .then((response) => {
      const packages = response.data || [];
      const grid = document.getElementById("packagesGrid");
      const prevBtn = document.getElementById("pkgPrev");
      const nextBtn = document.getElementById("pkgNext");
      if (!grid) return;

      grid.innerHTML = "";

      if (packages.length === 0) {
        grid.innerHTML =
          '<p class="no-results" style="grid-column:1/-1;padding:40px 0">No packages available right now.</p>';
        return;
      }

      const BADGE_LABELS = [
        "MOST POPULAR",
        "BEST VALUE",
        "ADVENTURE",
        "EXCLUSIVE",
        "TOP RATED",
        "NEW",
      ];

      packages.forEach((pkg, i) => {
        const badge = BADGE_LABELS[i % BADGE_LABELS.length];
        const gradient = GRADIENTS_HP[i % GRADIENTS_HP.length];
        const price = Number(pkg.price).toLocaleString();
        const days = pkg.duration_days || 1;
        const fallbackHTML = `<div class="pkg-gradient ${gradient}">${MOUNTAIN_SVG_HP}</div>`;
        const imgHTML = pkg.image_url
          ? `<img src="http://localhost:5000/uploads/tours/${escHtml(pkg.image_url)}" alt="${escHtml(pkg.title)}" data-fallback="true" />`
          : fallbackHTML;

        const card = document.createElement("div");
        card.classList.add("pkg-card");
        card.innerHTML = `
          <div class="pkg-img-wrap">
            ${imgHTML}
            <span class="pkg-badge">${badge}</span>
            <div class="pkg-duration">
              <span class="pkg-duration-dot"></span>
              ${days} ${days === 1 ? "Day" : "Days"}
            </div>
          </div>
          <div class="pkg-body">
            <h3 class="pkg-title">${escHtml(pkg.title)}</h3>
            <p class="pkg-desc">${escHtml(pkg.description || pkg.destination_name || "An unforgettable journey through Nepal.")}</p>
            <div class="pkg-footer">
              <div>
                <p class="pkg-price-label">NPR</p>
                <p class="pkg-price">${price}<span>per package</span></p>
              </div>
              <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
                <button class="pkg-view-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  View
                </button>
                <button class="pkg-book-btn">Book Now</button>
              </div>
            </div>
          </div>
        `;

        const imgEl = card.querySelector("img[data-fallback]");
        if (imgEl) {
          imgEl.addEventListener("error", () => {
            imgEl.parentElement.innerHTML = fallbackHTML;
          });
        }

        card.querySelector(".pkg-view-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          openPkgModal(pkg, i);
        });

        card
          .querySelector(".pkg-book-btn")
          .addEventListener("click", async (e) => {
            e.stopPropagation();
            const btn = e.currentTarget;
            btn.textContent = "Checking...";
            btn.disabled = true;

            const role = await getUserRole();
            const url = buildPackageBookingURL(pkg);

            if (!role) {
              sessionStorage.setItem("postLoginRedirect", url);
              window.location.href = "../index.html";
              return;
            }

            if (role === "admin") {
              btn.textContent = "Book Now";
              btn.disabled = false;
              return; // admin stays on page
            }

            window.location.href = url;
          });

        grid.appendChild(card);
      });

      const PAGE_SIZE = 3;
      let page = 0;
      const totalPages = Math.ceil(packages.length / PAGE_SIZE);

      function updatePkgGrid() {
        grid.querySelectorAll(".pkg-card").forEach((card, i) => {
          card.style.display =
            i >= page * PAGE_SIZE && i < (page + 1) * PAGE_SIZE ? "" : "none";
        });
        prevBtn.classList.toggle("hidden", page === 0);
        nextBtn.classList.toggle("hidden", page >= totalPages - 1);
      }

      prevBtn.addEventListener("click", () => {
        if (page > 0) {
          page--;
          updatePkgGrid();
        }
      });
      nextBtn.addEventListener("click", () => {
        if (page < totalPages - 1) {
          page++;
          updatePkgGrid();
        }
      });

      updatePkgGrid();
    })
    .catch((err) => console.error("Packages fetch error:", err));

  // ── Search button ───────────────────────────────────────────────────────────
  document.querySelector(".search-btn")?.addEventListener("click", () => {
    const fuel = document.querySelector(".fuelType select")?.value || "";
    const body = document.querySelector(".bodyType select")?.value || "";
    const transmission =
      document.querySelector(".transmissionType select")?.value || "";

    const params = new URLSearchParams();
    if (fuel) params.set("fuel_type", fuel);
    if (body) params.set("body_type", body);
    if (transmission) params.set("transmission", transmission);

    window.location.href = `/HOME/car.html?${params.toString()}`;
  });

  // ── Browse All Cars CTA ─────────────────────────────────────────────────────
  document.getElementById("browseBtn")?.addEventListener("click", () => {
    redirectIfLoggedIn(
      "/USER%20DASHBOARD/user.vehicle.listing.html",
      "/HOME/car.html", // admin + guest both go here
    );
  });
});
