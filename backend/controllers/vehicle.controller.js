//For Booking user get the vehicles and details of the vehicle
const db = require("../config/db");

// GET ALL AVAILABLE VEHICLES
exports.getVehicles = (req, res) => {
  const sql = `
    SELECT id, name, brand, model, year, body_type, fuel_type,
           transmission, seating_capacity,
           price_4h, price_8h, price_1d,
           thumbnail, image_1, status
    FROM vehicles
    WHERE is_deleted = 0 AND status = 'Available'
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "DB error" });
    }
    res.json({ success: true, data: results });
  });
};

// GET SINGLE VEHICLE BY ID
exports.getVehicleById = (req, res) => {
  const id = req.params.id;

  const sql = `
    SELECT id, name, brand, model, year, body_type, fuel_type,
           transmission, seating_capacity,
           price_4h, price_8h, price_1d,
           thumbnail, image_1, image_2, image_3, image_4, image_5,
           description, features, status
    FROM vehicles
    WHERE id = ? AND is_deleted = 0
    LIMIT 1
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "DB error" });
    }

    if (!result.length) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }

    // Parse features JSON if present
    const vehicle = result[0];
    if (vehicle.features && typeof vehicle.features === "string") {
      try {
        vehicle.features = JSON.parse(vehicle.features);
      } catch (_) {}
    }

    res.json({ success: true, data: vehicle });
  });
};
