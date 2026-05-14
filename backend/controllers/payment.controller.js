const axios = require("axios");
const db = require("../config/db");
const transporter = require("../utils/mailer");
const { createNotification } = require("./notification.controller");
const { createAdminNotification } = require("./admin.notification.controller");

const KHALTI_INITIATE = "https://dev.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP = "https://dev.khalti.com/api/v2/epayment/lookup/";

const fmtPrice = (n) => "Rs " + Number(n).toLocaleString("en-NP");

// ── email helpers (keep your existing ones) ──────────────────────────────
const emailWrapper = (inner) =>
  `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  ${inner}
</table></td></tr></table></body></html>`.trim();

const emailHeader = (tag) => `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 32px;">
<tr>
  <td><table cellpadding="0" cellspacing="0"><tr>
    <td style="background:#ff5c1a;border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;">
      <span style="color:#fff;font-size:12px;font-weight:700;font-family:monospace;">AD</span>
    </td>
    <td style="padding-left:12px;">
      <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:2px;font-family:monospace;">AUTO DEALER</div>
      <div style="color:rgba(255,255,255,0.4);font-size:9px;letter-spacing:1.5px;font-family:monospace;">FLEET MANAGEMENT</div>
    </td>
  </tr></table></td>
  <td align="right">
    <span style="background:#5c2d91;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:99px;">${tag}</span>
  </td>
</tr></table>`;

const emailFooter = () => `
<table width="100%" cellpadding="0" cellspacing="0"
  style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;">
<tr><td style="text-align:center;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Auto Dealer · Fleet Management System</p>
</td></tr></table>`;

const infoRow = (label, value) => `
<tr>
  <td style="padding:9px 0;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;
             color:#9ca3af;font-family:monospace;width:40%;border-bottom:1px solid #f3f4f6;">${label}</td>
  <td style="padding:9px 0;font-size:14px;color:#111827;border-bottom:1px solid #f3f4f6;">${value}</td>
</tr>`;

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/payments/initiate
   Frontend calls this AFTER creating the booking.
   Returns { payment_url, pidx }
════════════════════════════════════════════════════════════════════════ */
exports.initiatePayment = async (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, message: "Not logged in" });

  const { booking_id } = req.body;
  if (!booking_id)
    return res
      .status(400)
      .json({ success: false, message: "booking_id required" });

  let booking;
  try {
    const [rows] = await new Promise((resolve, reject) =>
      db.query(
        "SELECT * FROM bookings WHERE id = ? AND user_id = ?",
        [booking_id, userId],
        (e, r) => (e ? reject(e) : resolve([r])),
      ),
    );
    booking = rows?.[0];
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }

  if (!booking)
    return res
      .status(404)
      .json({ success: false, message: "Booking not found" });
  if (booking.payment_status === "Paid")
    return res.status(400).json({ success: false, message: "Already paid" });

  const mockPidx = "mock_" + Date.now();

  db.query(
    `INSERT INTO payments (booking_id, user_id, pidx, amount, status, created_at)
     VALUES (?, ?, ?, ?, 'Pending', NOW())`,
    [booking.id, userId, mockPidx, booking.total_price],
    (e) => {
      if (e) console.error("Payment insert error:", e.message);
    },
  );

  const mockPaymentUrl =
    `${process.env.BACKEND_URL}/api/payments/verify` +
    `?pidx=${mockPidx}&purchase_order_id=${booking.id}&status=Completed`;

  return res.json({
    success: true,
    payment_url: mockPaymentUrl,
    pidx: mockPidx,
  });
};

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/payments/verify?pidx=...&purchase_order_id=...&status=...
   Khalti redirects the user's browser here after payment.
