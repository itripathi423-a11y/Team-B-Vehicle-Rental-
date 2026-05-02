const express = require("express");
const router = express.Router();
const {
  getAllEnquiries,
  getEnquiryById,
  replyEnquiry,
  updateStatus,
  closeEnquiry,
  deleteEnquiry,
} = require("../controllers/admin.enquiry.controller");

router.get("/", getAllEnquiries);
router.get("/:id", getEnquiryById);
router.put("/:id/reply", replyEnquiry); // keeps your existing PUT
router.post("/:id/reply", replyEnquiry); // frontend POSTs to this
router.patch("/:id/status", updateStatus); // ← new: frontend calls PATCH
router.put("/:id/close", closeEnquiry);
router.delete("/:id", deleteEnquiry);

module.exports = router;
