const express = require("express");
const router = express.Router();

const dashboard = require("../controllers/user.dashboard.controller");
const { isLoggedIn } = require("../middleware/auth.middleware");

// helper to prevent crash
const safe = (fn) => (req, res, next) =>
  typeof fn === "function"
    ? fn(req, res, next)
    : res.status(500).json({ error: "Controller missing" });

/* USER */
router.get("/user/profile", isLoggedIn, safe(dashboard.getUserProfile));

/* DASHBOARD */
router.get("/user/bookings/stats", isLoggedIn, safe(dashboard.getDashboardStats));

router.get("/user/bookings", isLoggedIn, safe(dashboard.getRecentBookings));

router.get(
  "/user/bookings/upcoming",
  isLoggedIn,
  safe(dashboard.getUpcomingBooking)
);

/* VEHICLES */
router.get("/vehicles", safe(dashboard.getVehicles));

/* NOTIFICATIONS */
router.get(
  "/user/notifications/unread-count",
  isLoggedIn,
  safe(dashboard.getUnreadNotifications)
);

module.exports = router;