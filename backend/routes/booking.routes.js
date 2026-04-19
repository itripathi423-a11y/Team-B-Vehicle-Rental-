const express = require("express");
const router = express.Router();
const {
  createBooking,
  getUserBookings,
  getAllBookings,
} = require("../controllers/booking.controller");

// KYC check removed for now — add back when middleware file is created
router.post("/", createBooking);
router.get("/user/:userId", getUserBookings);
router.get("/", getAllBookings);

module.exports = router;
