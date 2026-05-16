const express = require("express");
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  getPaymentByBooking,
  initiateEsewaPayment,
  verifyEsewaPayment,
} = require("../controllers/payment.controller");

router.post("/initiate", initiatePayment);
router.get("/verify", verifyPayment);
router.post("/esewa/initiate", initiateEsewaPayment);
router.get("/esewa/verify", verifyEsewaPayment);
router.get("/booking/:bookingId", getPaymentByBooking);

module.exports = router;
