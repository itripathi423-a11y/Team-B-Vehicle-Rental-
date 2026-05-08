const express = require("express");
const router = express.Router();
const { getDestinations } = require("../controllers/destinationController");

router.get("/", getDestinations);

module.exports = router;
