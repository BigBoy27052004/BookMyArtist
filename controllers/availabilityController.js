const db = require("../database/db");

// ==========================================
// ARTIST AVAILABILITY PAGE
// ==========================================

exports.artistAvailability = async (req, res) => {
  try {
    // Get the logged-in artist's user ID
    const userID = req.session.user.id;

    // Find the artist profile belonging to this user
    const [artists] = await db.promise().query(
      `
      SELECT
        artist_id,
        stage_name
      FROM artists
      WHERE user_id = ?
      LIMIT 1
      `,
      [userID],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist profile not found.");
    }

    const artist = artists[0];

    // Get dates manually blocked by this artist
    const [unavailableDates] = await db.promise().query(
      `
      SELECT
        unavailability_id,
        DATE_FORMAT(unavailable_date, '%Y-%m-%d') AS unavailable_date,
        reason
      FROM artist_unavailability
      WHERE artist_id = ?
      ORDER BY unavailable_date ASC
      `,
      [artist.artist_id],
    );

    // Get dates reserved by accepted/completed bookings
    const [bookedDates] = await db.promise().query(
      `
      SELECT
        booking_id,
        event_name,
        DATE_FORMAT(event_date, '%Y-%m-%d') AS event_date,
        status
      FROM bookings
      WHERE artist_id = ?
        AND status IN ('Accepted', 'Completed')
      ORDER BY event_date ASC
      `,
      [artist.artist_id],
    );

    // Render the artist availability page
    res.render("artist_availability", {
      user: req.session.user,
      artist,
      unavailableDates,
      bookedDates,
    });
  } catch (error) {
    console.error("Artist availability error:", error);

    res.status(500).send("Unable to load artist availability.");
  }
};

// ==========================================
// BLOCK AN ARTIST'S AVAILABLE DATE
// ==========================================

exports.blockDate = async (req, res) => {
  try {
    if (!req.session?.user || req.session.user.role !== "artist") {
      return res.status(403).send("Access denied.");
    }

    const userID = req.session.user.id;
    const { date, reason } = req.body;

    // Validate YYYY-MM-DD format
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).send("Invalid date format.");
    }

    // Validate that the date actually exists
    const parsedDate = new Date(date + "T00:00:00Z");

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).send("Invalid calendar date.");
    }

    // Do not allow blocking dates in the past
    const [[todayResult]] = await db
      .promise()
      .query("SELECT CURDATE() AS today");

    const today = new Date(todayResult.today).toISOString().slice(0, 10);

    if (date < today) {
      return res.status(400).send("You cannot block a date in the past.");
    }

    // Optional reason
    const cleanReason = typeof reason === "string" ? reason.trim() : "";

    if (cleanReason.length > 255) {
      return res.status(400).send("Reason must be 255 characters or fewer.");
    }

    // Get the artist belonging to this user
    const [artists] = await db.promise().query(
      `
      SELECT artist_id
      FROM artists
      WHERE user_id = ?
      LIMIT 1
      `,
      [userID],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist profile not found.");
    }

    const artistID = artists[0].artist_id;

    // Prevent blocking accepted/completed bookings
    const [existingBookings] = await db.promise().query(
      `
      SELECT booking_id
      FROM bookings
      WHERE artist_id = ?
        AND DATE(event_date) = ?
        AND status IN ('Accepted', 'Completed')
      LIMIT 1
      `,
      [artistID, date],
    );

    if (existingBookings.length > 0) {
      return res
        .status(409)
        .send("This date already has an accepted or completed booking.");
    }

    // Save the manually blocked date
    await db.promise().query(
      `
      INSERT INTO artist_unavailability
        (artist_id, unavailable_date, reason)
      VALUES (?, ?, ?)
      `,
      [artistID, date, cleanReason || null],
    );

    return res.redirect("/availability/artist");
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).send("This date is already blocked.");
    }

    console.error("Block artist date error:", error);

    return res.status(500).send("Unable to block this date.");
  }
};

/* ==========================================
   UNBLOCK AN ARTIST'S DATE
========================================== */

exports.unblockDate = async (req, res) => {
  try {
    // Ensure user is a logged-in artist
    if (!req.session?.user || req.session.user.role !== "artist") {
      return res.status(403).send("Access denied.");
    }

    const userID = req.session.user.id;
    const { date } = req.body;

    // Validate YYYY-MM-DD format
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).send("Invalid date format.");
    }

    // Validate the actual calendar date
    const parsedDate = new Date(date + "T00:00:00Z");

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).send("Invalid calendar date.");
    }

    // Find the artist profile belonging
    // to the currently logged-in user
    const [artists] = await db.promise().query(
      `
      SELECT artist_id
      FROM artists
      WHERE user_id = ?
      LIMIT 1
      `,
      [userID],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist profile not found.");
    }

    const artistID = artists[0].artist_id;

    // Delete only this artist's manually blocked date
    const [result] = await db.promise().query(
      `
      DELETE FROM artist_unavailability
      WHERE artist_id = ?
        AND unavailable_date = ?
      `,
      [artistID, date],
    );

    if (result.affectedRows === 0) {
      return res.status(404).send("Blocked date not found.");
    }

    return res.redirect("/availability/artist");
  } catch (error) {
    console.error("Unblock artist date error:", error);

    return res.status(500).send("Unable to unblock this date.");
  }
};
