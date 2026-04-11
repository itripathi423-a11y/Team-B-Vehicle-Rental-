document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const messageDiv = document.getElementById("login-message");

  try {
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success) {
      messageDiv.style.color = "green";
      messageDiv.textContent = data.message;
    } else {
      messageDiv.style.color = "red";
      messageDiv.textContent = data.message;
    }
  } catch (err) {
    messageDiv.style.color = "red";
    messageDiv.textContent = "Server error";
  }
});
