const express = require("express");
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  getPaymentByBooking,
} = require("../controllers/payment.controller");

router.post("/initiate", initiatePayment);
router.get("/verify", verifyPayment);
router.get("/booking/:bookingId", getPaymentByBooking);

module.exports = router;
