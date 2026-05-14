// controllers/admin.bookings.controller.js

const db = require("../config/db");
const transporter = require("../utils/mailer");
const { createNotification } = require("./notification.controller");
const { createAdminNotification } = require("./admin.notification.controller");

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

const emailWrapper = (inner) =>
  `
<!DOCTYPE html><html>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        ${inner}
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

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

const STATUS_STYLE = {
  Pending: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", icon: "⏳" },
  Confirmed: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", icon: "✅" },
  Active: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", icon: "🚗" },
  Completed: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46", icon: "🏁" },
  Cancelled: { bg: "#fff1f2", border: "#fecdd3", text: "#991b1b", icon: "❌" },
};

const STATUS_ICON = {
  Pending: "⏳",
  Confirmed: "✅",
  Active: "🚗",
  Completed: "🏁",
  Cancelled: "❌",
};

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/admin/bookings
════════════════════════════════════════════════════════════════════════ */
exports.getAllBookings = (req, res) => {
  const sql = `
    SELECT b.id, b.booking_ref, b.user_id, b.user_name, b.user_email, b.user_phone,
           b.pickup_location, b.rental_type, b.pickup_datetime, b.drop_datetime,
           b.total_days, b.price_per_unit, b.total_price, b.status,
           b.payment_status, b.payment_method, b.paid_at, b.cancel_reason,
           b.notes, b.created_at,
           v.id AS vehicle_id, v.name AS vehicle_name,
           v.license_plate AS vehicle_plate,
           v.body_type AS vehicle_type, v.thumbnail AS vehicle_img,
           k.status AS kyc_status
    FROM bookings b
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    LEFT JOIN kyc     k ON b.user_id     = k.user_id
    ORDER BY b.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });

    const BASE = "http://localhost:5000";
    const toDate = (val) => {
      if (!val) return "—";
      const d = val instanceof Date ? val : new Date(val);
      return d.toISOString().split("T")[0];
    };

    const formatted = results.map((b) => ({
      id: b.id,
      booking_ref: b.booking_ref,
      user_name: b.user_name,
      user_email: b.user_email,
      user_phone: b.user_phone,
      user_photo: "",
      vehicle_name: b.vehicle_name || "—",
      vehicle_plate: b.vehicle_plate || "—",
      vehicle_type: b.vehicle_type || "—",
      vehicle_img: b.vehicle_img
        ? `${BASE}/uploads/vehicles/${b.vehicle_img.replace(/^\/+/, "")}`
        : null,
      pickup_location: b.pickup_location,
      dropoff_location: b.pickup_location,
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
      kyc_status: b.kyc_status || "not_submitted",
      cancel_reason: b.cancel_reason || "",
      notes: b.notes || "",
      booked_on: toDate(b.created_at),
    }));

    res.json({ success: true, data: formatted });
  });
};

/* 
   PUT /api/admin/bookings/:id
  Notifies the USER via `notifications` table + socket
  Logs for other ADMINs via `admin_notifications` table + socket
  Sends email to user
  Syncs vehicle status (Booked / Available)*/
