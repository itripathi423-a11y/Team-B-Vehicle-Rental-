// ─── STATE ───────────────────────────────────────────
let currentStep = 1;
let userEmail = "";
let resendTimer = null;
// DEMO: simulated correct OTP (replace with real backend call)
const DEMO_OTP = "123456";

// ─── STEP NAVIGATION ─────────────────────────────────
function goToStep(step, back = false) {
  const oldCard = document.getElementById(`step${currentStep}`);
  oldCard.classList.remove("active", "back-anim");
  oldCard.style.display = "none";

  currentStep = step;

  const newCard = document.getElementById(`step${currentStep}`);
  newCard.style.display = "block";
  newCard.classList.remove("active", "back-anim");
  void newCard.offsetWidth; // reflow
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
    dot.textContent = i;
    item.classList.remove("active");

    if (line) line.classList.remove("done");

    if (i < step) {
      dot.classList.add("done");
      dot.textContent = "";
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

// ─── LOADING STATE ────────────────────────────────────
function setLoading(btnId, spinnerId, on) {
  const btn = document.getElementById(btnId);
  const sp = document.getElementById(spinnerId);
  btn.classList.toggle("loading", on);
  sp.style.display = on ? "block" : "none";
}

// ─── STATUS MESSAGES ─────────────────────────────────
function showStatus(id, type, msg) {
  const el = document.getElementById(id);
  el.className = `status-msg show ${type}`;
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15">
    ${
      type === "error"
        ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'
        : '<polyline points="20 6 9 17 4 12"/>'
    }
  </svg>${msg}`;
}

function clearStatus(id) {
  const el = document.getElementById(id);
  el.classList.remove("show");
}

// ─── STEP 1: SEND OTP ────────────────────────────────
document.getElementById("btn-send-otp").addEventListener("click", async () => {
  const emailInput = document.getElementById("fp-email");
  const email = emailInput.value.trim();
  const errEl = document.getElementById("fp-email-err");
  clearStatus("s1-status");

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!valid) {
    emailInput.classList.add("error");
    errEl.classList.add("show");
    return;
  }

  emailInput.classList.remove("error");
  errEl.classList.remove("show");
  emailInput.classList.add("success");

  setLoading("btn-send-otp", "sp1", true);

  // ── BACKEND CALL: replace this block ──────────────
  // Example:
  // const res = await fetch('/api/forgot-password', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email })
  // });
  // if (!res.ok) { showStatus('s1-status','error','Email not found.'); return; }
  // ──────────────────────────────────────────────────

  await fakeDelay(1500); // REMOVE in production

  setLoading("btn-send-otp", "sp1", false);

  userEmail = email;
  document.getElementById("otp-email-show").textContent = maskEmail(email);
  startResendTimer();
  goToStep(2);
});

// ─── OTP INPUT BEHAVIOUR ─────────────────────────────
const otpInputs = Array.from({ length: 6 }, (_, i) =>
  document.getElementById(`otp${i}`),
);

otpInputs.forEach((inp, i) => {
  inp.addEventListener("input", (e) => {
    const val = e.target.value.replace(/\D/g, "");
    inp.value = val ? val[0] : "";
    inp.classList.toggle("filled", !!inp.value);
    if (val && i < 5) otpInputs[i + 1].focus();
  });

  inp.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !inp.value && i > 0) {
      otpInputs[i - 1].focus();
      otpInputs[i - 1].value = "";
      otpInputs[i - 1].classList.remove("filled");
    }
  });

  inp.addEventListener("paste", (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    pasted.split("").forEach((ch, j) => {
      if (otpInputs[j]) {
        otpInputs[j].value = ch;
        otpInputs[j].classList.add("filled");
      }
    });
    otpInputs[Math.min(pasted.length, 5)].focus();
  });
});

// ─── STEP 2: VERIFY OTP ──────────────────────────────
document
  .getElementById("btn-verify-otp")
  .addEventListener("click", async () => {
    clearStatus("s2-status");
    const code = otpInputs.map((i) => i.value).join("");

    if (code.length < 6) {
      otpInputs.forEach((i) => {
        i.classList.add("error");
        setTimeout(() => i.classList.remove("error"), 500);
      });
      showStatus("s2-status", "error", "Please enter all 6 digits.");
      return;
    }

    setLoading("btn-verify-otp", "sp2", true);

    // ── BACKEND CALL: replace this block ──────────────
    // const res = await fetch('/api/verify-otp', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email: userEmail, otp: code })
    // });
    // const ok = res.ok;
    // ──────────────────────────────────────────────────

    await fakeDelay(1400); // REMOVE in production
    const ok = code === DEMO_OTP; // REMOVE in production — use backend response

    setLoading("btn-verify-otp", "sp2", false);

    if (!ok) {
      otpInputs.forEach((i) => {
        i.classList.add("error");
        setTimeout(() => i.classList.remove("error"), 500);
      });
      showStatus("s2-status", "error", "Incorrect code. Please try again.");
      return;
    }

    goToStep(3);
  });

// ─── RESEND TIMER ─────────────────────────────────────
function startResendTimer() {
  let secs = 60;
  const timerEl = document.getElementById("timer-count");
  const resendBtn = document.getElementById("resend-btn");
  const resendHint = document.getElementById("resend-timer");

  resendBtn.disabled = true;
  resendHint.style.display = "block";

  clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    secs--;
    timerEl.textContent = secs;
    if (secs <= 0) {
      clearInterval(resendTimer);
      resendBtn.disabled = false;
      resendHint.style.display = "none";
    }
  }, 1000);
}

document.getElementById("resend-btn").addEventListener("click", async () => {
  clearStatus("s2-status");
  document.getElementById("resend-btn").disabled = true;
  otpInputs.forEach((i) => {
    i.value = "";
    i.classList.remove("filled");
  });

  // ── BACKEND CALL ──────────────────────────────────
  // await fetch('/api/forgot-password', { method:'POST', body: JSON.stringify({email: userEmail}) });
  // ─────────────────────────────────────────────────
  await fakeDelay(800);

  showStatus("s2-status", "success", "New code sent! Check your inbox.");
  startResendTimer();
});

// ─── PASSWORD STRENGTH ────────────────────────────────
document.getElementById("new-pw").addEventListener("input", () => {
  const val = document.getElementById("new-pw").value;
  const score = calcStrength(val);
  const colors = ["#EF4444", "#F97316", "#EAB308", "#22C55E"];
  const labels = ["Weak", "Fair", "Good", "Strong"];

  for (let i = 0; i < 4; i++) {
    const seg = document.getElementById(`pbs${i}`);
    seg.style.background = i < score ? colors[score - 1] : "var(--border)";
  }

  const lbl = document.getElementById("pw-strength-label");
  if (val.length === 0) {
    lbl.textContent = "";
    return;
  }
  lbl.textContent = labels[score - 1] || "";
  lbl.style.color = colors[score - 1] || "var(--muted)";
});

function calcStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.max(score, pw.length > 0 ? 1 : 0);
}

// ─── STEP 3: RESET PASSWORD ──────────────────────────
document.getElementById("btn-reset-pw").addEventListener("click", async () => {
  clearStatus("s3-status");
  const newPw = document.getElementById("new-pw").value;
  const confirmPw = document.getElementById("confirm-pw").value;
  let valid = true;

  if (newPw.length < 8) {
    document.getElementById("new-pw").classList.add("error");
    document.getElementById("new-pw-err").classList.add("show");
    valid = false;
  } else {
    document.getElementById("new-pw").classList.remove("error");
    document.getElementById("new-pw-err").classList.remove("show");
  }

  if (newPw !== confirmPw) {
    document.getElementById("confirm-pw").classList.add("error");
    document.getElementById("confirm-pw-err").classList.add("show");
    valid = false;
  } else {
    document.getElementById("confirm-pw").classList.remove("error");
    document.getElementById("confirm-pw-err").classList.remove("show");
  }

  if (!valid) return;

  setLoading("btn-reset-pw", "sp3", true);

  // ── BACKEND CALL: replace this block ──────────────
  // const res = await fetch('/api/reset-password', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email: userEmail, password: newPw })
  // });
  // if (!res.ok) { showStatus('s3-status','error','Something went wrong. Try again.'); return; }
  // ──────────────────────────────────────────────────

  await fakeDelay(1600); // REMOVE in production

  setLoading("btn-reset-pw", "sp3", false);
  goToStep(4);
});

// ─── HELPERS ─────────────────────────────────────────
function maskEmail(email) {
  const [u, d] = email.split("@");
  return u.slice(0, 2) + "***@" + d;
}

function fakeDelay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function togglePw(inputId, btn) {
  const inp = document.getElementById(inputId);
  const isHidden = inp.type === "password";
  inp.type = isHidden ? "text" : "password";
  btn.innerHTML = isHidden
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
