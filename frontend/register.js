document
  .getElementById("register-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const message = document.getElementById("register-message");

    if (password !== confirmPassword) {
      message.style.color = "red";
      message.textContent = "Passwords do not match";
      return;
    }

    const res = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password }),
    });

    const data = await res.json();

    if (data.success) {
      message.style.color = "green";
      message.textContent = data.message;

      setTimeout(() => {
        window.location.href = "/USER DASHBOARD/userdashboard.html";
      }, 1000);
    } else {
      message.style.color = "red";
      message.textContent = data.message;
    }
  });
