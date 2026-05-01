const express = require("express");
const router = express.Router();
const db = require("../config/db");
const vehicleDetailsController = require("../controllers/vehicleDetails.controller");

// ✅ ADD THIS — must be BEFORE /:id
router.get("/:id/reviews", vehicleDetailsController.getVehicleReviews);

// GET all available vehicles
router.get("/", (req, res) => {
  const sql =
    "SELECT * FROM vehicles WHERE is_deleted = 0 AND status = 'Available'";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, data: results });
  });
});

// GET single vehicle by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM vehicles WHERE id = ? AND is_deleted = 0 LIMIT 1";
  db.query(sql, [id], (err, results) => {
    if (err)
      return res.status(500).json({ success: false, message: "DB error" });
    if (results.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    res.json({ success: true, data: results[0] });
  });
});

module.exports = router;
