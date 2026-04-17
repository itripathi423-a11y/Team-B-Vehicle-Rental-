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

    // IMPORTANT FIX HERE
    const role = data.user?.role;

    setTimeout(() => {
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
