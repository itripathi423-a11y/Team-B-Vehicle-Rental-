document.addEventListener("DOMContentLoaded", () => {
  // ── Load Featured Vehicles ────────────────────────────────────────────────
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
              <span class="card-type">${car.body_type || "—"} • ${car.transmission || "—"}</span>
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

      document.querySelectorAll(".card-btn[data-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id");
          redirectIfLoggedIn(`../USER DASHBOARD/vehicle-details.html?id=${id}`);
        });
      });
    })
    .catch((err) => console.error("Fetch error:", err));

  // ── Load Popular Destinations ─────────────────────────────────────────────
  fetch("http://localhost:5000/api/destinations")
    .then((res) => res.json())
    .then((response) => {
      console.log("Destinations response:", response);

      const destinations = response.data || [];
      const grid = document.getElementById("destinationsGrid");
      const prevBtn = document.getElementById("destPrev");
      const nextBtn = document.getElementById("destNext");

      if (!grid) {
        console.error("destinationsGrid element not found!");
        return;
      }

      grid.innerHTML = "";

      destinations.forEach((dest) => {
        const card = document.createElement("div");
        card.classList.add("dest-card");
        card.innerHTML = `
    <div class="dest-img-wrap">
      <img src="http://localhost:5000/uploads/vehicles/${dest.image_url}"
           alt="${dest.name}"
           onerror="this.style.display='none'" />
      <div class="dest-overlay">
        <h3>${dest.name}</h3>
      </div>
    </div>
  `;
        grid.appendChild(card);
      });

      const PAGE_SIZE = 3;
      let page = 0;
      const totalPages = Math.ceil(destinations.length / PAGE_SIZE);

      function updateGrid() {
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
          updateGrid();
        }
      });
      nextBtn.addEventListener("click", () => {
        if (page < totalPages - 1) {
          page++;
          updateGrid();
        }
      });

      updateGrid();
    })
    .catch((err) => console.error("Destinations fetch error:", err));

  // ── Search Button ─────────────────────────────────────────────────────────
  document.querySelector(".search-btn")?.addEventListener("click", () => {
    const fuel = document.querySelector(".fuelType select")?.value || "";
    const body = document.querySelector(".bodyType select")?.value || "";
    const transmission =
      document.querySelector(".transmissionType select")?.value || "";

    const params = new URLSearchParams();
    if (fuel) params.set("fuel_type", fuel);
    if (body) params.set("body_type", body);
    if (transmission) params.set("transmission", transmission);

    const qs = params.toString();
    redirectIfLoggedIn(
      `../USER DASHBOARD/user.vehicle.listing.html${qs ? "?" + qs : ""}`,
    );
  });

  // ── Browse All Cars ───────────────────────────────────────────────────────
  document.getElementById("browseBtn")?.addEventListener("click", () => {
    redirectIfLoggedIn("../USER DASHBOARD/user.vehicle.listing.html");
  });

  // ── View All link (fleet section only) ───────────────────────────────────
  document
    .querySelector(".fleet-section .view-all")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      redirectIfLoggedIn("../USER DASHBOARD/user.vehicle.listing.html");
    });

  // ── Auth guard ────────────────────────────────────────────────────────────
  async function redirectIfLoggedIn(destination) {
    try {
      const res = await fetch("/api/user/profile", { credentials: "include" });
      if (res.ok) {
        window.location.href = destination;
      } else {
        window.location.href = `/index.html?redirect=${encodeURIComponent(destination)}`;
      }
    } catch {
      window.location.href = `/index.html?redirect=${encodeURIComponent(destination)}`;
    }
  }
});
