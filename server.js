const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

dotenv.config();

const db = require("./database/db");
const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/bookingRoutes");
const dashboardRoutes = require("./routes/dashboard");
const artistRoutes = require("./routes/artistRoutes");
const artistDashboardRoutes = require("./routes/artistDashboardRoutes");
const contactRoutes = require("./routes/contactRoutes");
const adminContactRoutes = require("./routes/adminContactRoutes");
const homeController = require("./controllers/homeController");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const adminArtistRoutes = require("./routes/adminArtistRoutes");
const adminBookingRoutes = require("./routes/adminBookingRoutes");
const messageRoutes = require("./routes/messageRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const unreadMessagesMiddleware = require("./middleware/unreadMessagesMiddleware");
const notificationRoutes = require("./routes/notificationRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const customerProfileRoutes = require("./routes/customerProfileRoutes");
const { requireLogin, requireRole } = require("./middleware/authMiddleware");

const app = express();

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(
  session({
    key: "bookmyartist_session",
    secret: process.env.SESSION_SECRET || "bookmyartist-secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
  }),
);

// View engine
app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

// Static folders
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make unread message counts available to EJS pages
app.use(unreadMessagesMiddleware);

// Routes
app.use("/auth", authRoutes);
app.use("/bookings", bookingRoutes);
app.use("/", dashboardRoutes);
app.use("/artists", artistRoutes);
app.use("/", artistDashboardRoutes);
app.use("/contact", contactRoutes);
app.use("/admin/contact-messages", adminContactRoutes);
app.use("/", adminDashboardRoutes);
app.use("/admin/users", adminUserRoutes);
app.use("/admin/artists", adminArtistRoutes);
app.use("/admin/bookings", adminBookingRoutes);
app.use("/messages", messageRoutes);
app.use("/reviews", reviewRoutes);
app.use("/notifications", notificationRoutes);
app.use("/availability", availabilityRoutes);
app.use("/customer/profile", customerProfileRoutes);

app.get("/", homeController.home);
app.get("/features", (req, res) => {
  res.render("features");
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/contact", (req, res) => {
  const success = req.query.success === "true";

  res.render("contact", {
    success,
  });
});

const PORT = process.env.PORT || 3000;

app.get("/customer/dashboard", requireRole("customer"), (req, res) => {
  res.send("Customer Dashboard");
});

app.get("/artist/dashboard", requireRole("artist"), (req, res) => {
  res.send("Artist Dashboard");
});

app.get("/admin/dashboard", requireRole("admin"), (req, res) => {
  res.send("Admin Dashboard");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
