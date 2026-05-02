// admin.review.routes.js
const express = require("express");
const router = express.Router();
const {
  getAllReviews,
  getReviewById,
  getReviewsByVehicle,
  getReviewStats,
  deleteReview,
} = require("../controllers/admin.review.controller");

router.get("/", getAllReviews); // GET /api/admin/reviews
router.get("/stats", getReviewStats); // GET /api/admin/reviews/stats
router.get("/:id", getReviewById); // GET /api/admin/reviews/:id
router.get("/vehicle/:vehicleId", getReviewsByVehicle); // GET /api/admin/reviews/vehicle/:vehicleId
router.delete("/:id", deleteReview); // DELETE /api/admin/reviews/:id

module.exports = router;
