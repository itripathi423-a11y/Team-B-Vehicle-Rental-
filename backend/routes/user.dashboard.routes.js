const express = require("express");
const router = express.Router();

const dashboard = require("../controllers/user.dashboard.controller");
const { isLoggedIn } = require("../middleware/auth.middleware");

// helper to prevent crash
const safe = (fn) => (req, res, next) =>
  typeof fn === "function"
    ? fn(req, res, next)
    : res.status(500).json({ error: "Controller missing" });

router.get("/profile", isLoggedIn, safe(dashboard.getUserProfile));

router.get("/bookings/stats", isLoggedIn, safe(dashboard.getDashboardStats));

router.get("/bookings", isLoggedIn, safe(dashboard.getRecentBookings));

router.get(
  "/bookings/upcoming",
  isLoggedIn,
  safe(dashboard.getUpcomingBooking),
);

router.get(
  "/notifications/unread-count",
  isLoggedIn,
  safe(dashboard.getUnreadNotifications),
);

module.exports = router;
