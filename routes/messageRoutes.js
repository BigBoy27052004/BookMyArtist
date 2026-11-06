const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");
const { requireLogin } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/messageUpload");
// View all messages and conversations
router.get("/", requireLogin, messageController.messages);

// Start or open a conversation with another user
router.get(
  "/conversation/:userId",
  requireLogin,
  messageController.conversation,
);

// Send a message to another user
router.post(
  "/conversation/:userId",
  requireLogin,
  upload.single("attachment"),
  messageController.sendMessage,
);

// Download a private message attachment
router.get(
  "/attachment/:messageId",
  requireLogin,
  messageController.downloadAttachment,
);

module.exports = router;
