// controllers/booking.controller.js
// USER creates a booking → saves to DB → notifies admin → emails admin + user

const db = require("../config/db");
const transporter = require("../utils/mailer");
const { createNotification } = require("./notification.controller");
const { createAdminNotification } = require("./admin.notification.controller");

// ── Booking ref generator ────────────────────────────────────────────────
function generateBookingRef() {
  return "AD" + Date.now() + Math.floor(Math.random() * 10);
}

// ── Helpers ──────────────────────────────────────────────────────────────
const fmtDate = (val) => {
  if (!val) return "—";
  const d = val instanceof Date ? val : new Date(val);
  return d.toLocaleDateString("en-NP", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
const fmtPrice = (n) => "Rs " + Number(n).toLocaleString("en-NP");

const emailWrapper = (innerHtml) =>
  `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        ${innerHtml}
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

const emailHeader = (tag) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <tr>
      <td>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#ff5c1a;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;">
            <span style="color:#fff;font-size:12px;font-weight:700;font-family:monospace;">AD</span>
          </td>
          <td style="padding-left:12px;">
            <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:2px;font-family:monospace;">AUTO DEALER</div>
            <div style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:1.5px;font-family:monospace;">FLEET MANAGEMENT</div>
          </td>
        </tr></table>
      </td>
      <td align="right">
        <span style="background:#ff5c1a;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:99px;">${tag}</span>
      </td>
    </tr>
  </table>`;

const emailFooter = () => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;border-radius:0 0 12px 12px;">
    <tr><td style="text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Auto Dealer · Fleet Management System</p>
    </td></tr>
  </table>`;

const infoRow = (label, value) => `
  <tr>
    <td style="padding:9px 0;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#9ca3af;font-family:monospace;width:40%;border-bottom:1px solid #f3f4f6;">${label}</td>
    <td style="padding:9px 0;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6;">${value}</td>
  </tr>`;

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/bookings   (user creates booking)
════════════════════════════════════════════════════════════════════════ */
exports.createBooking = async (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, message: "Not logged in" });

  const {
    vehicle_id,
    user_name,
    user_email,
    user_phone,
    pickup_location,
    rental_type,
    pickup_datetime,
    drop_datetime,
    total_days,
    price_per_unit,
    total_price,
    payment_method,
    notes,
  } = req.body;

  // ── 1. Required field check ───────────────────────────────────────────
  if (
    !vehicle_id ||
    !user_name ||
    !user_email ||
    !pickup_location ||
    !rental_type ||
    !pickup_datetime ||
    !drop_datetime ||
    !total_price
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  // ── 2. Date validation ────────────────────────────────────────────────
  const pickup = new Date(pickup_datetime);
  const drop = new Date(drop_datetime);

  if (isNaN(pickup.getTime()) || isNaN(drop.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid date format" });
  }

  if (drop <= pickup) {
    return res.status(400).json({
      success: false,
      message: "Drop-off time must be after pickup time",
    });
  }

  // ── 3. Calculate actual duration ──────────────────────────────────────
  const diffMs = drop - pickup;
  const calculatedDays = diffMs / (1000 * 60 * 60 * 24);

  if (calculatedDays <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid booking duration" });
  }

  const booking_ref = generateBookingRef();

  const sql = `
    INSERT INTO bookings
      (booking_ref, user_id, vehicle_id, user_name, user_email, user_phone,
       pickup_location, rental_type, pickup_datetime, drop_datetime,
       total_days, price_per_unit, total_price, payment_method, notes,
       status, payment_status, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'Pending','Unpaid',NOW())
  `;

  db.query(
    sql,
    [
      booking_ref,
      userId,
      vehicle_id,
      user_name,
      user_email,
      user_phone || "",
      pickup_location,
      rental_type,
      pickup_datetime,
      drop_datetime,
      calculatedDays, // use server-calculated value, not client-sent
      price_per_unit || 0,
      total_price,
      payment_method || null,
      notes || null,
    ],
    async (err, result) => {
      if (err) {
        console.error("createBooking DB error:", err);
        return res.status(500).json({ success: false, message: err.message });
      }

      const bookingId = result.insertId;

      // ── Fetch vehicle name for notifications ──────────────────
      let vehicleName = "Vehicle";
      try {
        const [vRows] = await new Promise((resolve, reject) =>
          db.query(
            "SELECT name FROM vehicles WHERE id = ?",
            [vehicle_id],
            (e, r) => (e ? reject(e) : resolve([r])),
          ),
        );
        if (vRows?.[0]?.name) vehicleName = vRows[0].name;
      } catch (_) {}

      // ── 2. Notify ADMIN: new booking ─────────────────────────
      try {
        await createAdminNotification({
          title: "New Booking 📋",
          message: `${user_name} booked ${vehicleName} (${booking_ref}). Total: ${fmtPrice(total_price)}.`,
          type: "booking",
          ref_id: bookingId,
          ref_type: "booking",
          meta: {
            booking_ref,
            user_id: userId,
            user_name,
            user_email,
            vehicle_id,
            vehicle_name: vehicleName,
            total_price,
            pickup_location,
            rental_type,
          },
        });
      } catch (e) {
        console.warn("[createBooking] Admin notification error:", e.message);
      }

      // ── 3. Email USER: booking confirmation ───────────────────
      try {
        await transporter.sendMail({
          from: `"Auto Dealer" <${process.env.EMAIL_USER}>`,
          to: user_email,
          subject: `Booking Received — ${booking_ref}`,
          html: emailWrapper(`
            ${emailHeader("Booking Received")}
            <tr><td style="padding:32px;">
              <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">Hi ${user_name},</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                Thank you for your booking! We have received your request and will confirm it shortly.
              </p>
              <div style="background:#f4f5f7;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${infoRow("Booking Ref", `<b style="font-family:monospace;">${booking_ref}</b>`)}
                  ${infoRow("Vehicle", vehicleName)}
                  ${infoRow("Pickup", pickup_location)}
                  ${infoRow("From", fmtDate(pickup_datetime))}
                  ${infoRow("To", fmtDate(drop_datetime))}
                  ${infoRow("Total", `<b style="color:#ff5c1a;">${fmtPrice(total_price)}</b>`)}
                  ${infoRow("Status", '<span style="color:#d97706;font-weight:600;">Pending Confirmation</span>')}
                </table>
              </div>
              <div style="background:#fff8e8;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
                <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                  ⏳ Your booking is pending confirmation. You will receive another email once it is confirmed.
                </p>
              </div>
              <p style="margin:0;font-size:13px;color:#9ca3af;">Questions? Contact us through our website.</p>
            </td></tr>
            ${emailFooter()}
          `),
        });
      } catch (e) {
        console.error("Booking email to user error:", e);
      }

      // ── 4. Email ADMIN: new booking alert ─────────────────────
      try {
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        await transporter.sendMail({
          from: `"Auto Dealer" <${process.env.EMAIL_USER}>`,
          to: adminEmail,
          subject: `New Booking — ${booking_ref}`,
          html: emailWrapper(`
            ${emailHeader("New Booking Alert")}
            <tr><td style="padding:32px;">
              <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">New Booking Received</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                A new booking has been submitted and requires your attention.
              </p>
              <div style="background:#f4f5f7;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${infoRow("Booking Ref", `<b style="font-family:monospace;">${booking_ref}</b>`)}
                  ${infoRow("Customer", `${user_name} (${user_email})`)}
                  ${infoRow("Phone", user_phone || "—")}
                  ${infoRow("Vehicle", vehicleName)}
                  ${infoRow("Pickup", pickup_location)}
                  ${infoRow("From", fmtDate(pickup_datetime))}
                  ${infoRow("To", fmtDate(drop_datetime))}
                  ${infoRow("Total", `<b style="color:#ff5c1a;">${fmtPrice(total_price)}</b>`)}
                </table>
              </div>
              <p style="margin:0;font-size:13px;color:#9ca3af;">Log in to the admin panel to confirm or update this booking.</p>
            </td></tr>
            ${emailFooter()}
          `),
        });
      } catch (e) {
        console.error("Booking email to admin error:", e);
      }

      return res.status(201).json({
        success: true,
        message: "Booking created successfully",
        booking_id: bookingId,
        booking_ref,
      });
    },
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/bookings/user/:userId
════════════════════════════════════════════════════════════════════════ */
exports.getUserBookings = (req, res) => {
  const userId = req.session?.user?.id || req.params.userId;

  const sql = `
    SELECT b.*, v.name AS vehicle_name, v.thumbnail AS vehicle_img,
           v.body_type AS vehicle_type
    FROM bookings b
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });

    const BASE = "http://localhost:5000";
    const formatted = results.map((b) => ({
      ...b,
      vehicle_img: b.vehicle_img
        ? `${BASE}/uploads/vehicles/${b.vehicle_img}`
        : null,
    }));

    res.json({ success: true, data: formatted });
  });
};

