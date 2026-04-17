const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  getBookingStats,
  getUserBookings,
  getUpcomingBooking,
} = require("../controllers/userController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

router.get("/user/profile", getUserProfile);
router.get("/user/bookings/stats", getBookingStats);
router.get("/user/bookings", getUserBookings);
router.get("/user/bookings/upcoming", getUpcomingBooking);

module.exports = router;
