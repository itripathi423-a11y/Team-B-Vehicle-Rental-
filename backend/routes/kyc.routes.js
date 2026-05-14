const express = require("express");
const router = express.Router();

const upload = require("../middleware/kycUpload");
const kycController = require("../controllers/kyc.controller");

// ─────────────────────────────
// USER INFO
// ─────────────────────────────
router.get("/user-info", kycController.getUserInfo);

// ─────────────────────────────
// KYC STATUS
// ─────────────────────────────
router.get("/status", kycController.getKycStatus);

// ─────────────────────────────
// ADDITIONAL INFO (NEW)
// ─────────────────────────────
router.get("/additional-info", kycController.getAdditionalInfo);

router.patch("/additional-info", kycController.updateAdditionalInfo);

router.delete("/additional-info", kycController.clearAdditionalInfo);

// ─────────────────────────────
// SUBMIT KYC (with file upload)
// ─────────────────────────────
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
