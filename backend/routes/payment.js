const express = require("express");
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  getPaymentByBooking,
  initiateEsewa,
  verifyEsewa,
} = require("../controllers/payment.controller");

router.post("/initiate", initiatePayment);
router.get("/verify", verifyPayment);
router.get("/booking/:bookingId", getPaymentByBooking);
router.post("/esewa/initiate", initiateEsewa);
router.get("/esewa/verify", verifyEsewa);

module.exports = router;
