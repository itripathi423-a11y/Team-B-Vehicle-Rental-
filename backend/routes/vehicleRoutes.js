const express = require("express");
const router = express.Router();
const { getVehicles } = require("../controllers/vehicleController");

router.get("/", getVehicles);

module.exports = router;
