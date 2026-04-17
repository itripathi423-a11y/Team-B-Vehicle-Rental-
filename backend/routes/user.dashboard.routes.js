const express = require("express");
const router = express.Router();

const dashboard = require("../controllers/user.dashboard.controller");
const auth = require("../middleware/auth.middleware");

/* USER */
router.get("/user/profile", auth, dashboard.getUserProfile);

/* DASHBOARD STATS */
router.get("/user/bookings/stats", auth, dashboard.getDashboardStats);

/* BOOKINGS */
router.get("/user/bookings", auth, dashboard.getRecentBookings);
router.get("/user/bookings/upcoming", auth, dashboard.getUpcomingBooking);

/* VEHICLES */
router.get("/vehicles", dashboard.getVehicles);

/* NOTIFICATIONS */
router.get(
  "/user/notifications/unread-count",
  auth,
  dashboard.getUnreadNotifications,
);

module.exports = router;
