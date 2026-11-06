const db = require("../database/db");
const bcrypt = require("bcrypt");

exports.adminDashboard = async (req, res) => {
  try {
    // Total users
    const [[userCount]] = await db.promise().query(`
      SELECT COUNT(*) AS total
      FROM users
    `);

    // Total artists
    const [[artistCount]] = await db.promise().query(`
      SELECT COUNT(*) AS total
      FROM artists
    `);

    // Total bookings
    const [[bookingCount]] = await db.promise().query(`
      SELECT COUNT(*) AS total
      FROM bookings
    `);

    // Total contact messages
    const [[messageCount]] = await db.promise().query(`
      SELECT COUNT(*) AS total
      FROM contact_messages
    `);

    // Unread contact messages
    const [[unreadMessageCount]] = await db.promise().query(`
      SELECT COUNT(*) AS total
      FROM contact_messages
      WHERE is_read = FALSE
    `);

    // Get recent bookings
    const [recentBookings] = await db.promise().query(`
  SELECT
    b.booking_id,
    b.event_name,
    b.event_date,
    b.amount,
    b.status,

    customer.first_name AS customer_first_name,
    customer.last_name AS customer_last_name,

    artists.stage_name

  FROM bookings b

  INNER JOIN users AS customer
    ON b.customer_id = customer.id

  INNER JOIN artists
    ON b.artist_id = artists.artist_id

  ORDER BY b.created_at DESC

  LIMIT 5
`);

    // Get recently registered users
    const [recentUsers] = await db.promise().query(`
  SELECT
    id,
    first_name,
    last_name,
    email,
    role,
    profile_image,
    is_verified,
    is_active,
    created_at
  FROM users
  ORDER BY created_at DESC
  LIMIT 5
`);
    // Get recent contact messages
    const [recentMessages] = await db.promise().query(`
  SELECT
    message_id,
    name,
    email,
    subject,
    message,
    is_read,
    created_at
  FROM contact_messages
  ORDER BY created_at DESC
  LIMIT 5
`);

    // Get booking status counts
    const [bookingStatusCounts] = await db.promise().query(`
  SELECT
    status,
    COUNT(*) AS total
  FROM bookings
  GROUP BY status
`);
    const bookingStatus = {
      Pending: 0,
      Accepted: 0,
      Rejected: 0,
      Completed: 0,
    };

    bookingStatusCounts.forEach((item) => {
      bookingStatus[item.status] = item.total;
    });

    res.render("admin_dashboard", {
      user: req.session.user,
      totalUsers: userCount.total,
      totalArtists: artistCount.total,
      totalBookings: bookingCount.total,
      totalMessages: messageCount.total,
      unreadMessages: unreadMessageCount.total,
      recentBookings,
      recentUsers,
      recentMessages,
      bookingStatus,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    res.status(500).send("Unable to load admin dashboard.");
  }
};

// Admin profile
exports.adminProfile = async (req, res) => {
  try {
    const { id } = req.session.user;

    const [users] = await db.promise().query(
      `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        profile_image,
        is_verified,
        is_active,
        created_at
      FROM users
      WHERE id = ?
      `,
      [id],
    );

    if (users.length === 0) {
      return res.status(404).send("Admin account not found.");
    }

    res.render("admin_profile", {
      user: req.session.user,

      admin: users[0],

      passwordChanged: req.query.passwordChanged === "true",
    });
  } catch (error) {
    console.error("Admin profile error:", error);

    res.status(500).send("Unable to load admin profile.");
  }
};

// Change admin password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const adminId = req.session.user.id;

    // Check that the new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).send("New passwords do not match.");
    }

    // Check minimum password length
    if (newPassword.length < 8) {
      return res
        .status(400)
        .send("New password must be at least 8 characters long.");
    }

    // Get current admin password
    const [users] = await db.promise().query(
      `
      SELECT password
      FROM users
      WHERE id = ?
      `,
      [adminId],
    );

    if (users.length === 0) {
      return res.status(404).send("Administrator account not found.");
    }

    const admin = users[0];

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, admin.password);

    if (!passwordMatch) {
      return res.status(400).send("Current password is incorrect.");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.promise().query(
      `
      UPDATE users
      SET password = ?
      WHERE id = ?
      `,
      [hashedPassword, adminId],
    );

    console.log("✅ Admin password changed successfully.");

    res.redirect("/admin/profile?passwordChanged=true");
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).send("Unable to change password.");
  }
};