════════════════════════════════════════════════════════════════════════ */
exports.verifyPayment = async (req, res) => {
  const { pidx, purchase_order_id } = req.query;
  const FAIL_URL = `${process.env.FRONTEND_URL}/user.payment.html?error=payment_failed`;

  if (!pidx || !purchase_order_id) return res.redirect(FAIL_URL);

  const isMock = pidx.startsWith("mock_");
  const bookingId = purchase_order_id;
  const transactionId = isMock ? "MOCK_TXN_" + Date.now() : "";

  // For real Khalti (future use)
  let khaltiStatus = "Completed";
  let txnAmountFromKhalti = null;

  if (!isMock) {
    try {
      const { data } = await axios.post(
        KHALTI_LOOKUP,
        { pidx },
        {
          headers: {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      );
      khaltiStatus = data.status;
      txnAmountFromKhalti = data.total_amount / 100;
      if (khaltiStatus !== "Completed")
        return res.redirect(`${FAIL_URL}&khalti_status=${khaltiStatus}`);
    } catch (err) {
      console.error("Khalti lookup error:", err.response?.data || err.message);
      return res.redirect(FAIL_URL);
    }
  }

  // Fetch booking
  let booking;
  try {
    const [rows] = await new Promise((resolve, reject) =>
      db.query(
        `SELECT b.*, v.name AS vehicle_name
         FROM bookings b
         LEFT JOIN vehicles v ON b.vehicle_id = v.id
         WHERE b.id = ?`,
        [bookingId],
        (e, r) => (e ? reject(e) : resolve([r])),
      ),
    );
    booking = rows?.[0];
  } catch (err) {
    return res.redirect(FAIL_URL);
  }

  if (!booking) return res.redirect(FAIL_URL);

  const txnAmount = txnAmountFromKhalti ?? parseFloat(booking.total_price);

  // Update booking
  await new Promise((resolve) =>
    db.query(
      `UPDATE bookings
       SET payment_status = 'Paid', payment_method = 'Khalti',
           transaction_id = ?, paid_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [transactionId, bookingId],
      (e) => {
        if (e) console.error("Booking update error:", e.message);
        resolve();
      },
    ),
  );

  // Update payments row
  await new Promise((resolve) =>
    db.query(
      `UPDATE payments SET status = 'Completed', transaction_id = ? WHERE pidx = ?`,
      [transactionId, pidx],
      (e) => {
        if (e) console.error("Payment update error:", e.message);
        resolve();
      },
    ),
  );

  // Notify user
  try {
    await createNotification({
      user_id: booking.user_id,
      booking_id: booking.id,
      title: "Payment Confirmed 💳",
      message: `Your payment of ${fmtPrice(txnAmount)} for booking ${booking.booking_ref} has been confirmed. TXN: ${transactionId}`,
      type: "booking",
      target_role: "user",
    });
  } catch (e) {
    console.warn("Notify user error:", e.message);
  }

  // Notify admin
  try {
    await createAdminNotification({
      title: "Payment Received 💳",
      message: `${booking.user_name} paid ${fmtPrice(txnAmount)} for ${booking.booking_ref}.`,
      type: "booking",
      ref_id: booking.id,
      ref_type: "booking",
      meta: {
        booking_ref: booking.booking_ref,
        amount: txnAmount,
        transaction_id: transactionId,
      },
    });
  } catch (e) {
    console.warn("Admin notify error:", e.message);
  }

  // Email user
  try {
    await transporter.sendMail({
      from: `"Auto Dealer" <${process.env.EMAIL_USER}>`,
      to: booking.user_email,
      subject: `Payment Confirmed — ${booking.booking_ref}`,
      html: emailWrapper(`
        ${emailHeader("Payment Confirmed")}
        <tr><td style="padding:32px;">
          <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">Hi ${booking.user_name},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Your payment has been confirmed and your booking is now active.
          </p>
          <div style="background:#f4f5f7;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${infoRow("Booking Ref", `<b style="font-family:monospace;">${booking.booking_ref}</b>`)}
              ${infoRow("Vehicle", booking.vehicle_name || "—")}
              ${infoRow("Amount Paid", `<b style="color:#5c2d91;">${fmtPrice(txnAmount)}</b>`)}
              ${infoRow("Transaction ID", `<span style="font-family:monospace;font-size:12px;">${transactionId}</span>`)}
              ${infoRow("Status", '<span style="color:#16a34a;font-weight:600;">Paid ✓</span>')}
            </table>
          </div>
        </td></tr>
        ${emailFooter()}
      `),
    });
  } catch (e) {
    console.error("Email error:", e.message);
  }

  return res.redirect(
    `${process.env.FRONTEND_URL}/user.payment.success.html` +
      `?ref=${booking.booking_ref}&txn=${transactionId}&amount=${txnAmount}` +
      `&vehicle=${encodeURIComponent(booking.vehicle_name || "")}&paid=true`,
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/payments/booking/:bookingId
════════════════════════════════════════════════════════════════════════ */
exports.getPaymentByBooking = (req, res) => {
  const userId = req.session?.user?.id;
  const { bookingId } = req.params;

  db.query(
    `SELECT p.*, b.booking_ref, b.total_price, b.payment_status,
            v.name AS vehicle_name, v.thumbnail AS vehicle_img,
            b.pickup_location, b.pickup_datetime, b.drop_datetime, b.rental_type
     FROM payments p
     JOIN bookings b ON p.booking_id = b.id
     LEFT JOIN vehicles v ON b.vehicle_id = v.id
     WHERE p.booking_id = ? AND p.user_id = ?
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [bookingId, userId],
    (err, results) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      if (!results.length)
        return res
          .status(404)
          .json({ success: false, message: "Payment not found" });

      const p = results[0];
      if (p.vehicle_img && !p.vehicle_img.startsWith("http"))
        p.vehicle_img = `http://localhost:5000/uploads/vehicles/${p.vehicle_img}`;

      res.json({ success: true, data: p });
    },
  );
};
