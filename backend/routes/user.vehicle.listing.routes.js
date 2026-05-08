const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET ALL VEHICLES FOR USER LISTING PAGE
router.get("/", (req, res) => {
  const sql = `
    SELECT 
      id, name, brand, model, year,
      body_type, fuel_type, transmission,
      seating_capacity,
      price_4h, price_8h, price_1d,
      status, thumbnail, image_1, image_2, image_3,
      description, features,
      destination_id
    FROM vehicles
    WHERE is_deleted = 0 AND status = 'Available'
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Vehicle Fetch Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const formatted = results.map((v) => ({
      ...v,
      images: [v.thumbnail, v.image_1, v.image_2, v.image_3].filter(Boolean),
    }));

    res.json(formatted);
  });
});

module.exports = router;
