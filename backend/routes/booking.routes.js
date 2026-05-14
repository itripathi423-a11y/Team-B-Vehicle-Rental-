const express = require("express");
const router = express.Router();
const {
  createBooking,
  getUserBookings,
  getAllBookings,
  markBookingPaid,
} = require("../controllers/booking.controller");

router.post("/", createBooking);
router.get("/user/:userId", getUserBookings);
router.get("/", getAllBookings);
router.patch("/:id/pay", markBookingPaid);

module.exports = router;
