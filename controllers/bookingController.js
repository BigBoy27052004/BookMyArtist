const db = require("../database/db");

exports.showBookingForm = async (req, res) => {
  try {
    const artistId = req.params.artistId;

    const [artists] = await db.promise().query(
      `
      SELECT
        a.artist_id,
        a.stage_name,
        a.genre,
        a.booking_price,
        a.province,
        a.city,
        u.profile_image
      FROM artists a
      INNER JOIN users u
        ON a.user_id = u.id
      WHERE a.artist_id = ?
      `,
      [artistId],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist not found.");
    }

    const artist = artists[0];

    // Retrieve dates manually blocked by the artist
    const [unavailableDates] = await db.promise().query(
      `
  SELECT
    DATE_FORMAT(
      unavailable_date, '%Y-%m-%d'
    ) AS date
  FROM artist_unavailability
  WHERE artist_id = ?
  ORDER BY unavailable_date ASC
  `,
      [artist.artist_id],
    );

    // Retrieve booked dates
    const [bookedDates] = await db.promise().query(
      `
  SELECT DISTINCT
    DATE_FORMAT(
      event_date, '%Y-%m-%d'
    ) AS date
  FROM bookings
  WHERE artist_id = ?
    AND status IN ('Accepted', 'Completed')
  ORDER BY date ASC
  `,
      [artist.artist_id],
    );

    // Render the booking form
    res.render("create_booking", {
      artist,
      unavailableDates,
      bookedDates,
      user: req.session?.user || null,
    });
  } catch (error) {
    console.error("Show booking form error:", error);
    res.status(500).send("Unable to load booking form.");
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { artist_id, event_name, event_date, venue } = req.body;

    /*
      For now, we'll get the customer ID
      from the logged-in session.
    */

    if (!req.session || !req.session.user) {
      return res.redirect("/auth/login");
    }

    const customerId = req.session.user.id;

    // Check that the artist exists
    const [artists] = await db.promise().query(
      `
  SELECT artist_id, booking_price
  FROM artists
  WHERE artist_id = ?
  `,
      [artist_id],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist not found.");
    }

    const amount = Number(artists[0].booking_price);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res
        .status(400)
        .send("This artist does not have a valid booking price.");
    }

    // ==========================================
    // VALIDATE ARTIST AVAILABILITY
    // ==========================================

    // Validate event date format (YYYY-MM-DD)
    if (
      typeof event_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(event_date)
    ) {
      return res.status(400).send("Please provide a valid event date.");
    }

    // Check that the date actually exists
    const parsedEventDate = new Date(event_date + "T00:00:00Z");

    if (
      Number.isNaN(parsedEventDate.getTime()) ||
      parsedEventDate.toISOString().slice(0, 10) !== event_date
    ) {
      return res.status(400).send("Invalid calendar date.");
    }

    // Check the date against the database's current date
    const [[dateCheck]] = await db.promise().query(
      `
  SELECT
    CASE
      WHEN ? >= CURDATE() THEN 1
      ELSE 0
    END AS validDate
  `,
      [event_date],
    );

    if (!dateCheck.validDate) {
      return res
        .status(400)
        .send("You cannot request a booking for a past date.");
    }

    // Check whether the artist manually blocked this date
    const [blockedDates] = await db.promise().query(
      `
  SELECT unavailability_id
  FROM artist_unavailability
  WHERE artist_id = ?
    AND unavailable_date = ?
  LIMIT 1
  `,
      [artist_id, event_date],
    );

    if (blockedDates.length > 0) {
      return res
        .status(409)
        .send(
          "This artist is unavailable on the selected date. Please choose another date.",
        );
    }

    // Check whether the artist has an accepted
    // or completed booking on this date
    const [existingBookings] = await db.promise().query(
      `
  SELECT booking_id
  FROM bookings
  WHERE artist_id = ?
    AND DATE(event_date) = ?
    AND status IN ('Accepted', 'Completed')
  LIMIT 1
  `,
      [artist_id, event_date],
    );

    if (existingBookings.length > 0) {
      return res
        .status(409)
        .send(
          "This artist is already booked on the selected date. Please choose another date.",
        );
    }

    // If all checks pass, continue to create the booking.

    // Create booking
    const [bookingResult] = await db.promise().query(
      `
  INSERT INTO bookings
  (
    customer_id,
    artist_id,
    event_name,
    event_date,
    venue,
    amount
  )
  VALUES (?, ?, ?, ?, ?, ?)
  `,
      [customerId, artist_id, event_name, event_date, venue, amount],
    );

    const bookingID = bookingResult.insertId;

    // Get the artist's user ID
    const [artistUsers] = await db.promise().query(
      `
  SELECT user_id, stage_name
  FROM artists
  WHERE artist_id = ?
  `,
      [artist_id],
    );

    if (artistUsers.length > 0) {
      const artistUserID = artistUsers[0].user_id;
      const stageName = artistUsers[0].stage_name;

      // Notify the artist about the new booking
      await db.promise().query(
        `
  INSERT INTO notifications
  (
    user_id,
    booking_id,
    title,
    message
  )
  VALUES (?, ?, ?, ?)
  `,
        [
          artistUserID,
          bookingID,
          "New Booking Request",
          `You received a new booking request from ${req.session.user.first_name} ${req.session.user.last_name}.`,
        ],
      );
    }

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Create booking error:", error);

    res.status(500).send("Unable to create booking.");
  }
};

