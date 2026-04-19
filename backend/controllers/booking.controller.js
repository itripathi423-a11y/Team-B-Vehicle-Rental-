const db = require("../config/db");

// CREATE BOOKING
exports.createBooking = (req, res) => {
  const {
    vehicle_id,
    user_id,
    user_name,
    user_email,
    user_phone,
    pickup_location,
    rental_type, // '4h' | '8h' | '1d' | 'custom'
    pickup_datetime,
    drop_datetime,
    total_days,
    price_per_unit,
    total_price,
  } = req.body;

  // Basic validation
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
      total_days, price_per_unit, total_price
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
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
    ],
    (err, result) => {
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

      res.json({
        success: true,
        message: "Booking created successfully",
        booking_ref,
        booking_id: result.insertId,
      });
    },
  );
};

// GET ALL BOOKINGS FOR A USER
exports.getUserBookings = (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT b.*, v.name AS vehicle_name, v.thumbnail, v.body_type, v.fuel_type
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
    res.json({ success: true, data: results });
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
