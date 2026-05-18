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
// ─────────────────────────────────────────────────────────────────────────────
// Replace ONLY initiateEsewa + verifyEsewa in your payment.controller.js
// Keep everything else (initiatePayment, verifyPayment, getPaymentByBooking)
//
// Schema facts used here:
//   bookings.vehicle_id   → NOT NULL (use 1 as fallback for pkg-only bookings,
//                           or make vehicle_id nullable — see note below)
//   bookings              → no dropoff_location column
//   payments.booking_id   → NOT NULL (so payments row is inserted AFTER booking)
//   payments.pidx         → UNIQUE
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");

// Promisify db.query (add once at top of your file if not already there)
const queryAsync = (sql, params) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve([rows]))),
  );

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/payments/esewa/initiate

   Receives all booking details from the frontend.
   Saves them to pending_payments (NO booking row yet).
   Returns a signed eSewa form the browser will submit.
════════════════════════════════════════════════════════════════════════ */
exports.initiateEsewa = async (req, res) => {
  const userId = req.session?.user?.id;
  if (!userId)
    return res.status(401).json({ success: false, message: "Not logged in" });

  const {
    amount,
    vehicle_id,
    vehicle_name,
    rental_type,
    user_name,
    user_email,
    user_phone,
    pickup_location,
    dropoff_location, // frontend sends this; we store it in notes if needed
    pickup_datetime,
    drop_datetime,
    total_days,
    notes,
    pkg_id,
  } = req.body;

  // ── Validate required fields ────────────────────────────────────────
  if (!amount || !pickup_location || !pickup_datetime || !drop_datetime) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: amount, pickup_location, pickup_datetime, drop_datetime",
    });
  }

  const totalAmount = parseFloat(amount);
  if (isNaN(totalAmount) || totalAmount <= 0)
    return res.status(400).json({ success: false, message: "Invalid amount" });

  // ── Validate env vars early ─────────────────────────────────────────
  const product_code = process.env.ESEWA_PRODUCT_CODE;
  const secret_key = process.env.ESEWA_SECRET_KEY;
  const gateway_url = process.env.ESEWA_GATEWAY_URL;

  if (!product_code || !secret_key || !gateway_url) {
    console.error("eSewa env vars missing:", {
      product_code: !!product_code,
      secret_key: !!secret_key,
      gateway_url,
    });
    return res.status(500).json({
      success: false,
      message: "eSewa is not configured on the server. Check ESEWA_* env vars.",
    });
  }

  // ── Build transaction UUID (alphanumeric + hyphen only) ─────────────
  const transaction_uuid = `AD-${userId}-${Date.now()}`;
  const success_url = `${process.env.BACKEND_URL}/api/payments/esewa/verify`;
  const failure_url = `${process.env.FRONTEND_URL}/user.payment.html?error=esewa_failed`;

  // ── HMAC-SHA256 signature ───────────────────────────────────────────
  const message = `total_amount=${totalAmount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
  const signature = crypto
    .createHmac("sha256", secret_key)
    .update(message)
    .digest("base64");

  // ── Merge notes + dropoff into the notes field ──────────────────────
  // (bookings table has no dropoff_location column, so we embed it in notes)
  const fullNotes =
    [dropoff_location ? `Drop-off: ${dropoff_location}` : null, notes || null]
      .filter(Boolean)
      .join(" | ") || null;

  // ── Save to pending_payments ────────────────────────────────────────
  try {
    await queryAsync(
      `INSERT INTO pending_payments
         (transaction_uuid, user_id,
          vehicle_id, vehicle_name, rental_type,
          user_name, user_email, user_phone,
          pickup_location, pickup_datetime, drop_datetime,
          total_days, amount, notes, pkg_id,
          status, gateway, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'eSewa', NOW())`,
      [
        transaction_uuid,
        userId,
        vehicle_id ? parseInt(vehicle_id) : null,
        vehicle_name || null,
        rental_type || "4h",
        user_name,
        user_email,
        user_phone || null,
        pickup_location,
        pickup_datetime,
        drop_datetime,
        parseFloat(total_days) || 1.0,
        totalAmount,
        fullNotes,
        pkg_id ? parseInt(pkg_id) : null,
      ],
    );
  } catch (err) {
    console.error("pending_payment insert error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to store pending payment: " + err.message,
    });
  }

  // ── Return signed eSewa form ────────────────────────────────────────
  const form_html = `
    <form id="esewa-form" action="${gateway_url}" method="POST">
      <input type="hidden" name="amount"                    value="${totalAmount}"/>
      <input type="hidden" name="tax_amount"                value="0"/>
      <input type="hidden" name="total_amount"              value="${totalAmount}"/>
      <input type="hidden" name="transaction_uuid"          value="${transaction_uuid}"/>
      <input type="hidden" name="product_code"              value="${product_code}"/>
      <input type="hidden" name="product_service_charge"    value="0"/>
      <input type="hidden" name="product_delivery_charge"   value="0"/>
      <input type="hidden" name="success_url"               value="${success_url}"/>
      <input type="hidden" name="failure_url"               value="${failure_url}"/>
      <input type="hidden" name="signed_field_names"        value="total_amount,transaction_uuid,product_code"/>
      <input type="hidden" name="signature"                 value="${signature}"/>
    </form>`;

  return res.json({ success: true, form_html, transaction_uuid });
};

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/payments/esewa/verify
   eSewa redirects the browser here with ?data=<base64-encoded-json>

   Only here do we:
     1. Verify eSewa's HMAC signature
     2. CREATE the booking row (status='Pending', payment_status='Paid')
     3. Insert the payments row
     4. Mark pending_payment as completed
════════════════════════════════════════════════════════════════════════ */
exports.verifyEsewa = async (req, res) => {
  const FAIL_URL = `${process.env.FRONTEND_URL}/user.payment.html?error=payment_failed`;

  const { data } = req.query;
  if (!data) return res.redirect(FAIL_URL + "&reason=no_data");

  // ── Decode base64 JSON from eSewa ───────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
  } catch {
    return res.redirect(FAIL_URL + "&reason=decode_failed");
  }

  const {
    transaction_uuid,
    total_amount,
    status,
    signature,
    signed_field_names,
  } = payload;

  // ── Must be COMPLETE ────────────────────────────────────────────────
  if (status !== "COMPLETE")
    return res.redirect(`${FAIL_URL}&status=${status}`);

  // ── Verify HMAC signature ───────────────────────────────────────────
  const fields = (signed_field_names || "").split(",");
  const message = fields.map((f) => `${f}=${payload[f]}`).join(",");
  const expected = crypto
    .createHmac("sha256", process.env.ESEWA_SECRET_KEY)
    .update(message)
    .digest("base64");

  if (signature !== expected)
    return res.redirect(`${FAIL_URL}&reason=invalid_signature`);

  // ── Look up pending payment ─────────────────────────────────────────
  let pending;
  try {
    const [rows] = await queryAsync(
      "SELECT * FROM pending_payments WHERE transaction_uuid = ?",
      [transaction_uuid],
    );
    pending = rows?.[0];
  } catch (err) {
    console.error("pending_payment lookup error:", err.message);
    return res.redirect(FAIL_URL + "&reason=db_error");
  }

  if (!pending) return res.redirect(FAIL_URL + "&reason=pending_not_found");

  // ── Prevent double-processing ───────────────────────────────────────
  if (pending.status === "completed") {
    const [bRows] = await queryAsync(
      "SELECT booking_ref FROM bookings WHERE id = ?",
      [pending.booking_id],
    ).catch(() => [[]]);
    const ref = bRows?.[0]?.booking_ref || "ALREADY_PAID";
    return res.redirect(
      `${process.env.FRONTEND_URL}/payment-success-esewa.html?ref=${ref}&amount=${pending.amount}`,
    );
  }

  const txnAmount = parseFloat(total_amount);

  // ── Generate booking reference ──────────────────────────────────────
  const booking_ref = "AD" + Date.now() + Math.floor(Math.random() * 1000);

  // ── Resolve vehicle_id ──────────────────────────────────────────────
  // bookings.vehicle_id is NOT NULL in your schema.
  // If this is a tour-package booking with no vehicle, use the package's
  // vehicle_id from tour_packages, or fall back to 1 (placeholder).
  // Better long-term fix: ALTER TABLE bookings MODIFY vehicle_id INT UNSIGNED NULL;
  let vehicleId = pending.vehicle_id ? parseInt(pending.vehicle_id) : null;

  if (!vehicleId && pending.pkg_id) {
    try {
      const [pkgRows] = await queryAsync(
        "SELECT vehicle_id FROM tour_packages WHERE id = ?",
        [parseInt(pending.pkg_id)],
      );
      vehicleId = pkgRows?.[0]?.vehicle_id || null;
    } catch (e) {
      console.warn("tour_packages lookup error:", e.message);
    }
  }

  // If still null, we must handle it — your schema requires NOT NULL.
  // Option A: make vehicle_id nullable (recommended):
  //   ALTER TABLE bookings MODIFY vehicle_id INT UNSIGNED NULL;
  // Option B: use a placeholder vehicle ID of 1 (temporary workaround):
  if (!vehicleId) {
    console.warn(
      "No vehicle_id found for pending payment",
      transaction_uuid,
      "— using fallback vehicle_id=1. Run: ALTER TABLE bookings MODIFY vehicle_id INT UNSIGNED NULL;",
    );
    vehicleId = 1; // fallback — replace with NULL after running the ALTER above
  }

  // ── CREATE THE BOOKING ──────────────────────────────────────────────
  // Note: bookings table has no dropoff_location column.
  // Drop-off info was stored in pending_payments.notes as "Drop-off: ..."
  let bookingId;
  try {
    const [result] = await queryAsync(
      `INSERT INTO bookings
         (booking_ref,
          user_id, vehicle_id,
          user_name, user_email, user_phone,
          pickup_location,
          rental_type, pickup_datetime, drop_datetime,
          total_days, price_per_unit, total_price,
          status, payment_status, payment_method,
          transaction_id, pidx, paid_at,
          notes,
          created_at, updated_at)
       VALUES
         (?,
          ?, ?,
          ?, ?, ?,
          ?,
          ?, ?, ?,
          ?, ?, ?,
          'Pending', 'Paid', 'eSewa',
          ?, ?, NOW(),
          ?,
          NOW(), NOW())`,
      [
        booking_ref,
        pending.user_id,
        vehicleId,
        pending.user_name,
        pending.user_email,
        pending.user_phone || "0000000000",
        pending.pickup_location,
        pending.rental_type || "4h",
        pending.pickup_datetime,
        pending.drop_datetime,
        pending.total_days || 1.0,
        txnAmount, // price_per_unit
        txnAmount, // total_price
        transaction_uuid, // transaction_id
        transaction_uuid, // pidx
        pending.notes || null,
      ],
    );
    bookingId = result.insertId;
  } catch (err) {
    console.error("Booking creation error:", err.message);
    // Mark pending as failed so it doesn't loop
    await queryAsync(
      "UPDATE pending_payments SET status = 'failed' WHERE transaction_uuid = ?",
      [transaction_uuid],
    ).catch(() => {});
    return res.redirect(FAIL_URL + "&reason=booking_creation_failed");
  }

  // ── Insert payments row (now booking exists) ────────────────────────
  try {
    await queryAsync(
      `INSERT INTO payments
         (booking_id, user_id, gateway, pidx, transaction_id, amount, status, created_at)
       VALUES (?, ?, 'eSewa', ?, ?, ?, 'Completed', NOW())`,
      [
        bookingId,
        pending.user_id,
        transaction_uuid,
        transaction_uuid,
        txnAmount,
      ],
    );
  } catch (err) {
    // pidx UNIQUE constraint — may already exist if eSewa double-called; non-fatal
    console.warn("Payment row insert warning:", err.message);
  }

  // ── Mark pending_payment as completed ──────────────────────────────
  await queryAsync(
    "UPDATE pending_payments SET status = 'completed', booking_id = ? WHERE transaction_uuid = ?",
    [bookingId, transaction_uuid],
  ).catch((e) => console.warn("pending_payment update error:", e.message));

  // ── Notify user ────────────────────────────────────────────────────
  try {
    await createNotification({
      user_id: pending.user_id,
      booking_id: bookingId,
      title: "Booking Confirmed 🎉",
      message: `Your eSewa payment of Rs ${txnAmount.toLocaleString("en-NP")} is confirmed. Booking ${booking_ref} is now active!`,
      type: "booking",
      target_role: "user",
    });
  } catch (e) {
    console.warn("Notify user error:", e.message);
  }

  // ── Notify admin ───────────────────────────────────────────────────
  try {
    await createAdminNotification({
      title: "New Booking & Payment 💳",
      message: `${pending.user_name} paid Rs ${txnAmount.toLocaleString("en-NP")} via eSewa. Booking ${booking_ref} created.`,
      type: "booking",
      ref_id: bookingId,
      ref_type: "booking",
      meta: {
        booking_ref,
        amount: txnAmount,
        transaction_id: transaction_uuid,
        payment_method: "eSewa",
        user_name: pending.user_name,
        user_email: pending.user_email,
        vehicle_name: pending.vehicle_name || "—",
        pickup_location: pending.pickup_location,
      },
    });
  } catch (e) {
    console.warn("Admin notify error:", e.message);
  }

  // ── Email user ─────────────────────────────────────────────────────
  try {
    await transporter.sendMail({
      from: `"Auto Dealer" <${process.env.EMAIL_USER}>`,
      to: pending.user_email,
      subject: `Booking Confirmed — ${booking_ref}`,
      html: emailWrapper(`
        ${emailHeader("eSewa Payment Confirmed")}
        <tr><td style="padding:32px;">
          <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#111827;">Hi ${pending.user_name},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Your eSewa payment has been verified and your booking is now confirmed.
          </p>
          <div style="background:#f4f5f7;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${infoRow("Booking Ref", `<b style="font-family:monospace;">${booking_ref}</b>`)}
              ${infoRow("Vehicle", pending.vehicle_name || "—")}
              ${infoRow("Pickup", pending.pickup_location)}
              ${infoRow("Pickup Date", new Date(pending.pickup_datetime).toLocaleString("en-NP"))}
              ${infoRow("Drop Date", new Date(pending.drop_datetime).toLocaleString("en-NP"))}
              ${infoRow("Amount Paid", `<b style="color:#007B5E;">Rs ${txnAmount.toLocaleString("en-NP")}</b>`)}
              ${infoRow("Payment", "eSewa ✓")}
              ${infoRow("Transaction ID", `<span style="font-family:monospace;font-size:12px;">${transaction_uuid}</span>`)}
              ${infoRow("Status", '<span style="color:#16a34a;font-weight:600;">Confirmed ✓</span>')}
            </table>
          </div>
        </td></tr>
        ${emailFooter()}
      `),
    });
  } catch (e) {
    console.error("Email error:", e.message);
  }

  // ── Redirect to success page ───────────────────────────────────────
  return res.redirect(
    `${process.env.FRONTEND_URL}/payment-success-esewa.html` +
      `?ref=${booking_ref}&txn=${transaction_uuid}&amount=${txnAmount}`,
  );
};
