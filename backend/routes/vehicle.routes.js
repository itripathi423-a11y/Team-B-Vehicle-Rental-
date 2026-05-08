const express = require("express");
const router = express.Router();
const db = require("../config/db");
const vehicleDetailsController = require("../controllers/vehicleDetails.controller");

// must be BEFORE /:id
router.get("/:id/reviews", vehicleDetailsController.getVehicleReviews);

// GET all available vehicles
router.get("/", (req, res) => {
  const { fuel_type, body_type, transmission, destination_id } = req.query;

  let sql = `
    SELECT id, name, brand, model, year, body_type, fuel_type,
           transmission, seating_capacity,
           price_4h, price_8h, price_1d,
           thumbnail, image_1, status,
           destination_id
    FROM vehicles
    WHERE is_deleted = 0 AND status = 'Available'
  `;

  const params = [];

  if (fuel_type) {
    sql += ` AND fuel_type = ?`;
    params.push(fuel_type);
  }
  if (body_type) {
    sql += ` AND body_type = ?`;
    params.push(body_type);
  }
  if (transmission) {
    sql += ` AND transmission = ?`;
    params.push(transmission);
  }
  if (destination_id) {
    sql += ` AND destination_id = ?`;
    params.push(destination_id);
  }

  sql += ` ORDER BY id DESC`;

  db.query(sql, params, (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: "DB error" });
    res.json({ success: true, data: results });
  });
});

// GET single vehicle by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT id, name, brand, model, year, body_type, fuel_type,
           transmission, seating_capacity,
           price_4h, price_8h, price_1d,
           thumbnail, image_1, image_2, image_3, image_4, image_5,
           description, features, status, destination_id
    FROM vehicles
    WHERE id = ? AND is_deleted = 0
    LIMIT 1
  `;
  db.query(sql, [id], (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: "DB error" });
    if (results.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });

    const vehicle = results[0];
    if (vehicle.features && typeof vehicle.features === "string") {
      try {
        vehicle.features = JSON.parse(vehicle.features);
      } catch (_) {}
    }

    res.json({ success: true, data: vehicle });
  });
});

module.exports = router;
