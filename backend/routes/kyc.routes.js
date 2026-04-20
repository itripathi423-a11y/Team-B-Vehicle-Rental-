const express = require("express");
const router = express.Router();

const upload = require("../middleware/kycUpload");
const kycController = require("../controllers/kyc.controller");

// GET USER INFO
router.get("/user-info", kycController.getUserInfo);

// GET KYC STATUS
router.get("/status", kycController.getKycStatus);

// SUBMIT KYC (MULTER HERE)
router.post(
  "/submit",
  upload.fields([
    { name: "document_front", maxCount: 1 },
    { name: "document_back", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  kycController.submitKyc,
);

module.exports = router;
