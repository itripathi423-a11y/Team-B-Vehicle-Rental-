const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("../config/db");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ════════════════════════════════════
   MYSQL QUERY HELPER
════════════════════════════════════ */
const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

/* ════════════════════════════════════
   FETCH THIS USER'S DATA FROM DB
════════════════════════════════════ */
async function buildUserContext(userId) {
  const [userRows, bookings, kycRows, vehicles] = await Promise.all([
    query(
      `SELECT id, name, email, phone, role, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId],
    ),

    query(
      `SELECT b.booking_ref, b.pickup_location, b.rental_type,
              b.pickup_datetime, b.drop_datetime, b.total_days,
              b.price_per_unit, b.total_price, b.status,
              b.payment_status, b.payment_method, b.paid_at,
              b.cancel_reason, b.notes, b.created_at,
              v.name AS vehicle_name, v.brand, v.model,
              v.body_type, v.fuel_type, v.seating_capacity
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId],
    ),

    query(
      `SELECT document_type, document_number, status,
              rejection_reason, submitted_at, reviewed_at
       FROM kyc WHERE user_id = ? LIMIT 1`,
      [userId],
    ),

    query(
      `SELECT id, name, brand, model, year, body_type, fuel_type,
              transmission, seating_capacity, color, status,
              price_4h, price_8h, price_1d, description, features
       FROM vehicles WHERE is_deleted = 0
       ORDER BY status ASC, name ASC`,
    ),
  ]);

  return {
    user: userRows[0] || null,
    bookings,
    kyc: kycRows[0] || null,
    vehicles,
  };
}

/* ════════════════════════════════════
   BUILD SYSTEM PROMPT
════════════════════════════════════ */
function buildSystemPrompt(data, pageContext) {
  const { user, bookings, kyc, vehicles } = data;

  // ── User profile ──
  const userSection = user
    ? `Name: ${user.name}
Email: ${user.email}
Phone: ${user.phone}
Role: ${user.role}
Member since: ${new Date(user.created_at).toLocaleDateString("en-NP")}`
    : "Guest (not logged in)";

  // ── KYC ──
  let kycSection;
  if (!kyc) {
    kycSection = `Status: Not submitted
Next step: Upload a Citizenship, Passport, or Driving License with a selfie on the KYC page.`;
  } else {
    const nextStep =
      kyc.status === "rejected"
        ? `Next step: Re-upload clear photos. Rejection reason: ${kyc.rejection_reason}`
        : kyc.status === "pending"
          ? "Next step: Under review — admin will notify within 24 hours."
          : "KYC fully verified. User can book vehicles.";

    kycSection = `Document: ${kyc.document_type} #${kyc.document_number}
Status: ${kyc.status}
Submitted: ${new Date(kyc.submitted_at).toLocaleDateString("en-NP")}${kyc.reviewed_at ? `\nReviewed: ${new Date(kyc.reviewed_at).toLocaleDateString("en-NP")}` : ""}
${nextStep}`;
  }

  // ── Bookings ──
  const bookingsSection = !bookings.length
    ? "No bookings yet."
    : bookings
        .map(
          (b, i) => `Booking ${i + 1}:
  Ref: ${b.booking_ref}
  Vehicle: ${b.vehicle_name} (${b.brand} ${b.model}) | ${b.body_type}, ${b.fuel_type}, ${b.seating_capacity} seats
  Pickup: ${b.pickup_location} | Type: ${b.rental_type}
  From: ${new Date(b.pickup_datetime).toLocaleString("en-NP")} → To: ${new Date(b.drop_datetime).toLocaleString("en-NP")}
  Days: ${b.total_days} | Total: Rs${b.total_price}
  Status: ${b.status} | Payment: ${b.payment_status}${b.cancel_reason ? ` | Cancelled: ${b.cancel_reason}` : ""}${b.notes ? ` | Notes: ${b.notes}` : ""}`,
        )
        .join("\n\n");

  // ── Available vehicles ──
  const available = vehicles.filter((v) => v.status === "Available");
  const vehiclesSection = !available.length
    ? "No vehicles available."
    : available
        .map(
          (v) =>
            `• [ID:${v.id}] ${v.name} (${v.brand} ${v.model}, ${v.year}) | ${v.body_type} | ${v.fuel_type} | ${v.seating_capacity} seats | Color: ${v.color} | 4h: Rs${v.price_4h} | 8h: Rs${v.price_8h} | 1d: Rs${v.price_1d}${v.features ? ` | Features: ${v.features}` : ""}`,
        )
        .join("\n");

  // ── Page context ──
  let pageSection = "";
  if (pageContext) {
    if (pageContext.vehicle) {
      const v = pageContext.vehicle;
      pageSection += `\nUSER IS CURRENTLY VIEWING VEHICLE:
  Name: ${v.name} | ${v.body_type} | ${v.fuel_type} | ${v.transmission} | ${v.seating_capacity} seats
  Prices: 4h=Rs${v.price_4h}, 8h=Rs${v.price_8h}, 1d=Rs${v.price_1d}`;
    }
    if (pageContext.currentBookingForm) {
      const f = pageContext.currentBookingForm;
      pageSection += `\nUSER HAS PARTIALLY FILLED BOOKING FORM:
  Pickup location: ${f.pickup_location || "not set"}
  Pickup datetime: ${f.pickup_datetime || "not set"}
  Dropoff datetime: ${f.dropoff_datetime || "not set"}
  Selected duration: ${f.selected_duration || "not set"}`;
    }
    if (pageContext.currentPage) {
      pageSection += `\nCURRENT PAGE: ${pageContext.currentPage}`;
    }
  }

  // ── KYC status summary for prompts ──
  const kycStatusLine = !kyc
    ? "not submitted"
    : kyc.status === "verified"
      ? "verified ✅"
      : kyc.status === "pending"
        ? "pending ⏳ (under review)"
        : `rejected ❌ (reason: ${kyc.rejection_reason || "see KYC page"})`;

  return `You are a personal support assistant for AutoDrive Nepal, a vehicle rental platform.
You are helping a specific logged-in user. Be friendly, concise, and helpful.
Always address the user by their first name. Use bullet points for lists.
Today: ${new Date().toLocaleDateString("en-NP")}

════════ USER PROFILE ════════
${userSection}

════════ KYC STATUS ════════
${kycSection}

════════ USER'S BOOKINGS (${bookings.length} total) ════════
${bookingsSection}

════════ AVAILABLE VEHICLES (${available.length} of ${vehicles.length}) ════════
${vehiclesSection}
${pageSection ? `\n════════ CURRENT PAGE CONTEXT ════════${pageSection}` : ""}

════════ BOOKING PROCESS ════════
When the user asks "how to book", "booking process", "how do I book a vehicle", "steps to book" or similar,
reply in ONE complete message using EXACTLY this structure (personalise where noted):

${
  !kyc || kyc.status !== "verified"
    ? `⚠️ **Important:** Your KYC is currently ${kycStatusLine}. You must complete KYC verification before you can book a vehicle.`
    : `✅ Your KYC is verified — you're ready to book!`
}

