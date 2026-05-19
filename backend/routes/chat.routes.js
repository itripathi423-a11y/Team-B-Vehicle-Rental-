const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const db = require("../config/db");

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
  const [
    userRows,
    bookings,
    kycRows,
    vehicles,
    enquiries,
    userReviews,
    topRatedVehicles,
  ] = await Promise.all([
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

    query(
      `SELECT id, question, status, admin_reply, created_at
         FROM enquiries
         WHERE user_id = ?
         ORDER BY created_at DESC`,
      [userId],
    ),

    query(
      `SELECT r.rating, r.comment, r.created_at,
                v.name AS vehicle_name, b.booking_ref
         FROM reviews r
         JOIN vehicles v ON r.vehicle_id = v.id
         JOIN bookings b ON r.booking_id = b.id
         WHERE r.user_id = ?
         ORDER BY r.created_at DESC`,
      [userId],
    ),

    query(
      `SELECT v.id, v.name, v.brand, v.model, v.body_type, v.fuel_type,
                v.seating_capacity, v.price_1d, v.status,
                ROUND(AVG(r.rating), 1) AS avg_rating,
                COUNT(r.id) AS review_count
         FROM vehicles v
         JOIN reviews r ON r.vehicle_id = v.id
         WHERE v.is_deleted = 0
         GROUP BY v.id
         HAVING review_count > 0
         ORDER BY avg_rating DESC, review_count DESC
         LIMIT 5`,
    ),
  ]);

  return {
    user: userRows[0] || null,
    bookings,
    kyc: kycRows[0] || null,
    vehicles,
    enquiries,
    userReviews,
    topRatedVehicles,
  };
}

