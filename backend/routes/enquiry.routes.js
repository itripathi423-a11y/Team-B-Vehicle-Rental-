const express = require("express");
const router = express.Router();

const enquiryController = require("../controllers/enquiry.controller");

// MUST BE FUNCTION EXISTING IN CONTROLLER
router.post("/enquiry", enquiryController.createEnquiry);
router.get("/enquiries", enquiryController.getAllEnquiries);

module.exports = router;
