const db = require("../config/db");

// GET SINGLE VEHICLE DETAILS
exports.getVehicleDetails = (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT *
    FROM vehicles
    WHERE id = ? AND is_deleted = 0
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Database error",
        error: err,
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: "Vehicle not found",
      });
    }

    const v = result[0];

    const baseUrl = "http://localhost:5000/uploads/vehicles/";

    // -----------------------------
    // IMAGES FIX
    // -----------------------------
    const images = [
      v.thumbnail,
      v.image_1,
      v.image_2,
      v.image_3,
      v.image_4,
      v.image_5,
    ]
      .filter(Boolean)
      .map((img) => img.split("/").pop())
      .map((img) => baseUrl + img);

    // -----------------------------
    // FEATURES FIX (IMPORTANT)
    // -----------------------------
    let features = [];

    if (v.features && typeof v.features === "string") {
      try {
        const parsed = JSON.parse(v.features);
        features = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        features = [];
      }
    } else if (Array.isArray(v.features)) {
      features = v.features;
    }

    // -----------------------------
    // FINAL RESPONSE
    // -----------------------------
    res.json({
      id: v.id,
      name: v.name,
      brand: v.brand,
      model: v.model,
      year: v.year,
      license_plate: v.license_plate,

      body_type: v.body_type,
      fuel_type: v.fuel_type,
      transmission: v.transmission,
      seats: v.seating_capacity,

      color: v.color,

      price_4h: v.price_4h,
      price_8h: v.price_8h,
      price_1d: v.price_1d,

      status: v.status,
      description: v.description,

      features, // ✅ FIXED
      images, // ✅ FIXED
    });
  });
};

// GET VEHICLE REVIEWS WITH AVERAGE RATING
exports.getVehicleReviews = (req, res) => {
  const vehicleId = req.params.id;

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
    ORDER BY r.created_at DESC
  `;

  db.query(sql, [vehicleId], (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });

    const total = results.length;
    const avg =
      total > 0
        ? (results.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
        : null;

    res.json({
      average_rating: avg ? parseFloat(avg) : null,
      total_reviews: total,
      reviews: results,
    });
  });
};
