const db = require("../config/db");
const transporter = require("../utils/mailer");

const ADMIN_EMAIL = "admin@gmail.com";

exports.getMyBookings = (req, res) => {
  const userId = req.session.user.id;

  const sql = `
    SELECT
      b.id,
      b.booking_ref,
      b.rental_type,
      b.pickup_datetime,
      b.drop_datetime,
      b.pickup_location,
      b.user_phone,
      b.total_days,
      b.total_price,
      b.status,
      b.payment_status,
      b.payment_method,
      b.cancel_reason,
      b.notes,
      b.created_at,

      v.name AS vehicle_name,
      v.brand AS vehicle_brand,
      v.license_plate,
      v.body_type,
      v.thumbnail AS vehicle_thumbnail,
      v.fuel_type,
      v.transmission

    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch bookings",
      });
    }

    res.json({
      success: true,
      bookings: rows,
    });
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

// CANCEL BOOKING + SEND EMAIL
exports.deleteBooking = (req, res) => {
  const userId = req.session.user.id;
  const bookingId = req.params.id;
  const { cancel_reason } = req.body;

  db.query(
    `
    SELECT 
      b.id,
      b.booking_ref,
      b.status,
      b.vehicle_id,
      b.user_name,
      b.user_email,
      b.user_phone,
      b.pickup_location,
      b.pickup_datetime,
      b.drop_datetime,
      b.total_price,
      v.name AS vehicle_name
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.id = ? AND b.user_id = ?
    `,
    [bookingId, userId],
    async (err, rows) => {
      if (err) {
        console.error("deleteBooking fetch error:", err);
        return res.status(500).json({
          success: false,
          message: "Server error.",
        });
      }

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: "Booking not found.",
        });
      }

      const booking = rows[0];

      if (!["Pending", "Confirmed"].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot cancel booking with status: ${booking.status}`,
        });
      }

      // UPDATE BOOKING STATUS
      db.query(
        `
        UPDATE bookings 
        SET status = 'Cancelled', cancel_reason = ?
        WHERE id = ?
        `,
        [cancel_reason || null, bookingId],
        async (err2) => {
          if (err2) {
            console.error("cancel error:", err2);
            return res.status(500).json({
              success: false,
              message: "Failed to cancel booking.",
            });
          }

          // MAKE VEHICLE AVAILABLE AGAIN
          db.query(
            "UPDATE vehicles SET status = 'Available' WHERE id = ?",
            [booking.vehicle_id],
            async (err3) => {
              if (err3) console.error("vehicle reset error:", err3);

              // SEND EMAIL TO ADMIN
              try {
                await transporter.sendMail({
                  from: `"Auto Dealer System" <${process.env.EMAIL_USER}>`,
                  to: ADMIN_EMAIL,
                  subject: "Booking Cancelled",

                  text: `
BOOKING CANCELLED ❌

A user has cancelled a booking.

-----------------------------------
Booking Ref : ${booking.booking_ref}
Customer    : ${booking.user_name}
Email       : ${booking.user_email}
Phone       : ${booking.user_phone}

Vehicle     : ${booking.vehicle_name}
Pickup      : ${booking.pickup_location}

From        : ${booking.pickup_datetime}
To          : ${booking.drop_datetime}

Amount      : Rs ${booking.total_price}

Reason      : ${cancel_reason || "Not provided"}
-----------------------------------

Please review in admin dashboard.
Auto Dealer System
                  `,
                });
              } catch (mailErr) {
                console.error("Cancel email error:", mailErr);
              }

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
