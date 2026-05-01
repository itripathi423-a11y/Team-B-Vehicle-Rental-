const db = require("../config/db");
const transporter = require("../utils/mailer");

const ADMIN_EMAIL = "admin@gmail.com"; // change this

// CREATE BOOKING
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
    notes, // ← new field (optional)
  } = req.body;

  // Validation
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
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  const booking_ref = "AD" + Date.now();

  const sql = `
    INSERT INTO bookings (
      booking_ref, user_id, vehicle_id,
      user_name, user_email, user_phone,
      pickup_location, rental_type,
      pickup_datetime, drop_datetime,
      total_days, price_per_unit, total_price,
      notes
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
      notes || null, // ← inserted here
    ],
    async (err, result) => {
      if (err) {
        console.error("Booking insert error:", err);
        return res.status(500).json({
          success: false,
          message: "Booking failed",
          error: err.message,
        });
      }

      // ----------------------------------
      // SEND EMAIL AFTER SUCCESS
      // ----------------------------------
      try {
        const mailOptions = {
          from: `"Auto Dealer System" <${process.env.EMAIL_USER}>`,
          to: ADMIN_EMAIL,
          subject: "New Booking Received",

          text: `
NEW BOOKING ALERT 🚗

A new booking has been confirmed in the system.

-----------------------------------
Booking Details:
-----------------------------------
Booking Ref : ${booking_ref}
Customer    : ${user_name}
Email       : ${user_email}
Phone       : ${user_phone}

Vehicle ID  : ${vehicle_id}
Pickup      : ${pickup_location}

From        : ${pickup_datetime}
To          : ${drop_datetime}

Total Price : Rs ${total_price}
Notes       : ${notes || "None"}

-----------------------------------
Please check admin dashboard for details.
-----------------------------------

Auto Dealer System
  `,
        };

        await transporter.sendMail(mailOptions);
      } catch (emailErr) {
        console.error("Email error:", emailErr);
        // Do NOT fail booking if email fails
      }

      return res.json({
        success: true,
        message: "Booking created successfully and admin notified",
        booking_ref,
        booking_id: result.insertId,
      });
    },
  );
};

// GET ALL BOOKINGS FOR A USER
// GET ALL BOOKINGS FOR A USER
exports.getUserBookings = (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT 
      b.*,
      b.id AS booking_id,
      v.name AS vehicle_name, 
      v.thumbnail, 
      v.body_type, 
      v.fuel_type,
      v.license_plate
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
    res.json({ success: true, bookings: results }); // ← change "data" to "bookings"
  });
};

// GET ALL BOOKINGS (ADMIN)
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