/* ════════════════════════════════════
   BUILD SYSTEM PROMPT (logged-in)
════════════════════════════════════ */
function buildSystemPrompt(data, pageContext) {
  const {
    user,
    bookings,
    kyc,
    vehicles,
    enquiries,
    userReviews,
    topRatedVehicles,
  } = data;

  const userSection = user
    ? `Name: ${user.name}
Email: ${user.email}
Phone: ${user.phone}
Role: ${user.role}
Member since: ${new Date(user.created_at).toLocaleDateString("en-NP")}`
    : "Guest (not logged in)";

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

  const available = vehicles.filter((v) => v.status === "Available");
  const vehiclesSection = !available.length
    ? "No vehicles available."
    : available
        .map(
          (v) =>
            `• [ID:${v.id}] ${v.name} (${v.brand} ${v.model}, ${v.year}) | ${v.body_type} | ${v.fuel_type} | ${v.seating_capacity} seats | Color: ${v.color} | 4h: Rs${v.price_4h} | 8h: Rs${v.price_8h} | 1d: Rs${v.price_1d}${v.features ? ` | Features: ${v.features}` : ""}`,
        )
        .join("\n");

  const enquiriesSection = !enquiries.length
    ? "No enquiries submitted yet."
    : enquiries
        .map(
          (e, i) => `Enquiry ${i + 1}:
  Question: ${e.question}
  Status: ${e.status}
  ${e.admin_reply ? `Admin Reply: ${e.admin_reply}` : "Awaiting admin reply."}
  Submitted: ${new Date(e.created_at).toLocaleDateString("en-NP")}`,
        )
        .join("\n\n");

  const userReviewsSection = !userReviews.length
    ? "No reviews submitted yet."
    : userReviews
        .map(
          (r, i) => `Review ${i + 1}:
  Vehicle: ${r.vehicle_name} | Booking: ${r.booking_ref}
  Rating: ${"⭐".repeat(r.rating)} (${r.rating}/5)
  ${r.comment ? `Comment: ${r.comment}` : "No comment."}
  Date: ${new Date(r.created_at).toLocaleDateString("en-NP")}`,
        )
        .join("\n\n");

  const topRatedSection = !topRatedVehicles.length
    ? "No reviewed vehicles yet."
    : topRatedVehicles
        .map(
          (v, i) =>
            `${i + 1}. ${v.name} (${v.brand} ${v.model}) | ${v.body_type} | ${v.fuel_type} | ${v.seating_capacity} seats | Rs${v.price_1d}/day | ⭐ ${v.avg_rating}/5 (${v.review_count} review${v.review_count > 1 ? "s" : ""}) | Status: ${v.status}`,
        )
        .join("\n");

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

════════ USER'S ENQUIRIES (${enquiries.length} total) ════════
${enquiriesSection}

════════ USER'S REVIEWS (${userReviews.length} total) ════════
${userReviewsSection}

════════ TOP RATED VEHICLES (by all users) ════════
${topRatedSection}
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
   Choose online payment eSewa 

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

════════ ENQUIRY PROCESS ════════
When the user asks "how to submit enquiry", "how to contact", "how to ask a question" or similar:

Here's how to submit an enquiry on AutoDrive Nepal:

1️⃣ **Go to the Contact / Enquiry page** from the menu.
2️⃣ **Type your question** in the message box.
3️⃣ **Submit** — admin will reply as soon as possible.

You can check the status of your enquiries (Pending / Replied / Closed) from your dashboard.

════════ REVIEW PROCESS ════════
When the user asks "how to leave a review", "how to rate a vehicle", "how to give feedback" or similar:

Here's how to review a vehicle on AutoDrive Nepal:

1️⃣ **Go to My Bookings** from your dashboard.
2️⃣ **Find a Completed booking** — only completed bookings can be reviewed.
3️⃣ **Click "Leave a Review"** on the booking.
4️⃣ **Select a star rating** (1–5) and optionally add a comment.
5️⃣ **Submit** your review.

Your reviews help other users choose the right vehicle!

════════ INSTRUCTIONS ════════
- Only discuss THIS user's data. Never mention other users' personal info.
- For "my bookings / my KYC / my info / my enquiries / my reviews" use the sections above.
- For "top rated / best vehicles / highest rated / most reviewed / recommended vehicles" use the TOP RATED VEHICLES section above.
- If the user asks about the booking, KYC, enquiry, or review process, respond in ONE complete message using the exact structure defined above.
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

    /* ── GUEST MODE: no userId → serve public data only ── */
    if (!userId) {
      let vehicles = [];
      let topRatedVehicles = [];
      try {
        [vehicles, topRatedVehicles] = await Promise.all([
          query(
            `SELECT id, name, brand, model, year, body_type, fuel_type,
                    transmission, seating_capacity, color, status,
                    price_4h, price_8h, price_1d
             FROM vehicles WHERE is_deleted = 0
             ORDER BY status ASC, name ASC`,
          ),
          query(
            `SELECT v.id, v.name, v.brand, v.model, v.body_type, v.fuel_type,
                    v.seating_capacity, v.price_1d, v.status,
                    ROUND(AVG(r.rating), 1) AS avg_rating,
                    COUNT(r.id) AS review_count
             FROM vehicles v
             JOIN reviews r ON r.vehicle_id = v.id
             WHERE v.is_deleted = 0
             GROUP BY v.id
             HAVING review_count > 0
             ORDER BY avg_rating DESC, review_count DESC
             LIMIT 5`,
          ),
        ]);
      } catch (dbErr) {
        console.error("[DB Error - guest]", dbErr.message);
      }

      const available = vehicles.filter((v) => v.status === "Available");
      const msg = message.toLowerCase().trim();

      const guestSystemPrompt = `You are a helpful support assistant for AutoDrive Nepal, a vehicle rental platform in Nepal.
You are talking to a guest (not logged in). Be friendly, concise, and helpful.
Today: ${new Date().toLocaleDateString("en-NP")}

════════ AVAILABLE VEHICLES (${available.length} of ${vehicles.length}) ════════
${
  available.length
    ? available
        .map(
          (v) =>
            `• ${v.name} (${v.brand} ${v.model}, ${v.year}) | ${v.body_type} | ${v.fuel_type} | ${v.seating_capacity} seats | 4h: Rs${v.price_4h} | 8h: Rs${v.price_8h} | 1d: Rs${v.price_1d}`,
        )
        .join("\n")
    : "No vehicles available right now."
}

════════ TOP RATED VEHICLES ════════
${
  topRatedVehicles.length
    ? topRatedVehicles
        .map(
          (v, i) =>
            `${i + 1}. ${v.name} (${v.brand} ${v.model}) | ${v.body_type} | ${v.fuel_type} | Rs${v.price_1d}/day | ⭐ ${v.avg_rating}/5 (${v.review_count} review${v.review_count > 1 ? "s" : ""})`,
        )
        .join("\n")
    : "No reviewed vehicles yet."
}

════════ INSTRUCTIONS ════════
- You are helping a guest who is NOT logged in.
- You can answer questions about available vehicles, pricing, top rated vehicles, and general platform info.
- For anything account-specific (bookings, KYC, profile, reviews, enquiries), tell them to log in or register first.
- To book a vehicle the process is: 1) Register/Login  2) Complete KYC  3) Browse vehicles and book.
- Keep responses short and friendly. Use bullet points for lists.
- Never make up vehicle data — only use what is listed above.`;

      try {
        const result = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 512,
          messages: [
            { role: "system", content: guestSystemPrompt },
            ...sanitizeHistory(history).map((h) => ({
              role: h.role === "model" ? "assistant" : "user",
              content: h.parts[0].text,
            })),
            { role: "user", content: message },
          ],
        });

        const replyText = result.choices[0].message.content;
        const suggestions =
          msg.includes("vehicle") || msg.includes("car")
            ? ["Pricing", "Top rated vehicles", "Log in to book"]
            : msg.includes("book")
              ? ["Available vehicles", "Pricing", "Log in to book"]
              : ["Available vehicles", "Top rated vehicles", "Log in to book"];

        return res.json({ reply: replyText, suggestions });
      } catch (aiErr) {
        console.error("[Groq Error - guest]", aiErr.message);
        // Simple keyword fallback for guests
        if (
          msg.includes("vehicle") ||
          msg.includes("car") ||
          msg.includes("available")
        ) {
          const lines = available.map(
            (v) =>
              `• ${v.name} — ${v.body_type} | ${v.fuel_type} | Rs${v.price_1d}/day`,
          );
          return res.json({
            reply: available.length
              ? `Available vehicles:\n${lines.join("\n")}`
              : "No vehicles available right now.",
            suggestions: ["Pricing", "Top rated vehicles", "Log in to book"],
          });
        }
        return res.json({
          reply:
            "Hi! I can help you explore our vehicles and pricing. Log in to access bookings and KYC.",
          suggestions: ["Available vehicles", "Pricing", "Top rated vehicles"],
        });
      }
    }
    /* ── END GUEST MODE ── */

    // ── Fetch user data (logged-in) ──
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

    // ── Call Groq ──
    try {
      const result = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          ...cleanHistory.map((h) => ({
            role: h.role === "model" ? "assistant" : "user",
            content: h.parts[0].text,
          })),
          { role: "user", content: message },
        ],
      });

      const replyText = result.choices[0].message.content;

      return res.json({
        reply: replyText,
        suggestions: buildSuggestions(msg, data),
      });
    } catch (aiErr) {
      console.error("[Groq Error]", aiErr.message);
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
   FALLBACK (when Groq fails)
════════════════════════════════════ */
function buildFallbackReply(
  msg,
  { user, bookings, kyc, vehicles, enquiries, userReviews, topRatedVehicles },
) {
  const name = user?.name?.split(" ")[0] || "there";
  const available = vehicles.filter((v) => v.status === "Available");

  if (
    msg.includes("how to book") ||
    msg.includes("booking process") ||
    msg.includes("steps to book") ||
    (msg.includes("book") && msg.includes("how"))
  ) {
    const kycWarning =
      !kyc || kyc.status !== "verified"
        ? `\n⚠️ Your KYC is not verified yet — complete that first.\n`
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

  if (
    msg.includes("how to enquir") ||
    msg.includes("how to contact") ||
    msg.includes("submit enquiry") ||
    msg.includes("how to ask")
  ) {
    return {
      reply:
        `Here's how to submit an enquiry on AutoDrive Nepal:\n\n` +
        `1️⃣ **Go to the Contact / Enquiry page** from the menu.\n` +
        `2️⃣ **Type your question** in the message box.\n` +
        `3️⃣ **Submit** — admin will reply as soon as possible.\n\n` +
        `You can check your enquiry status (Pending / Replied / Closed) from your dashboard.`,
      suggestions: ["My enquiries", "How to book", "Available vehicles"],
    };
  }

  if (
    msg.includes("how to review") ||
    msg.includes("how to rate") ||
    msg.includes("how to give feedback") ||
    msg.includes("leave a review")
  ) {
    return {
      reply:
        `Here's how to review a vehicle on AutoDrive Nepal:\n\n` +
        `1️⃣ **Go to My Bookings** from your dashboard.\n` +
        `2️⃣ **Find a Completed booking** — only completed bookings can be reviewed.\n` +
        `3️⃣ **Click "Leave a Review"** on the booking.\n` +
        `4️⃣ **Select a star rating** (1–5) and optionally add a comment.\n` +
        `5️⃣ **Submit** your review.\n\n` +
        `Your reviews help other users choose the right vehicle!`,
      suggestions: ["My reviews", "My bookings", "Top rated vehicles"],
    };
  }

  if (msg.includes("enquir") || msg.includes("my question")) {
    if (!enquiries.length) {
      return {
        reply: `You haven't submitted any enquiries yet, ${name}. You can ask a question from the Contact/Enquiry page.`,
        suggestions: ["How to book", "Available vehicles", "My KYC status"],
      };
    }
    const lines = enquiries.map(
      (e) =>
        `• "${e.question}" — ${e.status}${e.admin_reply ? `\n  Reply: "${e.admin_reply}"` : " (awaiting reply)"}`,
    );
    return {
      reply: `Your enquiries, ${name}:\n${lines.join("\n")}`,
      suggestions: ["My bookings", "Available vehicles"],
    };
  }

  if (
    msg.includes("top rated") ||
    msg.includes("highest rated") ||
    msg.includes("best vehicle") ||
    msg.includes("most reviewed") ||
    msg.includes("recommended")
  ) {
    if (!topRatedVehicles.length) {
      return {
        reply: `No reviewed vehicles yet, ${name}. Be the first to review after your booking!`,
        suggestions: ["Available vehicles", "How to book"],
      };
    }
    const lines = topRatedVehicles.map(
      (v, i) =>
        `${i + 1}. ${v.name} — ⭐ ${v.avg_rating}/5 (${v.review_count} review${v.review_count > 1 ? "s" : ""}) | Rs${v.price_1d}/day | ${v.status}`,
    );
    return {
      reply: `Top rated vehicles on AutoDrive Nepal:\n${lines.join("\n")}`,
      suggestions: ["Available vehicles", "How to book", "My bookings"],
    };
  }

  if (
    msg.includes("my review") ||
    msg.includes("my rating") ||
    msg.includes("my feedback")
  ) {
    if (!userReviews.length) {
      return {
        reply: `You haven't submitted any reviews yet, ${name}. You can review a vehicle after completing a booking.`,
        suggestions: ["My bookings", "Available vehicles"],
      };
    }
    const lines = userReviews.map(
      (r) =>
        `• ${r.vehicle_name} — ${"⭐".repeat(r.rating)} (${r.rating}/5)${r.comment ? `: "${r.comment}"` : ""}`,
    );
    return {
      reply: `Your reviews, ${name}:\n${lines.join("\n")}`,
      suggestions: ["My bookings", "Top rated vehicles"],
    };
  }

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
    const kycMsgs = {
      verified: `✅ KYC verified, ${name}! You can book vehicles.`,
      pending: `⏳ KYC under review, ${name}. Wait up to 24 hours.`,
      rejected: `❌ KYC rejected: "${kyc.rejection_reason || "see KYC page"}". Please re-upload clear photos.`,
    };
    return {
      reply: kycMsgs[kyc.status] || `KYC status: ${kyc.status}`,
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
      suggestions: ["Pricing", "How to book", "Top rated vehicles"],
    };
  }

  return {
    reply: `Hi ${name}! Ask me about your bookings, KYC, enquiries, reviews, top rated vehicles, or pricing.`,
    suggestions: [
      "My bookings",
      "My KYC status",
      "Top rated vehicles",
      "Available vehicles",
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

  if (msg.includes("enquir") || msg.includes("contact"))
    return ["My enquiries", "My bookings", "Available vehicles"];

  if (
    msg.includes("review") ||
    msg.includes("rating") ||
    msg.includes("top rated")
  )
    return ["Top rated vehicles", "My reviews", "Available vehicles"];

  if (msg.includes("vehicle") || msg.includes("price"))
    return [`${avail} vehicles available`, "How to book", "Top rated vehicles"];

  return [
    "My bookings",
    "My KYC status",
    "Top rated vehicles",
    "Available vehicles",
  ];
}

module.exports = router;
