const express = require("express");
const router = express.Router();
const {
  getPayments,
  markPaid,
} = require("../controllers/admin.payments.controller");

router.get("/", getPayments);
router.put("/:id/mark-paid", markPaid);

module.exports = router;
