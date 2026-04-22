const db = require("../config/db");

exports.getMyBookings = (req, res) => {
  const userId = req.session.user.id;
  const sql = `
    SELECT
      b.id, b.booking_ref, b.rental_type,
      b.pickup_datetime, b.drop_datetime,
      b.total_days, b.total_price, b.status,
      b.payment_status, b.payment_method,
      b.cancel_reason, b.notes, b.created_at,
      v.name AS vehicle_name, v.brand AS vehicle_brand,
      v.license_plate, v.body_type, v.thumbnail AS vehicle_thumbnail
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `;
  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("getMyBookings error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch bookings." });
    }
    const summary = {
      total: rows.length,
      confirmed: rows.filter((r) => r.status === "Confirmed").length,
      pending: rows.filter((r) => r.status === "Pending").length,
      active: rows.filter((r) => r.status === "Active").length,
      completed: rows.filter((r) => r.status === "Completed").length,
      cancelled: rows.filter((r) => r.status === "Cancelled").length,
    };
    return res.json({ success: true, summary, bookings: rows });
  });
};

exports.updateBooking = (req, res) => {
  const userId = req.session.user.id;
  const bookingId = req.params.id;
  const {
    pickup_location,
    rental_type,
    pickup_datetime,
    drop_datetime,
    notes,
  } = req.body;
  db.query(
    "SELECT id, status FROM bookings WHERE id = ? AND user_id = ?",
    [bookingId, userId],
    (err, rows) => {
      if (err)
        return res
          .status(500)
          .json({ success: false, message: "Server error." });
      if (!rows.length)
        return res
          .status(404)
          .json({ success: false, message: "Booking not found." });
      if (rows[0].status !== "Pending")
        return res.status(400).json({
          success: false,
          message: `Only Pending bookings can be edited. Current status: ${rows[0].status}`,
        });
      const fields = [],
        values = [];
      if (pickup_location !== undefined) {
        fields.push("pickup_location = ?");
        values.push(pickup_location);
      }
      if (rental_type !== undefined) {
        fields.push("rental_type = ?");
        values.push(rental_type);
      }
      if (pickup_datetime !== undefined) {
        fields.push("pickup_datetime = ?");
        values.push(pickup_datetime);
      }
      if (drop_datetime !== undefined) {
        fields.push("drop_datetime = ?");
        values.push(drop_datetime);
      }
      if (notes !== undefined) {
        fields.push("notes = ?");
        values.push(notes);
      }
      if (!fields.length)
        return res
          .status(400)
          .json({ success: false, message: "No valid fields to update." });
      if (pickup_datetime && drop_datetime) {
        const p = new Date(pickup_datetime),
          d = new Date(drop_datetime);
        if (d <= p)
          return res.status(400).json({
            success: false,
            message: "Drop datetime must be after pickup datetime.",
          });
        fields.push("total_days = ?");
        values.push(parseFloat(((d - p) / (1000 * 60 * 60 * 24)).toFixed(2)));
      }
      values.push(bookingId);
      db.query(
        `UPDATE bookings SET ${fields.join(", ")} WHERE id = ?`,
        values,
        (err2) => {
          if (err2) {
            console.error("updateBooking error:", err2);
            return res
              .status(500)
              .json({ success: false, message: "Failed to update booking." });
          }
          return res.json({
            success: true,
            message: "Booking updated successfully.",
          });
        },
      );
    },
  );
};

exports.deleteBooking = (req, res) => {
  const userId = req.session.user.id;
  const bookingId = req.params.id;
  const { cancel_reason } = req.body;
  db.query(
    "SELECT id, status, vehicle_id FROM bookings WHERE id = ? AND user_id = ?",
    [bookingId, userId],
    (err, rows) => {
      if (err) {
        console.error("deleteBooking fetch error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Server error." });
      }
      if (!rows.length)
        return res
          .status(404)
          .json({ success: false, message: "Booking not found." });
      const booking = rows[0];
      if (!["Pending", "Confirmed"].includes(booking.status))
        return res.status(400).json({
          success: false,
          message: `Cannot cancel a booking with status: ${booking.status}`,
        });
      db.query(
        "UPDATE bookings SET status = 'Cancelled', cancel_reason = ? WHERE id = ?",
        [cancel_reason || null, bookingId],
        (err2) => {
          if (err2) {
            console.error("deleteBooking cancel error:", err2);
            return res
              .status(500)
              .json({ success: false, message: "Failed to cancel booking." });
          }
          db.query(
            "UPDATE vehicles SET status = 'Available' WHERE id = ?",
            [booking.vehicle_id],
            (err3) => {
              if (err3) console.error("vehicle reset error:", err3);
              return res.json({
                success: true,
                message: "Booking cancelled successfully.",
              });
            },
          );
        },
      );
    },
  );
};
