// ─── STATE ───────────────────────────────────────────
let currentStep = 1;
let userEmail = "";
let resendTimer = null;

// ─── STEP NAVIGATION ─────────────────────────────────
function goToStep(step, back = false) {
  const oldCard = document.getElementById(`step${currentStep}`);
  oldCard.classList.remove("active", "back-anim");
  oldCard.style.display = "none";

  currentStep = step;

  const newCard = document.getElementById(`step${currentStep}`);
  newCard.style.display = "block";
  newCard.classList.remove("active", "back-anim");
  void newCard.offsetWidth;
  newCard.classList.add("active", ...(back ? ["back-anim"] : []));

  updateSidebar(step);
  updateProgress(step);

  if (step === 4) {
    document.getElementById("backLink").style.display = "none";
  }
}

function updateSidebar(step) {
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`svd${i}`);
    const item = document.getElementById(`sv${i}`);
    const line = document.getElementById(`svl${i}`);

    dot.classList.remove("active", "done");
    item.classList.remove("active");

    if (line) line.classList.remove("done");

    if (i < step) {
      dot.classList.add("done");
      if (line) line.classList.add("done");
    } else if (i === step && step <= 3) {
      dot.classList.add("active");
      item.classList.add("active");
    }
  }
}

function updateProgress(step) {
  const pcts = { 1: "33%", 2: "66%", 3: "90%", 4: "100%" };
  document.getElementById("progressBar").style.width = pcts[step] || "33%";
}

// ─── STATUS ───────────────────────────────────────────
function showStatus(id, type, msg) {
  const el = document.getElementById(id);
  el.className = `status-msg show ${type}`;
  el.textContent = msg;
}

function clearStatus(id) {
  const el = document.getElementById(id);
  el.classList.remove("show");
}

// ─── STEP 1: SEND OTP ────────────────────────────────
document.getElementById("btn-send-otp").addEventListener("click", async () => {
  const emailInput = document.getElementById("fp-email");
  const email = emailInput.value.trim();

  clearStatus("s1-status");

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!valid) {
    showStatus("s1-status", "error", "Enter a valid email");
    return;
  }

  userEmail = email;

  setLoading("btn-send-otp", "sp1", true);

  try {
    const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    setLoading("btn-send-otp", "sp1", false);

    if (!res.ok) {
      showStatus("s1-status", "error", data.message || "Email not found");
      return;
    }

    document.getElementById("otp-email-show").textContent = maskEmail(email);
    startResendTimer();
    goToStep(2);
  } catch (err) {
    setLoading("btn-send-otp", "sp1", false);
    showStatus("s1-status", "error", "Server error");
  }
});

// ─── OTP INPUT ───────────────────────────────────────
const otpInputs = Array.from({ length: 6 }, (_, i) =>
  document.getElementById(`otp${i}`),
);

otpInputs.forEach((inp, i) => {
  inp.addEventListener("input", () => {
    const val = inp.value.replace(/\D/g, "");
    inp.value = val ? val[0] : "";

    if (val && i < 5) otpInputs[i + 1].focus();
  });

  inp.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !inp.value && i > 0) {
      otpInputs[i - 1].focus();
    }
  });
});

// ─── STEP 2: VERIFY OTP ─────────────────────────────
document
  .getElementById("btn-verify-otp")
  .addEventListener("click", async () => {
    clearStatus("s2-status");

    const otp = otpInputs.map((i) => i.value).join("");

    if (otp.length < 6) {
      showStatus("s2-status", "error", "Enter 6 digit OTP");
      return;
    }

    setLoading("btn-verify-otp", "sp2", true);

    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          otp,
        }),
      });

      const data = await res.json();

      setLoading("btn-verify-otp", "sp2", false);

      if (!res.ok) {
        showStatus("s2-status", "error", data.message || "Invalid OTP");
        return;
      }

      goToStep(3);
    } catch (err) {
      setLoading("btn-verify-otp", "sp2", false);
      showStatus("s2-status", "error", "Server error");
    }
  });

// ─── RESEND OTP ─────────────────────────────────────
document.getElementById("resend-btn").addEventListener("click", async () => {
  document.getElementById("resend-btn").disabled = true;

  otpInputs.forEach((i) => (i.value = ""));

  try {
    await fetch("http://localhost:5000/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail }),
    });

    showStatus("s2-status", "success", "OTP resent");

    startResendTimer();
  } catch (err) {
    showStatus("s2-status", "error", "Failed to resend OTP");
  }
});

// ─── STEP 3: RESET PASSWORD ──────────────────────────
document.getElementById("btn-reset-pw").addEventListener("click", async () => {
  clearStatus("s3-status");

  const newPw = document.getElementById("new-pw").value;
  const confirmPw = document.getElementById("confirm-pw").value;

  if (newPw.length < 8) {
    showStatus("s3-status", "error", "Password too short");
    return;
  }

  if (newPw !== confirmPw) {
    showStatus("s3-status", "error", "Passwords do not match");
    return;
  }

  setLoading("btn-reset-pw", "sp3", true);

  const otp = otpInputs.map((i) => i.value).join("");

  try {
    const res = await fetch("http://localhost:5000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: otp,
        newPassword: newPw,
      }),
    });

    const data = await res.json();

    setLoading("btn-reset-pw", "sp3", false);

    if (!res.ok) {
      showStatus("s3-status", "error", data.message || "Reset failed");
      return;
    }

    goToStep(4);
  } catch (err) {
    setLoading("btn-reset-pw", "sp3", false);
    showStatus("s3-status", "error", "Server error");
  }
});

// ─── RESEND TIMER ───────────────────────────────────
function startResendTimer() {
  let secs = 60;
  const btn = document.getElementById("resend-btn");
  const timer = document.getElementById("timer-count");

  btn.disabled = true;

  clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    secs--;
    timer.textContent = secs;

    if (secs <= 0) {
      clearInterval(resendTimer);
      btn.disabled = false;
    }
  }, 1000);
}

// ─── HELPERS ────────────────────────────────────────
function maskEmail(email) {
  const [u, d] = email.split("@");
  return u.slice(0, 2) + "***@" + d;
}

function setLoading(btnId, spinnerId, state) {
  document.getElementById(btnId).disabled = state;
  document.getElementById(spinnerId).style.display = state ? "block" : "none";
}

// ─── PASSWORD TOGGLE ─────────────────────────────────
function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === "password";

  input.type = isHidden ? "text" : "password";

  btn.innerHTML = isHidden
    ? // Eye-off (visible state)
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>`
    : // Eye (hidden state)
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
}
