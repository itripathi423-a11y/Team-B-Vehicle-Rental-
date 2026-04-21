const express = require("express");
const router = express.Router();

const controller = require("../controllers/admin.dashboard.controller");
const { isLoggedIn, isAdmin } = require("../middleware/auth.middleware");

router.get("/me", isLoggedIn, isAdmin, controller.getMe);
router.get("/stats", isLoggedIn, isAdmin, controller.getStats);
router.get("/bookings", isLoggedIn, isAdmin, controller.getBookings);

module.exports = router;
