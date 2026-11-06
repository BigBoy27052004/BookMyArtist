const express = require("express");

const router = express.Router();

const adminBookingController = require("../controllers/adminBookingController");
const { requireRole } = require("../middleware/authMiddleware");

// View all bookings
router.get("/", requireRole("admin"), adminBookingController.getBookings);

// View a single booking
router.get("/:id", requireRole("admin"), adminBookingController.viewBooking);

// Update booking status
router.post(
  "/:id/status",
  requireRole("admin"),
  adminBookingController.updateBookingStatus,
);

module.exports = router;