Here's how to book a vehicle on AutoDrive Nepal:

1️⃣ **Verify KYC first**
   Go to Profile → KYC and upload your document + selfie. Must be approved before booking.

2️⃣ **Browse Vehicles**
   Visit the Vehicles page and pick one that suits your needs and budget.
   Available now: ${available.length} vehicle(s).

3️⃣ **Choose Rental Type**
   Select your duration: 4 hours / 8 hours / 1 day / custom (multi-day).

4️⃣ **Enter Pickup Details**
   Fill in:
   • Pickup location (address or landmark)
   • Pickup date & time
   • Drop-off date & time

5️⃣ **Confirm Booking**
   Review your summary and confirm. You'll receive a booking reference number (e.g. BK-2025-XXXX).

6️⃣ **Pay**
   Choose online payment (eSewa / Khalti) or cash at pickup.

Status meanings after booking:
• Pending = awaiting confirmation
• Confirmed = approved, upcoming
• Active = rental is ongoing
• Completed = finished
• Cancelled = cancelled (allowed before Active)

════════ KYC PROCESS ════════
When the user asks "how to do KYC", "KYC process", "how to verify", "KYC steps", "verify my account" or similar,
reply in ONE complete message using EXACTLY this structure:

Here's how to complete KYC verification on AutoDrive Nepal:

1️⃣ **Go to Profile → KYC**
   Find it in the top menu or your dashboard.

2️⃣ **Choose your document type**
   • 🪪 Citizenship Certificate (recommended)
   • 🛂 Passport
   • 🚗 Driving License

3️⃣ **Upload your photos**
   • Front of document
   • Back of document
   • Selfie holding the document

4️⃣ **Submit**
   Click Submit — admin will review within 24 hours and notify you by email.

📸 Tips for quick approval:
• Good lighting, no flash glare
• All text must be clearly readable
• Do not crop any edges of the document
• Each file should be under 5MB

---
Your current KYC status: ${kycStatusLine}
${kyc?.status === "rejected" ? `Rejection reason: ${kyc.rejection_reason}\nPlease re-upload clear photos at Step 3.` : ""}
${kyc?.status === "pending" ? "Your documents are being reviewed. You'll be notified within 24 hours." : ""}
${kyc?.status === "verified" ? "You're fully verified and can book vehicles right away!" : ""}
${!kyc ? "You haven't submitted KYC yet. Start at Step 1 above." : ""}

