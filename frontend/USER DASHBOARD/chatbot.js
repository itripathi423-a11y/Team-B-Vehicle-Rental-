(function () {
  /* ─── DOM ─── */
  const bubble = document.getElementById("chat-bubble");
  const panel = document.getElementById("chat-panel");
  const msgs = document.getElementById("cpMessages");
  const input = document.getElementById("cpInput");
  const btn = document.getElementById("cpSendBtn");

  if (!bubble || !panel || !msgs || !input || !btn) return;

  /* ─── STATE ─── */
  let isSending = false;
  const conversationHistory = [];

  /* ─── OPEN / CLOSE ─── */
  bubble.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
      input.focus();
      const dot = bubble.querySelector(".chat-notif-dot");
      if (dot) dot.style.display = "none";
    }
  });

  document
    .getElementById("chat-close")
    ?.addEventListener("click", () => panel.classList.remove("open"));

  /* ─── RENDER MESSAGES ─── */
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

    b.innerHTML = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");

    wrap.appendChild(b);
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function showTyping() {
    removeTyping();

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

  /* ─── PAGE CONTEXT ─── */
  function getPageContext() {
    const ctx = {};

    if (typeof vehicle !== "undefined" && vehicle) {
      ctx.vehicle = {
        id: vehicle.id,
        name: vehicle.name,
        fuel_type: vehicle.fuel_type,
        body_type: vehicle.body_type,
        transmission: vehicle.transmission,
        seating_capacity: vehicle.seating_capacity,
        price_4h: vehicle.price_4h,
        price_8h: vehicle.price_8h,
        price_1d: vehicle.price_1d,
      };
    }

    const pickupLoc = document.getElementById("pickupLoc")?.value?.trim();
    const pickupDT = document.getElementById("pickupDT")?.value;
    const dropoffDT = document.getElementById("dropoffDT")?.value;
    const duration =
      typeof selectedDuration !== "undefined" ? selectedDuration : null;

    if (pickupLoc || pickupDT || duration) {
      ctx.currentBookingForm = {
        pickup_location: pickupLoc || null,
        pickup_datetime: pickupDT || null,
        dropoff_datetime: dropoffDT || null,
        selected_duration: duration,
      };
    }

    ctx.currentPage = document.title || window.location.pathname;

    return ctx;
  }

  /* ─── API CALL ─── */
  async function botReply(userText) {
    showTyping();

    conversationHistory.push({
      role: "user",
      parts: [{ text: userText }],
    });

    const pageContext = getPageContext();

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          userId: window._userId || null,
          history: conversationHistory.slice(-10),
          pageContext,
        }),
      });

      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();

      removeTyping();

      const replyText = data.reply || "Sorry, I didn't get a response.";

      addMsg(replyText, "bot");

      conversationHistory.push({
        role: "model",
        parts: [{ text: replyText }],
      });

      if (data.suggestions?.length) {
        renderSuggestions(data.suggestions);
      }
    } catch (err) {
      removeTyping();
      addMsg("Connection error. Please try again in a moment.", "bot");
    } finally {
      isSending = false;
      input.disabled = false;
      btn.disabled = false;
      input.focus();
    }
  }

  /* ─── SUGGESTIONS ─── */
  function renderSuggestions(suggestions) {
    const quick = document.getElementById("cpQuick");
    if (!quick) return;

    quick.innerHTML = "";

    suggestions.slice(0, 3).forEach((s) => {
      const chip = document.createElement("button");
      chip.className = "cp-chip";
      chip.textContent = s;

      chip.addEventListener("click", () => {
        if (!isSending) send(s);
      });

      quick.appendChild(chip);
    });
  }

  /* ─── SEND ─── */
  function send(text) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    isSending = true;

    input.disabled = true;
    btn.disabled = true;

    const quick = document.getElementById("cpQuick");
    if (quick && conversationHistory.length === 0) {
      quick.style.display = "none";
    }

    addMsg(trimmed, "user");

    botReply(trimmed);

    input.value = "";
  }

  btn.addEventListener("click", () => send(input.value));

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input.value);
    }
  });

  /* ─── FIXED CHIP HANDLER (IMPORTANT FIX) ─── */
  window.cpSendChip = function (el) {
    if (!el) return;
    const text = el.textContent?.trim();
    if (!text) return;
    send(text);
  };
})();
