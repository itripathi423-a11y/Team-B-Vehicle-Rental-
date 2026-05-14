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

    // RESET MESSAGE
    message.textContent = "";

    // ───────────────── NAME VALIDATION ─────────────────
    // Only letters and spaces, minimum 3 characters
    const nameRegex = /^[A-Za-z\s]{3,}$/;

    if (name === "") {
      message.style.color = "red";
      message.textContent = "Name is required";
      return;
    }

    if (!nameRegex.test(name)) {
      message.style.color = "red";
      message.textContent =
        "Name must contain only letters and be at least 3 characters";
      return;
    }

    // ───────────────── EMAIL VALIDATION ─────────────────
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email === "") {
      message.style.color = "red";
      message.textContent = "Email is required";
      return;
    }

    if (!emailRegex.test(email)) {
      message.style.color = "red";
      message.textContent = "Enter a valid email address";
      return;
    }

    // ───────────────── PHONE VALIDATION ─────────────────

    if (phone === "") {
      message.style.color = "red";
      message.textContent = "Phone number is required";
      return;
    }

    // Check if contains letters
    if (/[A-Za-z]/.test(phone)) {
      message.style.color = "red";
      message.textContent = "Phone number cannot contain alphabets";
      return;
    }

    // Check special characters
    if (!/^\d+$/.test(phone)) {
      message.style.color = "red";
      message.textContent = "Phone number must contain only numbers";
      return;
    }

    // Exact 10 digits
    if (phone.length !== 10) {
      message.style.color = "red";
      message.textContent = "Phone number must be exactly 10 digits";
      return;
    }

    // ───────────────── PASSWORD VALIDATION ─────────────────

    if (password === "") {
      message.style.color = "red";
      message.textContent = "Password is required";
      return;
    }

    // Minimum 8 characters
    if (password.length < 8) {
      message.style.color = "red";
      message.textContent = "Password must be at least 8 characters";
      return;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
      message.style.color = "red";
      message.textContent = "Password must contain at least 1 uppercase letter";
      return;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
      message.style.color = "red";
      message.textContent = "Password must contain at least 1 lowercase letter";
      return;
    }

    // Number check
    if (!/\d/.test(password)) {
      message.style.color = "red";
      message.textContent = "Password must contain at least 1 number";
      return;
    }

    // Special character check
    if (!/[@$!%*?&]/.test(password)) {
      message.style.color = "red";
      message.textContent =
        "Password must contain at least 1 special character";
      return;
    }

    // ───────────────── CONFIRM PASSWORD ─────────────────

    if (confirmPassword === "") {
      message.style.color = "red";
      message.textContent = "Please confirm your password";
      return;
    }

    if (password !== confirmPassword) {
      message.style.color = "red";
      message.textContent = "Passwords do not match";
      return;
    }

    // ───────────────── API CALL ─────────────────

    try {
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
        }),
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
    } catch (error) {
      message.style.color = "red";
      message.textContent = "Server error. Please try again later.";
    }
  });
// PASSWORD TOGGLE
function toggleEye(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);

  const isHidden = input.type === "password";

  input.type = isHidden ? "text" : "password";

  btn.innerHTML = isHidden
    ? `
        <svg viewBox="0 0 24 24">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
        `
    : `
        <svg viewBox="0 0 24 24">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>
        </svg>
        `;
}

// PASSWORD
document.getElementById("togglePassword").addEventListener("click", () => {
  toggleEye("password", "togglePassword");
});

// CONFIRM PASSWORD
document
  .getElementById("toggleConfirmPassword")
  .addEventListener("click", () => {
    toggleEye("confirm-password", "toggleConfirmPassword");
  });
