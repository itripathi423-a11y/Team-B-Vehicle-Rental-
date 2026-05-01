// ===============================================
// controllers/reviewController.js
// ===============================================

const db = require("../config/db");

// =======================================================
// 1. FETCH REVIEW DATA FOR FORM
// =======================================================
exports.getReviewForm = (req, res) => {
  const bookingId = req.params.bookingId; // ← matches :bookingId in route

  const sql = `
    SELECT 
      b.id        AS booking_id,
      b.user_id,
      b.vehicle_id,
      b.status,
      v.name      AS vehicle_name,
      v.brand,
      v.model,
      v.thumbnail,
      v.body_type
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.id = ?
  `;

  db.query(sql, [bookingId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });

    if (!result.length)
      return res.status(404).json({ message: "Booking not found" });

    // Only allow review for completed bookings
    if (result[0].status !== "Completed") {
      return res.status(403).json({
        message: "Only completed bookings can be reviewed",
      });
    }

    res.json(result[0]);
  });
};

// =======================================================
// 2. SUBMIT REVIEW
// =======================================================
exports.submitReview = (req, res) => {
  const { booking_id, user_id, vehicle_id, rating, comment } = req.body;

  if (!booking_id || !user_id || !vehicle_id || !rating) {
    return res.status(400).json({ message: "All required fields missing" });
  }

  const sql = `
    INSERT INTO reviews
      (booking_id, user_id, vehicle_id, rating, comment)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [booking_id, user_id, vehicle_id, rating, comment || null],
    (err) => {
      if (err) {
        // Handle duplicate review (unique constraint on booking_id)
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({
            message: "You have already reviewed this booking.",
          });
        }
        return res.status(500).json({ message: "DB error", error: err });
      }

      res.json({
        success: true,
        message: "Review submitted successfully",
      });
    },
  );
};

// =======================================================
// 3. GET REVIEWS OF VEHICLE
// =======================================================
exports.getVehicleReviews = (req, res) => {
  const vehicleId = req.params.vehicleId;

  const sql = `
    SELECT 
      r.id,
      r.rating,
      r.comment,
      r.created_at,
      u.name AS reviewer_name
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.vehicle_id = ?
    ORDER BY r.id DESC
  `;

  db.query(sql, [vehicleId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json(result);
  });
};
