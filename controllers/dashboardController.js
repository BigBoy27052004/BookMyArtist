const db = require("../database/db");

exports.customerDashboard = async (req, res) => {
  try {
    // Make sure the customer is logged in
    if (!req.session.user) {
      return res.redirect("/auth/login");
    }

    // Get logged-in user's ID
    const userID = req.session.user.id;

    // Get user information
    const [users] = await db.promise().query(
      `SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        profile_image,
        role
       FROM users
       WHERE id = ?`,
      [userID],
    );

    if (users.length === 0) {
      return res.redirect("/auth/login");
    }

    const user = users[0];

    // Get total number of bookings
    const [totalBookingsResult] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM bookings
       WHERE customer_id = ?`,
      [userID],
    );

    // Get pending bookings
    const [pendingBookingsResult] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM bookings
       WHERE customer_id = ?
       AND status = 'Pending'`,
      [userID],
    );

    // Get completed bookings
    const [completedBookingsResult] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM bookings
       WHERE customer_id = ?
       AND status = 'Completed'`,
      [userID],
    );

    // Get total amount spent
    const [totalSpentResult] = await db.promise().query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM bookings
       WHERE customer_id = ?
       AND status IN ('Accepted', 'Completed')`,
      [userID],
    );

    // Create statistics object
    const stats = {
      totalBookings: totalBookingsResult[0].total,
      pendingBookings: pendingBookingsResult[0].total,
      completedBookings: completedBookingsResult[0].total,
      totalSpent: totalSpentResult[0].total,
    };

    // Get the customer's recent bookings
    const [recentBookings] = await db.promise().query(
      `SELECT
    b.booking_id,
    b.event_name,
    b.event_date,
    b.amount,
    b.status,

    a.artist_id,
    a.stage_name,

    u.profile_image

   FROM bookings b

   INNER JOIN artists a
     ON b.artist_id = a.artist_id

   INNER JOIN users u
     ON a.user_id = u.id

   WHERE b.customer_id = ?

   ORDER BY b.created_at DESC

   LIMIT 5`,
      [userID],
    );

    // Get the customer's upcoming booking
    const [upcomingBookingResult] = await db.promise().query(
      `SELECT
        b.booking_id,
        b.event_name,
        b.event_date,
        b.venue,
        b.amount,
        b.status,

        a.artist_id,
        a.stage_name,

        u.profile_image

       FROM bookings b

       INNER JOIN artists a
         ON b.artist_id = a.artist_id

       INNER JOIN users u
         ON a.user_id = u.id

       WHERE b.customer_id = ?
       AND b.event_date >= CURDATE()
       AND b.status IN ('Pending', 'Accepted')

       ORDER BY b.event_date ASC

       LIMIT 1`,
      [userID],
    );

    const upcomingBooking =
      upcomingBookingResult.length > 0 ? upcomingBookingResult[0] : null;

    // Get recommended artists
    const [recommendedArtists] = await db.promise().query(
      `SELECT
      a.artist_id,
      a.stage_name,
      a.genre,
      a.booking_price,

      u.profile_image,

      COALESCE(AVG(r.rating),0) AS rating,
      COUNT(r.review_id) AS total_reviews

   FROM artists a

   INNER JOIN users u
      ON a.user_id = u.id

   LEFT JOIN reviews r
      ON a.artist_id = r.artist_id

   GROUP BY
      a.artist_id,
      a.stage_name,
      a.genre,
      a.booking_price,
      u.profile_image

   ORDER BY rating DESC

   LIMIT 10`,
    );

    // Get recent messages
    const [recentMessages] = await db.promise().query(
      `SELECT
      m.message_id,
      m.message,
      m.sent_at,

      u.first_name,
      u.last_name,
      u.profile_image,

      a.stage_name

   FROM messages m

   INNER JOIN users u
      ON m.sender_id = u.id

   LEFT JOIN artists a
      ON a.user_id = u.id

   WHERE m.receiver_id = ?

   ORDER BY m.sent_at DESC

   LIMIT 5`,
      [userID],
    );

    // Get recent notifications
    const [notifications] = await db.promise().query(
      `SELECT
      notification_id,
      booking_id,
      title,
      message,
      is_read,
      created_at

   FROM notifications

   WHERE user_id = ?

   ORDER BY created_at DESC

   LIMIT 5`,
      [userID],
    );

    // Get unread notification count
    const [unreadNotificationsResult] = await db.promise().query(
      `
  SELECT COUNT(*) AS total
  FROM notifications
  WHERE user_id = ?
  AND is_read = FALSE
  `,
      [userID],
    );

    const unreadNotifications = unreadNotificationsResult[0].total;

    // Send everything to the EJS dashboard
    res.render("customer_dashboard", {
      user,
      stats,
      recentBookings,
      upcomingBooking,
      recommendedArtists,
      recentMessages,
      notifications,
      unreadNotifications,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).send("Unable to load dashboard.");
  }
};
