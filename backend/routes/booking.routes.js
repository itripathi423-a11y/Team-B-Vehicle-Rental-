const express = require("express");
const router = express.Router();
const {
  createBooking,
  getUserBookings,
  getAllBookings,
} = require("../controllers/booking.controller");

router.post("/", createBooking);
router.get("/user/:userId", getUserBookings);
router.get("/", getAllBookings);

module.exports = router;
