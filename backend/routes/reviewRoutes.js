const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");

// fetch data for review modal
router.get("/form/:bookingId", reviewController.getReviewForm);

// submit review
router.post("/submit", reviewController.submitReview);

// get all reviews by a specific user  ← ADD THIS
router.get("/user/:userId", reviewController.getUserReviews);

// get vehicle reviews
router.get("/vehicle/:vehicleId", reviewController.getVehicleReviews);

module.exports = router;
