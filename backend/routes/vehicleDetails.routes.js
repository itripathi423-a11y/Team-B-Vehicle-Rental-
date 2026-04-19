const express = require("express");
const router = express.Router();

const vehicleDetailsController = require("../controllers/vehicleDetails.controller");

// ✅ FIXED ROUTE
router.get("/:id", vehicleDetailsController.getVehicleDetails);

module.exports = router;
