// ===== ISHAN RENTAL — script.js =====

// Browse button CTA
document.getElementById("browseBtn")?.addEventListener("click", () => {
  document.querySelector(".fleet-section")?.scrollIntoView({ behavior: "smooth" });
});

// Navbar scroll effect
const navbar = document.querySelector(".navbar");
window.addEventListener("scroll", () => {
  if (window.scrollY > 60) {
    navbar.style.padding = "14px 60px";
    navbar.style.background = "rgba(10,10,10,0.95)";
  } else {
    navbar.style.padding = "20px 60px";
    navbar.style.background = "rgba(10,10,10,0.6)";
  }
});

// Card "Book" buttons
document.querySelectorAll(".card-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const carName = btn.closest(".card").querySelector("h3").textContent;
    alert(`Booking request for: ${carName}\nOur team will contact you shortly!`);
  });
});

// Search button
document.querySelector(".search-btn")?.addEventListener("click", () => {
  const location = document.querySelector(".search-fields input[type='text']").value;
  const pickup = document.querySelectorAll(".search-fields input[type='date']")[0].value;
  const dropoff = document.querySelectorAll(".search-fields input[type='date']")[1].value;

  if (!location || !pickup || !dropoff) {
    alert("Please fill in all search fields.");
    return;
  }

  alert(`Searching for cars in ${location}\nFrom: ${pickup} → To: ${dropoff}`);
});

// Animate cards on scroll (Intersection Observer)
const cards = document.querySelectorAll(".card, .feature-item");
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

cards.forEach((card, i) => {
  card.style.opacity = "0";
  card.style.transform = "translateY(30px)";
  card.style.transition = `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`;
  observer.observe(card);
});