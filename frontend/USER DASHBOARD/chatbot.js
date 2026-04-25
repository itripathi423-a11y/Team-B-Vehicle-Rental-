(function () {
  const bubble = document.getElementById("chat-bubble");
  const panel = document.getElementById("chat-panel");
  const msgs = document.getElementById("cpMessages");
  const input = document.getElementById("cpInput");
  const quick = document.getElementById("cpQuick");

  if (!bubble || !panel) return;

  /* ── Toggle panel ── */
  bubble.addEventListener("click", () => {
    panel.classList.toggle("open");
    const dot = bubble.querySelector(".chat-notif-dot");
    if (dot) dot.style.display = "none";
  });

  document
    .getElementById("chat-close")
    ?.addEventListener("click", () => panel.classList.remove("open"));

  /* ── Bot replies map ── */
  const replies = {
    "browse vehicles":
      "Head to the <b>Vehicles</b> page to explore our full fleet — sedans, SUVs, pickups and more.",
    "my bookings":
      "Check <b>My Bookings</b> in the sidebar to see active, upcoming, and past rentals.",
    "kyc status":
      "Your KYC is <b>pending</b>. Click KYC Verification in the sidebar — it takes about 2 minutes.",
    payments:
      "Visit the <b>Payments</b> section to view invoices and manage your payment methods.",
    help: "I can help with vehicles, bookings, KYC verification, and payments. What do you need?",
  };

  /* ── Append a message bubble ── */
  function addMsg(text, role) {
    const wrap = document.createElement("div");
    wrap.className = "cp-msg " + role;

    if (role === "bot") {
      const av = document.createElement("div");
      av.className = "cp-av";
      av.textContent = "AD";
      wrap.appendChild(av);
    }

    const b = document.createElement("div");
    b.className = "cp-bubble";
    b.innerHTML = text;
    wrap.appendChild(b);
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  /* ── Typing indicator ── */
  function showTyping() {
    const tw = document.createElement("div");
    tw.className = "cp-msg bot";
    tw.id = "cp-typing";

    const av = document.createElement("div");
    av.className = "cp-av";
    av.textContent = "AD";
    tw.appendChild(av);

    const t = document.createElement("div");
    t.className = "cp-typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    tw.appendChild(t);

    msgs.appendChild(tw);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    document.getElementById("cp-typing")?.remove();
  }

  /* ── Bot reply with delay ── */
  function botReply(userText) {
    showTyping();
    const key = userText.toLowerCase().trim();
    const reply =
      replies[key] ||
      "I'll get someone to help you with that! In the meantime, check the <b>Quick Actions</b> on your dashboard.";

    setTimeout(() => {
      removeTyping();
      addMsg(reply, "bot");
    }, 850);
  }

  /* ── Send a message ── */
  function send(text) {
    if (!text.trim()) return;
    addMsg(text, "user");
    if (quick) quick.style.display = "none";
    botReply(text);
    input.value = "";
  }

  /* ── Input events ── */
  document
    .getElementById("cpSendBtn")
    ?.addEventListener("click", () => send(input.value));

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send(input.value);
  });

  /* ── Quick-chip handler (called from onclick in HTML) ── */
  window.cpSendChip = (el) => send(el.textContent);
})();
