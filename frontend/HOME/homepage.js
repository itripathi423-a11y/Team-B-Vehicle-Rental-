document.addEventListener("DOMContentLoaded", () => {
  fetch("http://localhost:5000/api/vehicles?limit=3")
    .then((res) => res.json())
    .then((response) => {
      const cars = response.data;
      const container = document.querySelector(".grid");

      container.innerHTML = "";

      cars.forEach((car) => {
        const card = document.createElement("div");
        card.classList.add("card");

        card.innerHTML = `
          <img src="http://localhost:5000/uploads/vehicles/${car.thumbnail}" />

          <div class="card-info">
            <div class="card-top">
              <h3>${car.name}</h3>
              <span class="card-type">
                ${car.body_type} • ${car.transmission}
              </span>
            </div>

            <div class="card-bottom">
              <div class="price-block">
                <span class="price">Rs ${car.price_1d}</span>
                <span class="per">/day</span>
              </div>

              <button class="card-btn">Book</button>
            </div>
          </div>
        `;

        container.appendChild(card);
      });
    })
    .catch((err) => {
      console.error("Fetch error:", err);
    });
});