exports.updateBookingStatus = (req, res) => {
  const { id } = req.params;
  const { status, cancel_reason } = req.body;

  const VALID = ["Pending", "Confirmed", "Active", "Completed", "Cancelled"];
  if (!VALID.includes(status))
    return res
      .status(400)
      .json({ success: false, message: `Invalid status: ${status}` });

  // Fetch full booking for emails + notifications
  db.query(
    `SELECT b.*, v.name AS vehicle_name, v.license_plate
     FROM bookings b LEFT JOIN vehicles v ON b.vehicle_id = v.id
     WHERE b.id = ?`,
    [id],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      if (!rows.length)
        return res
          .status(404)
          .json({ success: false, message: `Booking #${id} not found` });

      const b = rows[0];

      // Update booking status
      db.query(
        "UPDATE bookings SET status = ?, cancel_reason = ?, updated_at = NOW() WHERE id = ?",
        [status, cancel_reason || null, id],
        async (err2) => {
          if (err2)
            return res
              .status(500)
              .json({ success: false, message: err2.message });

          if (b.vehicle_id) {
            let vehicleStatus = null;
            if (status === "Confirmed" || status === "Active") {
              vehicleStatus = "Booked";
            } else if (status === "Completed" || status === "Cancelled") {
              vehicleStatus = "Available";
            }
            if (vehicleStatus) {
              db.query(
                "UPDATE vehicles SET status = ? WHERE id = ?",
                [vehicleStatus, b.vehicle_id],
                (vErr) => {
                  if (vErr) console.warn("[vehicleSync] Failed:", vErr.message);
                },
              );
            }
          }

          const icon = STATUS_ICON[status] || "🔔";
          const s = STATUS_STYLE[status] || STATUS_STYLE.Pending;

          // ── 3. Notify USER ────────────────────────────────────
          try {
            await createNotification({
              user_id: b.user_id,
              booking_id: b.id,
              title: `Booking ${status} ${icon}`,
              message: `Your booking ${b.booking_ref} for ${b.vehicle_name || "your vehicle"} has been marked as ${status}.${
                status === "Cancelled" && cancel_reason
                  ? ` Reason: ${cancel_reason}`
                  : ""
              }`,
              type: "booking",
              target_role: "user",
            });
          } catch (e) {
            console.warn(
              "[updateBookingStatus] User notification error:",
              e.message,
            );
          }

          // ── 4. Log for ADMIN ──────────────────────────────────
          try {
            await createAdminNotification({
              title: `Booking ${status} ${icon}`,
              message: `Booking ${b.booking_ref} for ${b.user_name} marked as ${status}.`,
              type: "booking",
              ref_id: b.id,
              ref_type: "booking",
              meta: {
                booking_ref: b.booking_ref,
                user_name: b.user_name,
                vehicle_name: b.vehicle_name,
                status,
              },
            });
          } catch (e) {
            console.warn(
              "[updateBookingStatus] Admin notification error:",
              e.message,
            );
          }

          // ── 5. Email USER ─────────────────────────────────────
          try {
            if (b.user_email) {
              await transporter.sendMail({
                from: `"Auto Dealer" <${process.env.EMAIL_USER}>`,
                to: b.user_email,
                subject: `Booking ${status} — ${b.booking_ref}`,
                html: emailWrapper(`
                  ${emailHeader(`Booking ${status}`)}
                  <tr><td style="padding:32px;">
                    <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">Hi ${b.user_name},</p>
                    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">Your booking status has been updated.</p>
                    <div style="background:${s.bg};border:1px solid ${s.border};border-radius:8px;padding:16px 20px;margin-bottom:20px;">
                      <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:${s.text};">${icon} Status: ${status}</p>
                      ${
                        status === "Cancelled" && cancel_reason
                          ? `<p style="margin:4px 0 0;font-size:13px;color:${s.text};opacity:0.85;">Reason: ${cancel_reason}</p>`
                          : ""
                      }
                    </div>
                    <div style="background:#f4f5f7;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        ${infoRow("Booking Ref", `<b style="font-family:monospace;">${b.booking_ref}</b>`)}
                        ${infoRow("Vehicle", b.vehicle_name || "—")}
                        ${infoRow("Plate No.", b.license_plate || "—")}
                        ${infoRow("Pickup", b.pickup_location)}
                        ${infoRow("From", fmtDate(b.pickup_datetime))}
                        ${infoRow("To", fmtDate(b.drop_datetime))}
                        ${infoRow("Total", `<b style="color:#ff5c1a;">${fmtPrice(b.total_price)}</b>`)}
                      </table>
                    </div>
                    <p style="margin:0;font-size:13px;color:#9ca3af;">Questions? Contact us through our website.</p>
                  </td></tr>
                  ${emailFooter()}
                `),
              });
            }
          } catch (e) {
            console.error("Booking status email error:", e);
          }

          return res.json({
            success: true,
            message: "Booking updated and notifications sent",
          });
        },
      );
    },
  );
};
