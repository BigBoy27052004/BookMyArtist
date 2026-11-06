const express = require("express");

const router = express.Router();

const adminUserController = require("../controllers/adminUserController");
const { requireRole } = require("../middleware/authMiddleware");

// View all users
router.get("/", requireRole("admin"), adminUserController.getUsers);

// View a single user
router.get("/:id", requireRole("admin"), adminUserController.viewUser);

// Verify a user
router.post(
  "/:id/verify",
  requireRole("admin"),
  adminUserController.verifyUser,
);

router.post(
  "/:id/toggle-status",
  requireRole("admin"),
  adminUserController.toggleUserStatus,
);

module.exports = router;
