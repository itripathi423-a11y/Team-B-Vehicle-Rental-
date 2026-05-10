document.addEventListener("DOMContentLoaded", () => {
  // ── Auth Guard ──────────────────────────────────────────────────────────────
  async function redirectIfLoggedIn(loggedInPage, guestPage) {
    try {
      const res = await fetch("http://localhost:5000/api/user/profile", {
        credentials: "include",
      });
      if (res.ok) {
        window.location.href = loggedInPage;
      } else {
        window.location.href = guestPage;
      }
    } catch (err) {
      window.location.href = guestPage;
    }
  }

  // ── Check login status (returns boolean) ────────────────────────────────────
  async function isLoggedIn() {
    try {
      const res = await fetch("http://localhost:5000/api/user/profile", {
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Load Featured Vehicles ──────────────────────────────────────────────────
  fetch("http://localhost:5000/api/vehicles?limit=3")
    .then((res) => res.json())
    .then((response) => {
      let cars = response.data || [];
      const container = document.querySelector(".grid");
      container.innerHTML = "";

      cars.sort((a, b) => b.id - a.id);
      cars = cars.slice(0, 3);

      cars.forEach((car) => {
        const card = document.createElement("div");
        card.classList.add("card");
        card.innerHTML = `
          <div class="card-img">
            <img src="http://localhost:5000/uploads/vehicles/${car.thumbnail}"
                 alt="${car.name}"
                 onerror="this.style.background='#1e1e1e'" />
          </div>
          <div class="card-content">
            <div class="card-top">
              <h3>${car.name}</h3>
              <span class="card-type">
                ${car.body_type || "—"} • ${car.transmission || "—"}
              </span>
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

  // ── Load Popular Destinations ───────────────────────────────────────────────
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
            <img src="http://localhost:5000/uploads/vehicles/${dest.image_url}"
                 alt="${dest.name}"
                 style="cursor:pointer" />
            <div class="dest-overlay"><h3>${dest.name}</h3></div>
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
          const inRange = i >= page * PAGE_SIZE && i < (page + 1) * PAGE_SIZE;
          card.style.display = inRange ? "" : "none";
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

  // ── Load Tour Packages ──────────────────────────────────────────────────────
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
      const GRADIENTS = [
        "pkg-gradient--green",
        "pkg-gradient--navy",
        "pkg-gradient--brown",
        "pkg-gradient--purple",
        "pkg-gradient--teal",
        "pkg-gradient--red",
      ];

      const MOUNTAIN_SVG = `<svg viewBox="0 0 80 50" fill="none" stroke="white" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
        <polyline points="5,45 30,12 50,30 65,18 75,45"/>
        <circle cx="60" cy="14" r="5" fill="white" opacity="0.4"/>
      </svg>`;

      packages.forEach((pkg, i) => {
        const badge = BADGE_LABELS[i % BADGE_LABELS.length];
        const gradient = GRADIENTS[i % GRADIENTS.length];
        const price = Number(pkg.price).toLocaleString();
        const days = pkg.duration_days || 1;
        const fallbackHTML = `<div class="pkg-gradient ${gradient}">${MOUNTAIN_SVG}</div>`;
        const imgHTML = pkg.image_url
          ? `<img src="http://localhost:5000/uploads/tours/${pkg.image_url}" alt="${pkg.title}" data-fallback="true" />`
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
            <h3 class="pkg-title">${pkg.title}</h3>
            <p class="pkg-desc">${pkg.description || pkg.destination_name || "An unforgettable journey through Nepal."}</p>
            <div class="pkg-footer">
              <div>
                <p class="pkg-price-label">NPR</p>
                <p class="pkg-price">${price}<span>per package</span></p>
              </div>
              <button class="pkg-book-btn"
                data-id="${pkg.id}"
                data-vehicle-id="${pkg.vehicle_id || ""}"
                data-title="${encodeURIComponent(pkg.title)}"
                data-price="${pkg.price}"
                data-days="${days}"
                data-image="${pkg.image_url || ""}">
                Book Now
              </button>
            </div>
          </div>
        `;

        // ── Tour Package Book Now — auth-aware ──────────────────────────────
        card
          .querySelector(".pkg-book-btn")
          .addEventListener("click", async (e) => {
            e.stopPropagation();

            const btn = e.currentTarget;
            btn.textContent = "Checking...";
            btn.disabled = true;

            const loggedIn = await isLoggedIn();

            if (!loggedIn) {
              // Not logged in → go to login page, remember intent
              sessionStorage.setItem(
                "postLoginRedirect",
                buildPackageBookingURL(btn),
              );
              window.location.href = "../index.html";
              return;
            }

            // Logged in → go directly to booking page with package data pre-filled
            window.location.href = buildPackageBookingURL(btn);
          });

        grid.appendChild(card);

        const imgEl = card.querySelector("img[data-fallback]");
        if (imgEl) {
          imgEl.addEventListener("error", () => {
            imgEl.parentElement.innerHTML = fallbackHTML;
          });
        }
      });

      const PAGE_SIZE = 3;
      let page = 0;
      const totalPages = Math.ceil(packages.length / PAGE_SIZE);

      function updatePkgGrid() {
        grid.querySelectorAll(".pkg-card").forEach((card, i) => {
          const inRange = i >= page * PAGE_SIZE && i < (page + 1) * PAGE_SIZE;
          card.style.display = inRange ? "" : "none";
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

  // ── Search Button ───────────────────────────────────────────────────────────
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
});

// ── Build booking URL with package data as params ─────────────────────────────
function buildPackageBookingURL(btn) {
  const params = new URLSearchParams({
    source: "package",
    pkg_id: btn.dataset.id || "",
    vehicle_id: btn.dataset.vehicleId || "",
    pkg_title: decodeURIComponent(btn.dataset.title || ""),
    pkg_price: btn.dataset.price || "",
    pkg_days: btn.dataset.days || "1",
    pkg_image: btn.dataset.image || "",
  });
  return `../USER%20DASHBOARD/user.booking.html?${params.toString()}`;
}

function goToCar(destinationId) {
  window.location.href = `/HOME/car.html?destination_id=${destinationId}`;
}
