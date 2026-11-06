const express = require("express");
const router = express.Router();

const availabilityController = require("../controllers/availabilityController");

const { requireRole } = require("../middleware/authMiddleware");

// Artist availability page
router.get(
  "/artist",
  requireRole("artist"),
  availabilityController.artistAvailability,
);

// Block an available date
router.post(
  "/artist/block",
  requireRole("artist"),
  availabilityController.blockDate,
);

// Unblock a manually blocked date
router.post(
  "/artist/unblock",
  requireRole("artist"),
  availabilityController.unblockDate,
);

module.exports = router;