/* ═══════════════════════════════════════════════════════════════════════
   DELETE /api/bookings/:id  (user cancels their own booking)
════════════════════════════════════════════════════════════════════════ */
exports.deleteBooking = (req, res) => {
  const userId = req.session?.user?.id;
  const { id } = req.params;

  db.query(
    "SELECT * FROM bookings WHERE id = ? AND user_id = ?",
    [id, userId],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      if (!rows.length)
        return res
          .status(404)
          .json({ success: false, message: "Booking not found" });

      const b = rows[0];
      if (["Completed", "Cancelled"].includes(b.status))
        return res
          .status(400)
          .json({ success: false, message: "Cannot cancel this booking" });

      db.query(
        "UPDATE bookings SET status = 'Cancelled', cancel_reason = 'Cancelled by user', updated_at = NOW() WHERE id = ?",
        [id],
        async (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ success: false, message: err2.message });

          // Notify admin about user cancellation
          try {
            await createAdminNotification({
              title: "Booking Cancelled ❌",
              message: `${b.user_name} cancelled booking ${b.booking_ref}.`,
              type: "booking",
              ref_id: b.id,
              ref_type: "booking",
              meta: {
                booking_ref: b.booking_ref,
                user_name: b.user_name,
                user_email: b.user_email,
              },
            });
          } catch (e) {
            console.warn(
              "[deleteBooking] Admin notification error:",
              e.message,
            );
          }

          res.json({
            success: true,
            message: "Booking cancelled successfully",
          });
        },
      );
    },
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/bookings  (admin — all bookings)
════════════════════════════════════════════════════════════════════════ */
exports.getAllBookings = (req, res) => {
  db.query(
    `SELECT b.*, v.name AS vehicle_name FROM bookings b
     LEFT JOIN vehicles v ON b.vehicle_id = v.id
     ORDER BY b.created_at DESC`,
    (err, results) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, data: results });
    },
  );
};
