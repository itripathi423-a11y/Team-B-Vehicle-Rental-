// admin.review.controller.js
const db = require("../config/db");

// ───────── GET ALL REVIEWS ─────────
exports.getAllReviews = (req, res) => {
  const sql = `
    SELECT
      r.id,
      r.booking_id,
      r.user_id,
      r.vehicle_id,
      r.rating,
      r.comment,
      r.created_at,

      u.name        AS user_name,
      u.email,

      v.name        AS vehicle_name,
      v.body_type   AS vehicle_type,
      v.thumbnail   AS vehicle_img,

      b.booking_ref,
      b.pickup_datetime,
      b.drop_datetime
    FROM reviews r
    LEFT JOIN users    u ON r.user_id    = u.id
    LEFT JOIN vehicles v ON r.vehicle_id = v.id
    LEFT JOIN bookings b ON r.booking_id = b.id
    ORDER BY r.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllReviews error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    const BASE = "http://localhost:5000";

    const formatted = results.map((r) => {
      const toDate = (val) => {
        if (!val) return "—";
        const d = val instanceof Date ? val : new Date(val);
        return d.toISOString().split("T")[0];
      };

      return {
        id: r.id,
        booking_id: r.booking_id,
        booking_ref: r.booking_ref || `#${r.booking_id}`,
        user_id: r.user_id,
        user_name: r.user_name || "Unknown",
        email: r.email || "",
        vehicle_id: r.vehicle_id,
        vehicle_name: r.vehicle_name || "—",
        vehicle_type: r.vehicle_type || "—",
        vehicle_img: r.vehicle_img
          ? `${BASE}/uploads/vehicles/${r.vehicle_img.replace(/^\/+/, "")}`
          : null,
        rating: Number(r.rating || 0),
        comment: r.comment || null,
        start_date: toDate(r.pickup_datetime),
        end_date: toDate(r.drop_datetime),
        created_at: r.created_at,
      };
    });

    res.json({ success: true, data: formatted });
  });
};

// ───────── GET SINGLE REVIEW ─────────
exports.getReviewById = (req, res) => {
  const sql = `
    SELECT
      r.*,
      u.name  AS user_name,
      u.email,
      v.name  AS vehicle_name,
      b.booking_ref
    FROM reviews r
    LEFT JOIN users    u ON r.user_id    = u.id
    LEFT JOIN vehicles v ON r.vehicle_id = v.id
    LEFT JOIN bookings b ON r.booking_id = b.id
    WHERE r.id = ?
  `;

  db.query(sql, [req.params.id], (err, result) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    if (!result.length)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    res.json({ success: true, data: result[0] });
  });
};

// ───────── GET REVIEWS BY VEHICLE ─────────
exports.getReviewsByVehicle = (req, res) => {
  const sql = `
    SELECT
      r.id, r.rating, r.comment, r.created_at,
      u.name AS user_name
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.vehicle_id = ?
    ORDER BY r.created_at DESC
  `;

  db.query(sql, [req.params.vehicleId], (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: results });
  });
};

// ───────── GET STATS (avg rating, count per star) ─────────
exports.getReviewStats = (req, res) => {
  const sql = `
    SELECT
      COUNT(*)                          AS total,
      ROUND(AVG(rating), 2)             AS average,
      SUM(rating = 5)                   AS five_star,
      SUM(rating = 4)                   AS four_star,
      SUM(rating = 3)                   AS three_star,
      SUM(rating = 2)                   AS two_star,
      SUM(rating = 1)                   AS one_star
    FROM reviews
  `;

  db.query(sql, (err, result) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: result[0] });
  });
};

// ───────── DELETE REVIEW (admin only) ─────────
exports.deleteReview = (req, res) => {
  const sql = `DELETE FROM reviews WHERE id = ?`;

  db.query(sql, [req.params.id], (err, result) => {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Review not found" });
    res.json({ success: true, message: "Review deleted successfully" });
  });
};
