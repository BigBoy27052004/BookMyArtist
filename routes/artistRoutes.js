const express = require("express");

const router = express.Router();

const artistController = require("../controllers/artistController");
const { requireRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

// Browse artists
router.get("/", artistController.browseArtists);

// Logged-in artist profile
router.get("/my-profile", requireRole("artist"), artistController.myProfile);

// Edit logged-in artist profile
router.get(
  "/my-profile/edit",
  requireRole("artist"),
  artistController.editProfile,
);

// Update logged-in artist profile
router.post(
  "/my-profile/edit",
  requireRole("artist"),
  upload.single("profile_image"),
  artistController.updateProfile,
);

// Individual artist profile
router.get("/:id", artistController.viewArtist);

module.exports = router;
