const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

const customerProfileController = require("../controllers/customerProfileController");

const { requireRole } = require("../middleware/authMiddleware");

// Display customer profile
router.get("/", requireRole("customer"), customerProfileController.showProfile);

// Update customer details and profile picture
router.post(
  "/update",
  requireRole("customer"),
  upload.single("profile_image"),
  customerProfileController.updateProfile,
);

module.exports = router;
