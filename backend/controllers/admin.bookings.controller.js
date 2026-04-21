const transporter = require("../utils/mailer");
const db = require("../config/db");

// ───────── GET ALL BOOKINGS ─────────
exports.getAllBookings = (req, res) => {
  const sql = `
    SELECT
      b.id,
      b.booking_ref,
      b.user_name,
      b.user_email,
      b.user_phone,
      b.pickup_location,
      b.rental_type,
      b.pickup_datetime,
      b.drop_datetime,
      b.total_days,
      b.price_per_unit,
      b.total_price,
      b.status,
      b.payment_status,
      b.payment_method,
      b.paid_at,
      b.cancel_reason,
      b.notes,
      b.created_at,

      v.id          AS vehicle_id,
      v.name        AS vehicle_name,
      v.license_plate AS vehicle_plate,
      v.body_type   AS vehicle_type,
      v.thumbnail   AS vehicle_img,

      k.status      AS kyc_status
    FROM bookings b
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    LEFT JOIN kyc k      ON b.user_id    = k.user_id
    ORDER BY b.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllBookings error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    const BASE = "http://localhost:5000";

    const formatted = results.map((b) => {
      // ── dates ──
      const toDate = (val) => {
        if (!val) return "—";
        const d = val instanceof Date ? val : new Date(val);
        return d.toISOString().split("T")[0];
      };

      // ── vehicle thumbnail ──
      const BASE = "http://localhost:5000";

      const vehicle_img = b.vehicle_img
        ? `${BASE}/uploads/vehicles/${b.vehicle_img.replace(/^\/+/, "")}`
        : null;

      // ── kyc status fallback ──
      const kyc_status = b.kyc_status || "not_submitted";

      return {
        id: b.id,
        booking_ref: b.booking_ref,

        user_name: b.user_name,
        user_email: b.user_email,
        user_phone: b.user_phone,
        user_photo: "", // not stored in bookings table

        vehicle_name: b.vehicle_name || "—",
        vehicle_plate: b.vehicle_plate || "—",
        vehicle_type: b.vehicle_type || "—",
        vehicle_img,

        pickup_location: b.pickup_location,
        dropoff_location: b.pickup_location, // same field in your schema

        rental_type: b.rental_type,
        start_date: toDate(b.pickup_datetime),
        end_date: toDate(b.drop_datetime),
        total_days: parseFloat(b.total_days) || 1,

        per_day: parseFloat(b.price_per_unit) || 0,
        total_price: parseFloat(b.total_price) || 0,
        extra_charges: 0,
        discount: 0,

        status: b.status || "Pending",
        payment_status: b.payment_status || "Unpaid",
        payment_method: b.payment_method || "—",
        paid_at: toDate(b.paid_at),

        kyc_status,

        cancel_reason: b.cancel_reason || "",
        notes: b.notes || "",
        booked_on: toDate(b.created_at),
      };
    });

    res.json({ success: true, data: formatted });
  });
};

// ───────── UPDATE BOOKING STATUS ─────────
exports.updateBookingStatus = (req, res) => {
  const { id } = req.params;
  const { status, cancel_reason } = req.body;

  const VALID = ["Pending", "Confirmed", "Active", "Completed", "Cancelled"];

  if (!VALID.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status: ${status}`,
    });
  }

  // 1. Get booking + user info first
  const getSql = `
    SELECT 
      user_name,
      user_email,
      booking_ref
    FROM bookings
    WHERE id = ?
  `;

  db.query(getSql, [id], (err, rows) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Booking #${id} not found`,
      });
    }

    const user = rows[0];

    // DEBUG (very important)
    console.log("📧 USER EMAIL:", user.user_email);

    // 2. Update booking status
    const updateSql = `
      UPDATE bookings
      SET status = ?, cancel_reason = ?, updated_at = NOW()
      WHERE id = ?
    `;

    db.query(updateSql, [status, cancel_reason || null, id], async (err2) => {
      if (err2) {
        console.error("Update error:", err2);
        return res.status(500).json({ success: false, message: err2.message });
      }

      // 3. Send email to USER
      try {
        if (user.user_email) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.user_email,
            subject: `Booking Update - ${user.booking_ref}`,
            html: `
              <h2>Booking Status Updated</h2>
              <p>Hi <b>${user.user_name}</b>,</p>

              <p>Your booking <b>${user.booking_ref}</b> has been updated.</p>

              <p><b>Status:</b> ${status}</p>

              ${
                status === "Cancelled"
                  ? `<p><b>Reason:</b> ${cancel_reason || "Not provided"}</p>`
                  : ""
              }

              <br/>
              <p>Thank you for choosing our service.</p>
            `,
          });

          console.log("✅ Email sent to user");
        } else {
          console.log("⚠️ No user email found");
        }
      } catch (mailErr) {
        console.error("❌ Email error:", mailErr);
      }

      return res.json({
        success: true,
        message: "Booking updated and user notified",
      });
    });
  });
};
