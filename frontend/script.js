document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const messageDiv = document.getElementById("login-message");

  const res = await fetch("http://localhost:5000/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (data.success) {
    messageDiv.style.color = "green";
    messageDiv.textContent = data.message;

    const role = data.user?.role;

    setTimeout(() => {
      const redirect = localStorage.getItem("redirectAfterLogin");

      if (redirect) {
        localStorage.removeItem("redirectAfterLogin");
        window.location.href = redirect;
        return;
      }

      if (role === "admin") {
        window.location.href = "/ADMIN DASHBOARD/dashboard.html";
      } else {
        window.location.href = "/USER DASHBOARD/userdashboard.html";
      }
    }, 1000);
  } else {
    messageDiv.style.color = "red";
    messageDiv.textContent = data.message;
  }
});

// PASSWORD TOGGLE (EYE ICON)
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

togglePassword.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";

  passwordInput.type = isHidden ? "text" : "password";

  togglePassword.innerHTML = isHidden
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
});
