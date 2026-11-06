const express = require("express");

const router = express.Router();

const artistDashboardController = require("../controllers/artistDashboardController");
const { requireRole } = require("../middleware/authMiddleware");

router.get(
  "/artist-dashboard",
  requireRole("artist"),
  artistDashboardController.artistDashboard,
);

module.exports = router;
