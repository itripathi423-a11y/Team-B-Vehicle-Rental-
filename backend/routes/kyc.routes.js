const express = require("express");
const router = express.Router();
const {
  getUserInfo,
  getKycStatus,
  submitKyc,
} = require("../controllers/kyc.controller");

// GET  /api/kyc/user-info  — prefill form with user's name/email/phone
router.get("/user-info", getUserInfo);

// GET  /api/kyc/status     — check existing KYC status
router.get("/status", getKycStatus);

// POST /api/kyc/submit     — submit KYC form with files
router.post("/submit", submitKyc);

module.exports = router;
