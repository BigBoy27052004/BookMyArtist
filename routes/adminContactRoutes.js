const express = require("express");

const router = express.Router();

const adminContactController = require("../controllers/adminContactController");
const { requireRole } = require("../middleware/authMiddleware");

// View contact messages
router.get("/", requireRole("admin"), adminContactController.getMessages);

// Mark message as read
router.post(
  "/:id/read",
  requireRole("admin"),
  adminContactController.markAsRead,
);

// Delete message
router.post(
  "/:id/delete",
  requireRole("admin"),
  adminContactController.deleteMessage,
);

module.exports = router;
