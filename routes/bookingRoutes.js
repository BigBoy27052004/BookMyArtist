const express = require("express");

const router = express.Router();

const bookingController = require("../controllers/bookingController");

// ==========================================
// CUSTOMER BOOKINGS
// ==========================================

// View all customer's bookings
router.get("/", bookingController.myBookings);

// Create booking form
router.get("/create/:artistId", bookingController.showBookingForm);

// Submit booking
router.post("/create", bookingController.createBooking);

// ==========================================
// ARTIST BOOKINGS
// ==========================================

// View booking requests
router.get("/artist", bookingController.artistBookings);

// Accept / Reject booking
router.post("/artist/:bookingId/status", bookingController.updateBookingStatus);

// Artist manually confirms receipt of EFT payment
router.post(
  "/artist/:bookingId/mark-paid",
  bookingController.markBookingAsPaid,
);

// ==========================================
// INDIVIDUAL BOOKING
// ==========================================

// View individual booking details
router.get("/:bookingId", bookingController.showBookingDetails);

module.exports = router;
