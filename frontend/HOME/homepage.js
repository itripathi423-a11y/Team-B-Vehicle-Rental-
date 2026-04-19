document.addEventListener("DOMContentLoaded", () => {
  fetch("http://localhost:5000/api/vehicles?limit=3")
    .then((res) => res.json())
    .then((response) => {
      let cars = response.data;

      const container = document.querySelector(".grid");
      container.innerHTML = "";

      // ✅ FORCE newest first (in case backend fails)
      cars.sort((a, b) => b.id - a.id);

      // ✅ FORCE ONLY 3 VEHICLES
      cars = cars.slice(0, 3);

      cars.forEach((car) => {
        const card = document.createElement("div");
        card.classList.add("card");

        card.innerHTML = `
          <div class="card-img">
            <img src="http://localhost:5000/uploads/vehicles/${car.thumbnail}" />
          </div>

          <div class="card-content">
            <div class="card-top">
              <h3>${car.name}</h3>
              <span class="card-type">
                ${car.body_type} • ${car.transmission}
              </span>
            </div>

            <div class="price-block">
              <div>4 hr: <span>Rs ${car.price_4h}</span></div>
              <div>8 hr: <span>Rs ${car.price_8h}</span></div>
              <div>1 day: <span>Rs ${car.price_1d}</span></div>
            </div>

            <button class="card-btn">View Details</button>
          </div>
        `;

        container.appendChild(card);
      });
    })
    .catch((err) => {
      console.error("Fetch error:", err);
    });
});
