const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const { requireRole } = require("../middleware/authMiddleware");

// Customer Dashboard
router.get(
  "/dashboard",
  requireRole("customer"),
  dashboardController.customerDashboard,
);

module.exports = router;
