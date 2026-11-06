const express = require("express");
const router = express.Router();

const reviewController = require("../controllers/reviewController");
const { requireRole } = require("../middleware/authMiddleware");

// Artist reviews page
router.get("/artist", requireRole("artist"), reviewController.artistReviews);

// Display the customer review form
router.get(
  "/create/:bookingId",
  requireRole("customer"),
  reviewController.showReviewForm,
);

// Submit a customer review
router.post(
  "/create/:bookingId",
  requireRole("customer"),
  reviewController.submitReview,
);

// Customer's submitted reviews
router.get(
  "/customer",
  requireRole("customer"),
  reviewController.customerReviews,
);

module.exports = router;
