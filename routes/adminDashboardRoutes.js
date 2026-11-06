const express = require("express");

const router = express.Router();

const adminDashboardController = require("../controllers/adminDashboardController");
const { requireRole } = require("../middleware/authMiddleware");

router.get(
  "/admin-dashboard",
  requireRole("admin"),
  adminDashboardController.adminDashboard,
);

router.get(
  "/admin/profile",
  requireRole("admin"),
  adminDashboardController.adminProfile,
);

router.post(
  "/admin/profile/change-password",
  requireRole("admin"),
  adminDashboardController.changePassword,
);

module.exports = router;
