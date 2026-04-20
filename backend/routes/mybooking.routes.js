const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/mybooking.controller");

// Middleware: check req.session.user (set by loginUser)
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Please log in." });
  }
  next();
}

router.get("/my", requireAuth, bookingController.getMyBookings);
router.put("/:id", requireAuth, bookingController.updateBooking);
router.delete("/:id", requireAuth, bookingController.deleteBooking);

module.exports = router;
