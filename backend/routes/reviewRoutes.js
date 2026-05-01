// ===============================================
// routes/reviewRoutes.js
// ===============================================

const express = require("express");
const router = express.Router();

const reviewController = require("../controllers/reviewController");

// fetch data for review modal
router.get("/form/:bookingId", reviewController.getReviewForm);

// submit review
router.post("/submit", reviewController.submitReview);

// get vehicle reviews
router.get("/vehicle/:vehicleId", reviewController.getVehicleReviews);

module.exports = router;
