const express = require("express");

const router = express.Router();

const adminArtistController = require("../controllers/adminArtistController");
const { requireRole } = require("../middleware/authMiddleware");

// View all artists
router.get("/", requireRole("admin"), adminArtistController.getArtists);

// View a single artist
router.get("/:id", requireRole("admin"), adminArtistController.viewArtist);

// Verify an artist
router.post(
  "/:id/verify",
  requireRole("admin"),
  adminArtistController.verifyArtist,
);

module.exports = router;
