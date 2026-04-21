const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/admin.bookings.controller");
const { isLoggedIn, isAdmin } = require("../middleware/auth.middleware");

router.get("/", isLoggedIn, isAdmin, ctrl.getAllBookings);
router.put("/:id", isLoggedIn, isAdmin, ctrl.updateBookingStatus);

module.exports = router;
