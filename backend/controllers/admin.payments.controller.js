const db = require("../config/db");

/* ═══════════════════════════════════════════════════════════════
   GET /api/admin/payments
   Returns all bookings with payment info (joined with users + vehicles)
════════════════════════════════════════════════════════════════ */
exports.getPayments = (req, res) => {
  const sql = `
    SELECT
      b.id,
      b.booking_ref,
      b.user_name,
      b.user_email,
      v.name            AS vehicle_name,
      b.total_price,
      b.status,
      b.payment_status,
      b.payment_method,
      b.transaction_id,
      b.paid_at,
      b.created_at
    FROM bookings b
    LEFT JOIN vehicles v ON b.vehicle_id = v.id
    ORDER BY b.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });

    res.json({ success: true, data: rows });
  });
};

/* ═══════════════════════════════════════════════════════════════
   PUT /api/admin/payments/:id/mark-paid
   Updates payment_status to 'Paid' and sets paid_at timestamp
════════════════════════════════════════════════════════════════ */
exports.markPaid = (req, res) => {
  const { id } = req.params;

  db.query(
    `UPDATE bookings
     SET payment_status = 'Paid', paid_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [id],
    (err, result) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });

      if (result.affectedRows === 0)
        return res
          .status(404)
          .json({ success: false, message: `Booking #${id} not found` });

      res.json({ success: true, message: "Payment marked as Paid" });
    },
  );
};
