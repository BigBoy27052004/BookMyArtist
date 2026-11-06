const db = require("../database/db");

exports.artistDashboard = async (req, res) => {
  try {
    // Make sure the user is logged in
    if (!req.session || !req.session.user) {
      return res.redirect("/auth/login");
    }

    const userID = req.session.user.id;

    // Make sure the logged-in user is an artist
    if (req.session.user.role !== "artist") {
      return res.status(403).send("Access denied.");
    }

    // Get artist profile + user information
    const [artists] = await db.promise().query(
      `SELECT
        a.artist_id,
        a.stage_name,
        a.genre,
        a.biography,
        a.province,
        a.city,
        a.booking_price,
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image
       FROM artists a
       INNER JOIN users u
         ON a.user_id = u.id
       WHERE a.user_id = ?`,
      [userID],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist profile not found.");
    }

    const artist = artists[0];

    // ================================
    // TOTAL BOOKINGS
    // ================================

    const [totalBookingsResult] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM bookings
       WHERE artist_id = ?`,
      [artist.artist_id],
    );

    // ================================
    // PENDING BOOKINGS
    // ================================

    const [pendingBookingsResult] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM bookings
       WHERE artist_id = ?
       AND status = 'Pending'`,
      [artist.artist_id],
    );

    // ================================
    // ACCEPTED BOOKINGS
    // ================================

    const [acceptedBookingsResult] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM bookings
       WHERE artist_id = ?
       AND status = 'Accepted'`,
      [artist.artist_id],
    );

    // ================================
    // TOTAL EARNINGS
    // ================================

    const [earningsResult] = await db.promise().query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM bookings
       WHERE artist_id = ?
       AND status IN ('Accepted', 'Completed')`,
      [artist.artist_id],
    );

    // ================================
    // RECENT BOOKING REQUESTS
    // ================================

    const [recentBookings] = await db.promise().query(
      `SELECT
        b.booking_id,
        b.event_name,
        b.event_date,
        b.venue,
        b.amount,
        b.status,
        b.created_at,

        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image

       FROM bookings b

       INNER JOIN users u
         ON b.customer_id = u.id

       WHERE b.artist_id = ?

       ORDER BY b.created_at DESC

       LIMIT 5`,
      [artist.artist_id],
    );

    // ================================
    // BOOKING STATISTICS
    // ================================

    const stats = {
      totalBookings: totalBookingsResult[0].total,
      pendingBookings: pendingBookingsResult[0].total,
      acceptedBookings: acceptedBookingsResult[0].total,
      totalEarnings: earningsResult[0].total,
    };

    // ================================
    // RECENT ARTIST NOTIFICATIONS
    // ================================

    const [notifications] = await db.promise().query(
      `
      SELECT
        notification_id,
        booking_id,
        title,
        message,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC, notification_id DESC
      LIMIT 5
      `,
      [userID],
    );

    // ================================
    // UNREAD NOTIFICATION COUNT
    // ================================

    const [unreadNotificationsResult] = await db.promise().query(
      `
      SELECT COUNT(*) AS total
      FROM notifications
      WHERE user_id = ?
        AND is_read = FALSE
      `,
      [userID],
    );

    const unreadNotifications = Number(unreadNotificationsResult[0].total);

    // ================================
    // RENDER DASHBOARD
    // ================================

    res.render("artist_dashboard", {
      artist,
      stats,
      recentBookings,
      notifications,
      unreadNotifications,
    });
  } catch (error) {
    console.error("Artist dashboard error:", error);

    res.status(500).send("Unable to load artist dashboard.");
  }
};
