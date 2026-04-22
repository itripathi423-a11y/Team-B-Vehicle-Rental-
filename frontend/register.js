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

    // Name validation (only letters, min 3 chars)
    const nameRegex = /^[A-Za-z\s]{3,}$/;
    if (!nameRegex.test(name)) {
      message.style.color = "red";
      message.textContent =
        "Name must be at least 3 letters and contain only alphabets";
      return;
    }

    // Email validation (proper format)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      message.style.color = "red";
      message.textContent = "Enter a valid email address";
      return;
    }

    // Phone validation (exactly 10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      message.style.color = "red";
      message.textContent = "Phone number must be exactly 10 digits";
      return;
    }

    // Password validation
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(password)) {
      message.style.color = "red";
      message.textContent =
        "Password must be 8+ chars with uppercase, lowercase, number & special character";
      return;
    }

    // Confirm password
    if (password !== confirmPassword) {
      message.style.color = "red";
      message.textContent = "Passwords do not match";
      return;
    }

    // API call
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
        window.location.href = "index.html";
      }, 1000);
    } else {
      message.style.color = "red";
      message.textContent = data.message;
    }
  });
