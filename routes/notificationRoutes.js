const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notificationController");
const { requireLogin } = require("../middleware/authMiddleware");

// Mark all notifications belonging to the logged-in user as read
router.post("/read", requireLogin, notificationController.markAllAsRead);

module.exports = router;