════════ INSTRUCTIONS ════════
- Only discuss THIS user's data. Never mention other users.
- For "my bookings / my KYC / my info" use the sections above.
- If the user asks about the booking process or KYC process, respond in ONE complete message using the exact structure defined above. Do NOT split into multiple messages or ask follow-up questions.
- If user is on a vehicle page, help them understand that vehicle's details and pricing.
- If user has a partially filled booking form, help them complete it.
- Keep responses short. Use bullet points for multi-step or multi-item answers.
- Do NOT reveal passwords or other users' data.
- If asked something not in the data above, say you don't have that info.`;
}

/* ════════════════════════════════════
   CONVERT FRONTEND HISTORY FORMAT
════════════════════════════════════ */
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((h) => h.role && Array.isArray(h.parts) && h.parts.length)
    .map((h) => ({
      role: h.role === "user" ? "user" : "model",
      parts: h.parts.map((p) => ({ text: String(p.text || "") })),
    }));
}

/* ════════════════════════════════════
   CHAT ROUTE  POST /api/chat
════════════════════════════════════ */
router.post("/", async (req, res) => {
  try {
    const { message, userId, history = [], pageContext = null } = req.body;

    if (!message?.trim()) {
      return res
        .status(400)
        .json({ reply: "Please send a message.", suggestions: [] });
    }

    if (!userId) {
      return res.status(401).json({
        reply: "Please log in to use the assistant.",
        suggestions: ["Login", "Register"],
      });
    }

    // ── Fetch user data ──
    let data;
    try {
      data = await buildUserContext(userId);
    } catch (dbErr) {
      console.error("[DB Error]", dbErr.message);
      return res.json({
        reply: "Having trouble loading your data. Please try again.",
        suggestions: ["Try again"],
      });
    }

    if (!data.user) {
      return res.status(404).json({
        reply: "Account not found. Please log in again.",
        suggestions: ["Login"],
      });
    }

    const systemPrompt = buildSystemPrompt(data, pageContext);
    const cleanHistory = sanitizeHistory(history);
    const msg = message.toLowerCase().trim();

    // ── Call Gemini with conversation history ──
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemPrompt,
      });

      const chat = model.startChat({
        history: cleanHistory,
      });

      const result = await chat.sendMessage(message);
      const replyText = result.response.text();

      return res.json({
        reply: replyText,
        suggestions: buildSuggestions(msg, data),
      });
    } catch (aiErr) {
      console.error("[Gemini Error]", aiErr.message);
      return res.json(buildFallbackReply(msg, data));
    }
  } catch (err) {
    console.error("[Chat Route Error]", err);
    res
      .status(500)
      .json({ reply: "Server error. Please try again.", suggestions: [] });
  }
});