exports.myBookings = async (req, res) => {
  try {
    // Make sure the customer is logged in
    if (!req.session || !req.session.user) {
      return res.redirect("/auth/login");
    }

    const userID = req.session.user.id;

    // Get logged-in customer
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

    // Get all bookings belonging to this customer
    const [bookings] = await db.promise().query(
      `SELECT
        b.booking_id,
        b.event_name,
        b.event_date,
        b.venue,
        b.amount,
        b.status,
        b.payment_status,
        b.created_at,

        EXISTS (
  SELECT 1
  FROM reviews r
  WHERE r.booking_id = b.booking_id
) AS has_review,

        a.artist_id,
        a.stage_name,
        a.genre,

        u.profile_image

       FROM bookings b

       INNER JOIN artists a
         ON b.artist_id = a.artist_id

       INNER JOIN users u
         ON a.user_id = u.id

       WHERE b.customer_id = ?

       ORDER BY b.created_at DESC`,
      [userID],
    );

    // Count unread notifications
    const [notificationResult] = await db.promise().query(
      `SELECT COUNT(*) AS total
       FROM notifications
       WHERE user_id = ?
       AND is_read = FALSE`,
      [userID],
    );

    const notifications = notificationResult[0].total;

    res.render("my_bookings", {
      user,
      bookings,
      notifications,
    });
  } catch (error) {
    console.error("My bookings error:", error);

    res.status(500).send("Unable to load your bookings.");
  }
};

exports.showBookingDetails = async (req, res) => {
  try {
    // Make sure the customer is logged in
    if (!req.session || !req.session.user) {
      return res.redirect("/auth/login");
    }

    const userID = req.session.user.id;
    const bookingID = req.params.bookingId;

    // Get booking details
    const [bookings] = await db.promise().query(
      `SELECT
        b.booking_id,
        b.event_name,
        b.event_date,
        b.venue,
        b.amount,
        b.status,
        b.payment_status,
        b.created_at,

        a.artist_id,
        a.stage_name,
        a.genre,
        a.biography,
        a.province,
        a.city,
        a.booking_price,

        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image

       FROM bookings b

       INNER JOIN artists a
         ON b.artist_id = a.artist_id

       INNER JOIN users u
         ON a.user_id = u.id

       WHERE b.booking_id = ?
       AND b.customer_id = ?`,
      [bookingID, userID],
    );

    if (bookings.length === 0) {
      return res.status(404).send("Booking not found.");
    }

    res.render("booking_details", {
      booking: bookings[0],
    });
  } catch (error) {
    console.error("Booking details error:", error);

    res.status(500).send("Unable to load booking details.");
  }
};

exports.artistBookings = async (req, res) => {
  try {
    // Make sure the artist is logged in
    if (!req.session || !req.session.user) {
      return res.redirect("/auth/login");
    }

    const userID = req.session.user.id;

    // Make sure the logged-in user is an artist
    if (req.session.user.role !== "artist") {
      return res.status(403).send("Access denied.");
    }

    // Find the artist's artist_id
    const [artists] = await db.promise().query(
      `SELECT artist_id, stage_name
       FROM artists
       WHERE user_id = ?`,
      [userID],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist profile not found.");
    }

    const artist = artists[0];

    // Get all bookings received by this artist
    const [bookings] = await db.promise().query(
      `SELECT
        b.booking_id,
        b.event_name,
        b.event_date,
        b.venue,
        b.amount,
        b.status,
        b.payment_status,
        b.created_at,

        u.id AS customer_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.profile_image

       FROM bookings b

       INNER JOIN users u
         ON b.customer_id = u.id

       WHERE b.artist_id = ?

       ORDER BY b.created_at DESC`,
      [artist.artist_id],
    );

    res.render("artist_bookings", {
      artist,
      bookings,
    });
  } catch (error) {
    console.error("Artist bookings error:", error);

    res.status(500).send("Unable to load booking requests.");
  }
};

