// Example credentials
const correctEmail = "user@example.com";
const correctPassword = "password123";

// Select the form and inputs
const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const messageDiv = document.getElementById("login-message");

// Style the message
messageDiv.style.marginTop = "15px";
messageDiv.style.textAlign = "center";
messageDiv.style.fontWeight = "bold";
messageDiv.style.fontSize = "16px";

form.addEventListener("submit", function(e) {
  e.preventDefault(); // prevent default form submission

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (email === correctEmail && password === correctPassword) {
    // Success
    messageDiv.textContent = "Successfully logged in!";
    messageDiv.style.color = "green";

    // Reset the form
    form.reset();
  } else {
    // Error
    messageDiv.textContent = "Please enter correct details!";
    messageDiv.style.color = "#bd5858";
  }
});