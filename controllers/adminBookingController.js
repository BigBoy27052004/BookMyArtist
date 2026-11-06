const db = require("../database/db");

// View all bookings
exports.getBookings = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    let query = `
      SELECT
        bookings.booking_id,
        bookings.event_name,
        bookings.event_date,
        bookings.venue,
        bookings.amount,
        bookings.status,
        bookings.created_at,

        customer.id AS customer_id,
        customer.first_name AS customer_first_name,
        customer.last_name AS customer_last_name,
        customer.email AS customer_email,

        artists.artist_id,
        artists.stage_name,

        artist_user.first_name AS artist_first_name,
        artist_user.last_name AS artist_last_name

      FROM bookings

      INNER JOIN users AS customer
        ON bookings.customer_id = customer.id

      INNER JOIN artists
        ON bookings.artist_id = artists.artist_id

      INNER JOIN users AS artist_user
        ON artists.user_id = artist_user.id

      WHERE 1 = 1
    `;

    const queryParams = [];

    // Search by customer, artist, or event
    if (search.trim() !== "") {
      query += `
        AND (
          bookings.event_name LIKE ?
          OR customer.first_name LIKE ?
          OR customer.last_name LIKE ?
          OR artists.stage_name LIKE ?
        )
      `;

      const searchValue = `%${search.trim()}%`;

      queryParams.push(searchValue, searchValue, searchValue, searchValue);
    }

    // Filter by booking status
    if (status !== "") {
      query += `
        AND bookings.status = ?
      `;

      queryParams.push(status);
    }

    query += `
      ORDER BY bookings.created_at DESC
    `;

    const [bookings] = await db.promise().query(query, queryParams);
    // Booking summary based on current filters
    const bookingSummary = {
      total: bookings.length,
      pending: bookings.filter((booking) => booking.status === "Pending")
        .length,
      accepted: bookings.filter((booking) => booking.status === "Accepted")
        .length,
      rejected: bookings.filter((booking) => booking.status === "Rejected")
        .length,
      completed: bookings.filter((booking) => booking.status === "Completed")
        .length,
    };

    res.render("admin_bookings", {
      user: req.session.user,
      bookings,
      search,
      status,
      bookingSummary,
    });
  } catch (error) {
    console.error("Admin bookings error:", error);

    res.status(500).send("Unable to load bookings.");
  }
};

// View a single booking
exports.viewBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const [bookings] = await db.promise().query(
      `
      SELECT
        bookings.booking_id,
        bookings.event_name,
        bookings.event_date,
        bookings.venue,
        bookings.amount,
        bookings.status,
        bookings.created_at,

        customer.id AS customer_id,
        customer.first_name AS customer_first_name,
        customer.last_name AS customer_last_name,
        customer.email AS customer_email,
        customer.phone AS customer_phone,

        artists.artist_id,
        artists.stage_name,
        artists.genre,
        artists.province,
        artists.city,

        artist_user.first_name AS artist_first_name,
        artist_user.last_name AS artist_last_name,
        artist_user.email AS artist_email,
        artist_user.phone AS artist_phone

      FROM bookings

      INNER JOIN users AS customer
        ON bookings.customer_id = customer.id

      INNER JOIN artists
        ON bookings.artist_id = artists.artist_id

      INNER JOIN users AS artist_user
        ON artists.user_id = artist_user.id

      WHERE bookings.booking_id = ?
      `,
      [id],
    );

    if (bookings.length === 0) {
      return res.status(404).send("Booking not found.");
    }

    res.render("admin_booking_details", {
      user: req.session.user,
      booking: bookings[0],
    });
  } catch (error) {
    console.error("View booking error:", error);

    res.status(500).send("Unable to load booking details.");
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["Pending", "Accepted", "Rejected", "Completed"];

    // Validate the status
    if (!allowedStatuses.includes(status)) {
      return res.status(400).send("Invalid booking status.");
    }

    // Check that the booking exists
    const [bookings] = await db.promise().query(
      `
  SELECT
    bookings.booking_id,
    bookings.customer_id,
    bookings.event_name,
    artists.stage_name
  FROM bookings
  INNER JOIN artists
    ON bookings.artist_id = artists.artist_id
  WHERE bookings.booking_id = ?
  `,
      [id],
    );

    if (bookings.length === 0) {
      return res.status(404).send("Booking not found.");
    }

    // Update the status
    await db.promise().query(
      `
      UPDATE bookings
      SET status = ?
      WHERE booking_id = ?
      `,
      [status, id],
    );

    // Create notification for the customer
    let notificationTitle = "Booking Status Updated";
    let notificationMessage = `Your booking for ${
      bookings[0].event_name || "your event"
    } with ${bookings[0].stage_name} has been updated to ${status}.`;

    if (status === "Accepted") {
      notificationTitle = "Booking Accepted";
      notificationMessage = `Your booking for ${
        bookings[0].event_name || "your event"
      } with ${bookings[0].stage_name} has been accepted.`;
    }

    if (status === "Rejected") {
      notificationTitle = "Booking Rejected";
      notificationMessage = `Your booking for ${
        bookings[0].event_name || "your event"
      } with ${bookings[0].stage_name} has been rejected.`;
    }

    if (status === "Completed") {
      notificationTitle = "Booking Completed";
      notificationMessage = `Your booking for ${
        bookings[0].event_name || "your event"
      } with ${bookings[0].stage_name} has been marked as completed.`;
    }

    await db.promise().query(
      `
  INSERT INTO notifications
  (user_id, title, message)
  VALUES (?, ?, ?)
  `,
      [bookings[0].customer_id, notificationTitle, notificationMessage],
    );

    console.log(`✅ Booking #${id} status updated to ${status}`);

    res.redirect(`/admin/bookings/${id}`);
  } catch (error) {
    console.error("Update booking status error:", error);

    res.status(500).send("Unable to update booking status.");
  }
};
