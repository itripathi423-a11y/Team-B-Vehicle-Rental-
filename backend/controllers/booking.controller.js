// booking.controller.js
const db = require("../config/db");
const transporter = require("../utils/mailer");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";

// ── helpers ──────────────────────────────────────────────────────────────
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

// shared brand header snippet
const emailHeader = (tagLabel) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <tr>
      <td>
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#ff5c1a;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;">
              <span style="color:#fff;font-size:12px;font-weight:700;font-family:monospace;">AD</span>
            </td>
            <td style="padding-left:12px;">
              <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:2px;font-family:monospace;">AUTO DEALER</div>
              <div style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:1.5px;font-family:monospace;">FLEET MANAGEMENT</div>
            </td>
          </tr>
        </table>
      </td>
      <td align="right">
        <span style="background:#ff5c1a;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:99px;">${tagLabel}</span>
      </td>
    </tr>
  </table>`;

const emailFooter = () => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;border-radius:0 0 12px 12px;">
    <tr>
      <td style="text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Auto Dealer · Fleet Management System</p>
      </td>
    </tr>
  </table>`;

const emailWrapper = (innerHtml) =>
  `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          ${innerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

// row helper for booking detail table
const row = (label, value) => `
  <tr>
    <td style="padding:10px 0;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;
               color:#9ca3af;font-family:monospace;width:40%;border-bottom:1px solid #f3f4f6;">${label}</td>
    <td style="padding:10px 0;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6;">${value}</td>
  </tr>`;

// status pill colour
const statusColor = (s) =>
  ({
    Pending: { bg: "#fffbeb", color: "#d97706" },
    Confirmed: { bg: "#eff6ff", color: "#2563eb" },
    Active: { bg: "#f0fdf4", color: "#16a34a" },
    Completed: { bg: "#ecfdf5", color: "#059669" },
    Cancelled: { bg: "#fff1f2", color: "#dc2626" },
  })[s] || { bg: "#f3f4f6", color: "#6b7280" };

// ── CREATE BOOKING ────────────────────────────────────────────────────────
exports.createBooking = (req, res) => {
  const {
    vehicle_id,
    user_id,
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
    notes,
  } = req.body;

  if (
    !vehicle_id ||
    !user_id ||
    !user_name ||
    !user_email ||
    !user_phone ||
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

  const booking_ref = "AD" + Date.now();

  const sql = `
    INSERT INTO bookings (
      booking_ref, user_id, vehicle_id,
      user_name, user_email, user_phone,
      pickup_location, rental_type,
      pickup_datetime, drop_datetime,
      total_days, price_per_unit, total_price, notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  db.query(
    sql,
    [
      booking_ref,
      user_id,
      vehicle_id,
      user_name,
      user_email,
      user_phone,
      pickup_location,
      rental_type,
      pickup_datetime,
      drop_datetime,
      total_days || 1,
      price_per_unit || total_price,
      total_price,
      notes || null,
    ],
    async (err, result) => {
      if (err) {
        console.error("Booking insert error:", err);
        return res
          .status(500)
          .json({
            success: false,
            message: "Booking failed",
            error: err.message,
          });
      }

      // ── Email 1: notify ADMIN ─────────────────────────────────────────
      try {
        await transporter.sendMail({
          from: `"Auto Dealer System" <${process.env.EMAIL_USER}>`,
          to: ADMIN_EMAIL,
          subject: `🚗 New Booking — ${booking_ref}`,
          html: emailWrapper(`
          ${emailHeader("New Booking")}
          <tr><td style="padding:32px;">
            <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">New Booking Received</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
              A new booking has just been placed. Review it in the admin dashboard.
            </p>
            <div style="background:#f4f5f7;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${row("Booking Ref", `<b style="font-family:monospace;">${booking_ref}</b>`)}
                ${row("Customer", user_name)}
                ${row("Email", user_email)}
                ${row("Phone", user_phone)}
                ${row("Pickup", pickup_location)}
                ${row("Rental Type", rental_type)}
                ${row("From", fmtDate(pickup_datetime))}
                ${row("To", fmtDate(drop_datetime))}
                ${row("Total", `<b style="color:#ff5c1a;">${fmtPrice(total_price)}</b>`)}
                ${row("Notes", notes || "—")}
              </table>
            </div>
            <p style="margin:0;font-size:13px;color:#9ca3af;">Please log in to the admin dashboard to confirm or manage this booking.</p>
          </td></tr>
          ${emailFooter()}
        `),
        });
      } catch (emailErr) {
        console.error("Admin booking email error:", emailErr);
      }

      // ── Email 2: confirm to USER ──────────────────────────────────────
      try {
        await transporter.sendMail({
          from: `"Auto Dealer" <${process.env.EMAIL_USER}>`,
          to: user_email,
          subject: `Booking Confirmed — ${booking_ref}`,
          html: emailWrapper(`
          ${emailHeader("Booking Confirmed")}
          <tr><td style="padding:32px;">
            <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">Hi ${user_name},</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
              Your booking has been received and is being processed. Here are your booking details:
            </p>
            <div style="background:#f4f5f7;border-radius:8px;padding:20px 24px;margin-bottom:16px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${row("Booking Ref", `<b style="font-family:monospace;">${booking_ref}</b>`)}
                ${row("Pickup", pickup_location)}
                ${row("Rental Type", rental_type)}
                ${row("From", fmtDate(pickup_datetime))}
                ${row("To", fmtDate(drop_datetime))}
                ${row("Total", `<b style="color:#ff5c1a;">${fmtPrice(total_price)}</b>`)}
                ${notes ? row("Notes", notes) : ""}
              </table>
            </div>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
              <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
                ⏳ Your booking status is currently <b>Pending</b>. 
                You will receive another email once it is confirmed by our team.
              </p>
            </div>
            <p style="margin:0;font-size:13px;color:#9ca3af;">
              Questions? Reply to this email or contact us through the website.
            </p>
          </td></tr>
          ${emailFooter()}
        `),
        });
      } catch (emailErr) {
        console.error("User booking confirmation email error:", emailErr);
      }

      return res.json({
        success: true,
        message: "Booking created successfully",
        booking_ref,
        booking_id: result.insertId,
      });
    },
  );
};

// ── GET ALL BOOKINGS FOR A USER ───────────────────────────────────────────
exports.getUserBookings = (req, res) => {
  const userId = req.params.userId;
  const sql = `
    SELECT b.*, b.id AS booking_id,
           v.name AS vehicle_name, v.thumbnail, v.body_type, v.fuel_type, v.license_plate
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "DB error" });
    }
    res.json({ success: true, bookings: results });
  });
};

// ── GET ALL BOOKINGS (ADMIN) ──────────────────────────────────────────────
exports.getAllBookings = (req, res) => {
  const sql = `
    SELECT b.*, v.name AS vehicle_name, v.thumbnail
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    ORDER BY b.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "DB error" });
    }
    res.json({ success: true, data: results });
  });
};
