const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");

const authController = require("../controllers/authController");

// ==========================================
// AUTH PAGES
// ==========================================

router.get("/register", (req, res) => {
  res.render("register");
});

router.get("/login", (req, res) => {
  res.render("login");
});

// ==========================================
// AUTH ACTIONS
// ==========================================

// Login
router.post("/login", authController.login);

// Register
router.post(
  "/register",
  upload.single("profile_image"),
  authController.register,
);

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Unable to logout.");
    }

    res.clearCookie("bookmyartist_session");

    res.redirect("/auth/login");
  });
});

module.exports = router;