/* ════════════════════════════════════
   FALLBACK (when Gemini fails)
════════════════════════════════════ */
function buildFallbackReply(msg, { user, bookings, kyc, vehicles }) {
  const name = user?.name?.split(" ")[0] || "there";
  const available = vehicles.filter((v) => v.status === "Available");

  // ── Booking process fallback ──
  if (
    msg.includes("how to book") ||
    msg.includes("booking process") ||
    msg.includes("steps to book") ||
    (msg.includes("book") && msg.includes("how"))
  ) {
    const kycWarning =
      !kyc || kyc.status !== "verified"
        ? `\n⚠️ Your KYC is not verified yet — complete that first or your booking won't be accepted.\n`
        : `\n✅ Your KYC is verified — you're ready to book!\n`;

    return {
      reply:
        `Here's how to book a vehicle on AutoDrive Nepal:${kycWarning}\n` +
        `1️⃣ **Verify KYC first** — Profile → KYC, upload document + selfie.\n` +
        `2️⃣ **Browse Vehicles** — Visit the Vehicles page. (${available.length} available now)\n` +
        `3️⃣ **Choose Rental Type** — 4h / 8h / 1 day / custom.\n` +
        `4️⃣ **Enter Pickup Details** — Location, pickup date/time, drop-off date/time.\n` +
        `5️⃣ **Confirm Booking** — You'll get a booking reference number.\n` +
        `6️⃣ **Pay** — Online (eSewa/Khalti) or cash at pickup.`,
      suggestions: ["My KYC status", "Available vehicles", "My bookings"],
    };
  }

  // ── KYC process fallback ──
  if (
    msg.includes("kyc process") ||
    msg.includes("how to do kyc") ||
    msg.includes("how to verify") ||
    msg.includes("kyc steps") ||
    (msg.includes("kyc") && msg.includes("how"))
  ) {
    const kycStatusLine = !kyc
      ? "not submitted"
      : kyc.status === "verified"
        ? "verified ✅"
        : kyc.status === "pending"
          ? "pending ⏳"
          : `rejected ❌ (${kyc.rejection_reason || "see KYC page"})`;

    return {
      reply:
        `Here's how to complete KYC on AutoDrive Nepal:\n\n` +
        `1️⃣ **Go to Profile → KYC** from the menu.\n` +
        `2️⃣ **Choose document** — Citizenship / Passport / Driving License.\n` +
        `3️⃣ **Upload photos** — Front + Back of document + Selfie.\n` +
        `4️⃣ **Submit** — Admin reviews within 24 hours.\n\n` +
        `📸 Tips: Good lighting, all text readable, no cropping, under 5MB each.\n\n` +
        `Your current KYC status: ${kycStatusLine}` +
        (kyc?.status === "rejected"
          ? `\nRejection reason: ${kyc.rejection_reason}. Please re-upload.`
          : ""),
      suggestions: ["My KYC status", "How to book", "Available vehicles"],
    };
  }

  // ── Other fallbacks ──
  if (
    msg.includes("my info") ||
    msg.includes("my profile") ||
    msg.includes("who am i")
  ) {
    return {
      reply: `Your profile, ${name}:\n• Name: ${user.name}\n• Email: ${user.email}\n• Phone: ${user.phone}\n• Member since: ${new Date(user.created_at).toLocaleDateString("en-NP")}`,
      suggestions: ["My bookings", "My KYC status", "Available vehicles"],
    };
  }

  if (msg.includes("booking")) {
    if (!bookings.length) {
      return {
        reply: `You have no bookings yet, ${name}.`,
        suggestions: ["Available vehicles", "How to book"],
      };
    }
    const lines = bookings.map(
      (b) =>
        `• ${b.booking_ref} — ${b.vehicle_name} | ${b.status} | Rs${b.total_price}`,
    );
    return {
      reply: `Your bookings, ${name}:\n${lines.join("\n")}`,
      suggestions: ["Available vehicles", "My KYC status"],
    };
  }

  if (msg.includes("kyc")) {
    if (!kyc) {
      return {
        reply: `${name}, KYC not submitted yet. Go to Profile → KYC and upload your document + selfie.`,
        suggestions: ["How does KYC work", "Available vehicles"],
      };
    }
    const msgs = {
      verified: `✅ KYC verified, ${name}! You can book vehicles.`,
      pending: `⏳ KYC under review, ${name}. Wait up to 24 hours.`,
      rejected: `❌ KYC rejected: "${kyc.rejection_reason || "see KYC page"}". Please re-upload clear photos.`,
    };
    return {
      reply: msgs[kyc.status] || `KYC status: ${kyc.status}`,
      suggestions: ["My bookings", "Available vehicles"],
    };
  }

  if (msg.includes("price") || msg.includes("rate") || msg.includes("cost")) {
    if (!available.length)
      return { reply: "No vehicles available.", suggestions: [] };
    const lines = available.map(
      (v) =>
        `• ${v.name} — 4h: Rs${v.price_4h} | 8h: Rs${v.price_8h} | 1d: Rs${v.price_1d}`,
    );
    return {
      reply: `Current rates:\n${lines.join("\n")}`,
      suggestions: ["Book a vehicle", "How to book"],
    };
  }

  if (
    msg.includes("vehicle") ||
    msg.includes("car") ||
    msg.includes("available")
  ) {
    if (!available.length)
      return { reply: "No vehicles available right now.", suggestions: [] };
    const lines = available.map(
      (v) =>
        `• ${v.name} — ${v.body_type} | ${v.fuel_type} | ${v.seating_capacity} seats | Rs${v.price_1d}/day`,
    );
    return {
      reply: `Available vehicles:\n${lines.join("\n")}`,
      suggestions: ["Pricing", "How to book"],
    };
  }

  return {
    reply: `Hi ${name}! Ask me about your bookings, KYC, available vehicles, or pricing.`,
    suggestions: [
      "My bookings",
      "My KYC status",
      "Available vehicles",
      "Pricing",
    ],
  };
}

/* ════════════════════════════════════
   SMART SUGGESTIONS
════════════════════════════════════ */
function buildSuggestions(msg, { kyc, bookings, vehicles }) {
  const hasActive = bookings.some((b) =>
    ["Active", "Confirmed", "Pending"].includes(b.status),
  );
  const kycOk = kyc?.status === "verified";
  const avail = vehicles.filter((v) => v.status === "Available").length;

  if (msg.includes("kyc"))
    return kycOk
      ? ["My bookings", "Available vehicles", "Pricing"]
      : ["How does KYC work", "Available vehicles", "Contact support"];

  if (msg.includes("booking"))
    return hasActive
      ? ["Booking details", "Available vehicles", "My KYC status"]
      : ["Available vehicles", "How to book", "Pricing"];

  if (msg.includes("vehicle") || msg.includes("price"))
    return [`${avail} vehicles available`, "How to book", "My KYC status"];

  return ["My bookings", "My KYC status", "Available vehicles", "How to book"];
}

module.exports = router;