exports.updateBookingStatus = async (req, res) => {
  let transactionStarted = false;

  try {
    if (!req.session?.user) {
      return res.redirect("/auth/login");
    }

    if (req.session.user.role !== "artist") {
      return res.status(403).send("Access denied.");
    }

    const userID = req.session.user.id;
    const bookingID = Number(req.params.bookingId);
    const { status } = req.body;

    if (!Number.isInteger(bookingID) || bookingID <= 0) {
      return res.status(400).send("Invalid booking ID.");
    }

    if (!["Accepted", "Rejected", "Completed"].includes(status)) {
      return res.status(400).send("Invalid booking status.");
    }

    // Find the logged-in artist
    const [artists] = await db.promise().query(
      `
      SELECT artist_id, stage_name
      FROM artists
      WHERE user_id = ?
      `,
      [userID],
    );

    if (artists.length === 0) {
      return res.status(403).send("Artist profile not found.");
    }

    const artist = artists[0];

    // Start a transaction on the existing MySQL connection
    await db.promise().beginTransaction();
    transactionStarted = true;

    // Lock the booking while checking its current status
    const [bookings] = await db.promise().query(
      `
  SELECT
    booking_id,
    customer_id,
    event_name,
    event_date,
    status
  FROM bookings
  WHERE booking_id = ?
    AND artist_id = ?
  FOR UPDATE
  `,
      [bookingID, artist.artist_id],
    );

    if (bookings.length === 0) {
      await db.promise().rollback();
      transactionStarted = false;

      return res.status(404).send("Booking not found.");
    }

    const booking = bookings[0];

    // Only pending bookings can be accepted or rejected

    // Validate allowed booking status transitions
    if (status === "Completed") {
      // Only accepted bookings can become completed
      if (booking.status !== "Accepted") {
        await db.promise().rollback();
        transactionStarted = false;

        return res
          .status(400)
          .send("Only accepted bookings can be marked as completed.");
      }

      // Check that the scheduled event date has passed
      const [dateCheck] = await db.promise().query(
        `
        SELECT
          CASE
            WHEN DATE(?) <= CURDATE() THEN 1
            ELSE 0
          END AS canComplete
        `,
        [booking.event_date],
      );

      if (!dateCheck[0].canComplete) {
        await db.promise().rollback();
        transactionStarted = false;

        return res
          .status(400)
          .send("This event cannot be completed before its scheduled date.");
      }
    } else {
      // Accept and Reject are only allowed for pending bookings
      if (booking.status !== "Pending") {
        await db.promise().rollback();
        transactionStarted = false;

        return res.redirect("/bookings/artist");
      }
    }

    // ==========================================
    // CHECK AVAILABILITY BEFORE ACCEPTING
    // ==========================================

    if (status === "Accepted") {
      // Ensure the event date has not passed
      const [[dateCheck]] = await db.promise().query(
        `
    SELECT
      CASE
        WHEN DATE(?) >= CURDATE() THEN 1
        ELSE 0
      END AS validDate
    `,
        [booking.event_date],
      );

      if (!dateCheck.validDate) {
        await db.promise().rollback();
        transactionStarted = false;

        return res
          .status(400)
          .send("Cannot accept a booking for a past event date.");
      }

      // Check whether the artist manually blocked
      // the date after receiving the request.
      const [blockedDates] = await db.promise().query(
        `
    SELECT unavailability_id
    FROM artist_unavailability
    WHERE artist_id = ?
      AND unavailable_date = DATE(?)
    LIMIT 1
    `,
        [artist.artist_id, booking.event_date],
      );

      if (blockedDates.length > 0) {
        await db.promise().rollback();
        transactionStarted = false;

        return res
          .status(409)
          .send(
            "This date is blocked in your availability calendar. Unblock it before accepting this booking.",
          );
      }

      // Check whether another booking for this artist
      // has already been accepted or completed.
      const [conflictingBookings] = await db.promise().query(
        `
    SELECT booking_id
    FROM bookings
    WHERE artist_id = ?
      AND DATE(event_date) = DATE(?)
      AND status IN ('Accepted', 'Completed')
      AND booking_id <> ?
    LIMIT 1
    `,
        [artist.artist_id, booking.event_date, bookingID],
      );

      if (conflictingBookings.length > 0) {
        await db.promise().rollback();
        transactionStarted = false;

        return res
          .status(409)
          .send(
            "You already have an accepted or completed booking on this date. You cannot accept another booking for the same date.",
          );
      }
    }

    // Continue with the existing booking status update

    // Update booking status
    await db.promise().query(
      `
      UPDATE bookings
      SET status = ?
      WHERE booking_id = ?
        AND artist_id = ?
      `,
      [status, bookingID, artist.artist_id],
    );

    // Prepare customer notification

    const notificationDetails = {
      Accepted: {
        title: "Booking Accepted",
        message: `Good news! ${artist.stage_name} accepted your booking request for ${booking.event_name || "your event"}.`,
      },

      Rejected: {
        title: "Booking Rejected",
        message: `${artist.stage_name} rejected your booking request for ${booking.event_name || "your event"}.`,
      },

      Completed: {
        title: "Booking Completed",
        message: `Your booking with ${artist.stage_name} for ${booking.event_name || "your event"} has been marked as completed. You can now leave a review!`,
      },
    };

    const { title, message } = notificationDetails[status];

    // Save the customer's notification
    await db.promise().query(
      `
  INSERT INTO notifications
    (user_id, booking_id, title, message)
  VALUES (?, ?, ?, ?)
  `,
      [booking.customer_id, bookingID, title, message],
    );

    // Commit booking update and notification together
    await db.promise().commit();
    transactionStarted = false;

    console.log(`Booking #${bookingID} ${status}. Customer notified.`);

    return res.redirect("/bookings/artist");
  } catch (error) {
    if (transactionStarted) {
      try {
        await db.promise().rollback();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    console.error("Update booking status error:", error);

    return res.status(500).send("Unable to update booking status.");
  }
};

/* ==========================================
   MARK BOOKING AS PAID (MANUAL EFT)
========================================== */

exports.markBookingAsPaid = async (req, res) => {
  try {
    // Only logged-in artists can confirm payments.
    if (!req.session?.user) {
      return res.redirect("/auth/login");
    }

    if (req.session.user.role !== "artist") {
      return res.status(403).send("Access denied.");
    }

    const userID = req.session.user.id;
    const bookingID = Number(req.params.bookingId);

    if (!Number.isInteger(bookingID) || bookingID <= 0) {
      return res.status(400).send("Invalid booking ID.");
    }

    // Find the artist belonging to the logged-in user.
    const [artists] = await db.promise().query(
      `
      SELECT artist_id, stage_name
      FROM artists
      WHERE user_id = ?
      LIMIT 1
      `,
      [userID],
    );

    if (artists.length === 0) {
      return res.status(403).send("Artist profile not found.");
    }

    const artist = artists[0];

    // Retrieve only a booking belonging to this artist.
    const [bookings] = await db.promise().query(
      `
      SELECT
        booking_id,
        customer_id,
        event_name,
        status,
        payment_status
      FROM bookings
      WHERE booking_id = ?
        AND artist_id = ?
      LIMIT 1
      `,
      [bookingID, artist.artist_id],
    );

    if (bookings.length === 0) {
      return res.status(404).send("Booking not found.");
    }

    const booking = bookings[0];

    // Only accepted bookings can be marked as paid.
    if (booking.status !== "Accepted") {
      return res
        .status(400)
        .send("Only accepted bookings can be marked as paid.");
    }

    // Avoid marking an already-paid booking twice.
    if (booking.payment_status === "Paid") {
      return res.redirect("/bookings/artist");
    }

    if (booking.payment_status !== "Unpaid") {
      return res
        .status(400)
        .send("This booking has a different payment status.");
    }

    // Conditional update prevents duplicate confirmations
    // if the button is submitted more than once.
    const [result] = await db.promise().query(
      `
      UPDATE bookings
      SET payment_status = 'Paid'
      WHERE booking_id = ?
        AND artist_id = ?
        AND status = 'Accepted'
        AND payment_status = 'Unpaid'
      `,
      [bookingID, artist.artist_id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(409)
        .send("Payment status has already changed. Please refresh.");
    }

    // Notify the customer about payment confirmation.
    try {
      await db.promise().query(
        `
        INSERT INTO notifications
          (user_id, booking_id, title, message)
        VALUES (?, ?, ?, ?)
        `,
        [
          booking.customer_id,
          bookingID,
          "Payment Confirmed",
          `${artist.stage_name} has confirmed receipt of payment for ${booking.event_name || "your event"}. Your booking is now marked as Paid.`,
        ],
      );
    } catch (notificationError) {
      // Payment confirmation remains saved even if
      // the notification cannot be created.
      console.error("Payment notification error:", notificationError);
    }

    console.log(
      `Booking #${bookingID} marked as Paid by artist #${artist.artist_id}.`,
    );

    return res.redirect("/bookings/artist");
  } catch (error) {
    console.error("Mark booking as paid error:", error);

    return res.status(500).send("Unable to confirm payment.");
  }
};
