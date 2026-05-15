// controllers/reviewController.js

const db = require("../config/db");
const { createAdminNotification } = require("./admin.notification.controller");

// FETCH REVIEW DATA FOR FORM
exports.getReviewForm = (req, res) => {
  const bookingId = req.params.bookingId;

  const sql = `
    SELECT 
      b.id AS booking_id, b.user_id, b.vehicle_id, b.status,
      v.name AS vehicle_name, v.brand, v.model, v.thumbnail, v.body_type,
      r.id AS existing_review_id
    FROM bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    LEFT JOIN reviews r ON r.booking_id = b.id
    WHERE b.id = ?
  `;

  db.query(sql, [bookingId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (!result.length)
      return res.status(404).json({ message: "Booking not found" });
    if (result[0].status !== "Completed")
      return res
        .status(403)
        .json({ message: "Only completed bookings can be reviewed" });

    // Block if already reviewed
    if (result[0].existing_review_id) {
      return res.status(409).json({ message: "Already reviewed" });
    }

    res.json(result[0]);
  });
};

// 2. SUBMIT REVIEW

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
    async (err, result) => {
      if (err) {
        // Handle duplicate review (unique constraint on booking_id)
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ message: "You have already reviewed this booking." });
        }
        return res.status(500).json({ message: "DB error", error: err });
      }

      const reviewId = result.insertId;

      // ── Fetch user + vehicle names for admin notification ──────────
      db.query(
        `SELECT u.name AS user_name, v.name AS vehicle_name
         FROM users u, vehicles v
         WHERE u.id = ? AND v.id = ?`,
        [user_id, vehicle_id],
        async (err2, infoRows) => {
          const userName = infoRows?.[0]?.user_name || "A user";
          const vehicleName = infoRows?.[0]?.vehicle_name || "a vehicle";
          const ratingNum = Number(rating);
          const stars = "★".repeat(ratingNum) + "☆".repeat(5 - ratingNum);
          const commentPreview = comment
            ? ` "${String(comment).trim().slice(0, 80)}${String(comment).trim().length > 80 ? "…" : ""}"`
            : "";

          // ── Notify ADMIN via admin_notifications table + socket ──────
          try {
            await createAdminNotification({
              title: `New Review ${stars}`,
              message: `${userName} left a ${ratingNum}-star review for ${vehicleName}.${commentPreview}`,
              type: "review",
              ref_id: reviewId,
              ref_type: "review",
              meta: {
                review_id: reviewId,
                booking_id: Number(booking_id),
                user_id: Number(user_id),
                user_name: userName,
                vehicle_id: Number(vehicle_id),
                vehicle_name: vehicleName,
                rating: ratingNum,
                comment: comment || null,
              },
            });
            console.log(
              "✅ Review admin notification sent, reviewId:",
              reviewId,
            );
          } catch (e) {
            console.warn("[submitReview] Admin notification error:", e.message);
          }

          res.json({ success: true, message: "Review submitted successfully" });
        },
      );
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
// GET /api/user/reviews  — all reviews submitted by the logged-in user
// controllers/reviewController.js — add this

exports.getUserReviews = (req, res) => {
  const userId = req.params.userId;

  const sql = `
    SELECT 
      r.id, r.booking_id, r.vehicle_id, r.rating, r.comment, r.created_at,
      v.name AS vehicle_name, v.brand, v.model, v.thumbnail, v.body_type
    FROM reviews r
    JOIN vehicles v ON v.id = r.vehicle_id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json({ success: true, reviews: rows });
  });
};
