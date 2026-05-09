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
              <span class="card-type">
                ${car.body_type || "—"} • ${car.transmission || "—"}
              </span>
            </div>

            <div class="price-block">
              <div>
                <span>4 hr</span>
                <span>Rs ${Number(car.price_4h).toLocaleString()}</span>
              </div>

              <div>
                <span>8 hr</span>
                <span>Rs ${Number(car.price_8h).toLocaleString()}</span>
              </div>

              <div>
                <span>1 day</span>
                <span>Rs ${Number(car.price_1d).toLocaleString()}</span>
              </div>
            </div>

            <button class="card-btn" data-id="${car.id}">
              View Details
            </button>
          </div>
        `;

        container.appendChild(card);
      });

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
         style="cursor:pointer"
         onclick="goToCar('${dest.id}')" />
    <div class="dest-overlay">
      <h3>${dest.name}</h3>
    </div>
  </div>
`;
            function goToCarPage(destinationId) {
              window.location.href = `/HOME/car.html?destination_id=${destinationId}`;
            }

            card.addEventListener("click", () => {
              window.location.href = `/HOME/car.html?destination_id=${dest.id}`;
            });
            grid.appendChild(card);
          });

          const PAGE_SIZE = 3;
          let page = 0;
          const totalPages = Math.ceil(destinations.length / PAGE_SIZE);

          function updateGrid() {
            grid.querySelectorAll(".dest-card").forEach((card, i) => {
              const inRange =
                i >= page * PAGE_SIZE && i < (page + 1) * PAGE_SIZE;
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

      // ── View Details ─────────────────────────────────────────────
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

    .catch((err) => console.error("Fetch error:", err));

  // ── Search Button ─────────────────────────────────────────────
  document.querySelector(".search-btn")?.addEventListener("click", () => {
    const fuel = document.querySelector(".fuelType select")?.value || "";

    const body = document.querySelector(".bodyType select")?.value || "";

    const transmission =
      document.querySelector(".transmissionType select")?.value || "";

    const params = new URLSearchParams();

    if (fuel) params.set("fuel_type", fuel);
    if (body) params.set("body_type", body);
    if (transmission) params.set("transmission", transmission);

    // GO TO car.html WITH SEARCH VALUES
    window.location.href = `/HOME/car.html?${params.toString()}`;
  });

  // ── Auth Guard ─────────────────────────────────────────────
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
});
function goToCar(destinationId) {
  window.location.href = `/HOME/car.html?destination_id=${destinationId}`;
}
