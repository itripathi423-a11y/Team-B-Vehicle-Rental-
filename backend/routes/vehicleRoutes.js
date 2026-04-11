const express = require("express");
const router = express.Router();

const { getVehicles } = require("../controllers/vehicleController");

// GET /api/vehicles
router.get("/", getVehicles);

module.exports = router;
