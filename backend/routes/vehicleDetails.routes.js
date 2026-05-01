const express = require("express");
const router = express.Router();

const vehicleDetailsController = require("../controllers/vehicleDetails.controller");

// ✅ specific route FIRST
router.get("/:id/reviews", vehicleDetailsController.getVehicleReviews);
router.get("/:id", vehicleDetailsController.getVehicleDetails);

module.exports = router;
