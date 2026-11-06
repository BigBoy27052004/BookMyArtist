const db = require("../database/db");

// ==========================================
// VIEW REVIEWS FOR THE LOGGED-IN ARTIST
// ==========================================

exports.artistReviews = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.redirect("/auth/login");
    }

    if (req.session.user.role !== "artist") {
      return res.status(403).send("Access denied.");
    }

    const userID = req.session.user.id;

    // Find the artist profile belonging to the logged-in user
    const [artists] = await db.promise().query(
      `
  SELECT a.artist_id, a.stage_name, u.profile_image
  FROM artists a
  INNER JOIN users u ON a.user_id = u.id
  WHERE a.user_id = ?
  `,
      [userID],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist profile not found.");
    }

    const artist = artists[0];

    // Retrieve reviews for this artist only
    const [reviews] = await db.promise().query(
      `
      SELECT
        r.review_id,
        r.rating,
        r.review,
        r.created_at,
        u.first_name,
        u.last_name,
        b.event_name
      FROM reviews r
      INNER JOIN users u
        ON r.customer_id = u.id
      LEFT JOIN bookings b
        ON r.booking_id = b.booking_id
      WHERE r.artist_id = ?
      ORDER BY r.created_at DESC
      `,
      [artist.artist_id],
    );

    // Calculate the artist's average rating
    const [ratingResult] = await db.promise().query(
      `
      SELECT
        COALESCE(AVG(rating), 0) AS average_rating,
        COUNT(*) AS total_reviews
      FROM reviews
      WHERE artist_id = ?
      `,
      [artist.artist_id],
    );

    res.render("artist_reviews", {
      artist,
      reviews,
      averageRating: Number(ratingResult[0].average_rating),
      totalReviews: ratingResult[0].total_reviews,
    });
  } catch (error) {
    console.error("Artist reviews error:", error);
    res.status(500).send("Unable to load artist reviews.");
  }
};

/* ==========================================
   SHOW CUSTOMER REVIEW FORM
========================================== */

exports.showReviewForm = async (req, res) => {
  try {
    const customerID = req.session.user.id;
    const bookingID = Number(req.params.bookingId);

    if (!Number.isInteger(bookingID) || bookingID <= 0) {
      return res.status(400).send("Invalid booking ID.");
    }

    // Check booking ownership and completion
    const [bookings] = await db.promise().query(
      `
      SELECT
        b.booking_id,
        b.customer_id,
        b.artist_id,
        b.event_name,
        b.status,
        a.stage_name
      FROM bookings b
      INNER JOIN artists a ON b.artist_id = a.artist_id
      WHERE b.booking_id = ?
        AND b.customer_id = ?
      `,
      [bookingID, customerID],
    );

    if (bookings.length === 0) {
      return res.status(404).send("Booking not found.");
    }

    const booking = bookings[0];

    if (booking.status !== "Completed") {
      return res.status(403).send("You can only review completed bookings.");
    }

    // Check whether this booking already has a review
    const [existingReviews] = await db.promise().query(
      `
      SELECT review_id
      FROM reviews
      WHERE booking_id = ?
      `,
      [bookingID],
    );

    if (existingReviews.length > 0) {
      return res.status(409).send("You have already reviewed this booking.");
    }

    return res.render("create_review", {
      booking,
      user: req.session.user,
    });
  } catch (error) {
    console.error("Show review form error:", error);

    return res.status(500).send("Unable to load review form.");
  }
};

/* ==========================================
   SUBMIT CUSTOMER REVIEW
========================================== */

exports.submitReview = async (req, res) => {
  try {
    const customerID = req.session.user.id;
    const bookingID = Number(req.params.bookingId);

    const rating = Number(req.body.rating);

    const review =
      typeof req.body.review === "string" ? req.body.review.trim() : "";

    if (!Number.isInteger(bookingID) || bookingID <= 0) {
      return res.status(400).send("Invalid booking ID.");
    }

    // Validate 1–5 star rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).send("Please select a rating from 1 to 5 stars.");
    }

    if (review.length > 2000) {
      return res.status(400).send("Your review cannot exceed 2000 characters.");
    }

    // Retrieve the booking and verify ownership
    const [bookings] = await db.promise().query(
      `
      SELECT
        b.booking_id,
        b.customer_id,
        b.artist_id,
        b.status,
        a.user_id AS artist_user_id
      FROM bookings b
      INNER JOIN artists a ON b.artist_id = a.artist_id
      WHERE b.booking_id = ?
        AND b.customer_id = ?
      `,
      [bookingID, customerID],
    );

    if (bookings.length === 0) {
      return res.status(404).send("Booking not found.");
    }

    const booking = bookings[0];

    if (booking.status !== "Completed") {
      return res.status(403).send("You can only review completed bookings.");
    }

    // Prevent customers from reviewing themselves
    if (Number(booking.artist_user_id) === Number(customerID)) {
      return res.status(403).send("You cannot review yourself.");
    }

    // Check for an existing review
    const [existingReviews] = await db.promise().query(
      `
      SELECT review_id
      FROM reviews
      WHERE booking_id = ?
      `,
      [bookingID],
    );

    if (existingReviews.length > 0) {
      return res.status(409).send("You have already reviewed this booking.");
    }

    // Save the customer review
    await db.promise().query(
      `
      INSERT INTO reviews
        (booking_id, customer_id, artist_id, rating, review)
      VALUES (?, ?, ?, ?, ?)
      `,
      [bookingID, customerID, booking.artist_id, rating, review || null],
    );

    console.log(`Review submitted for booking #${bookingID}`);

    return res.redirect("/bookings");
  } catch (error) {
    // A unique booking constraint prevents duplicate submissions
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).send("You have already reviewed this booking.");
    }

    console.error("Submit review error:", error);

    return res.status(500).send("Unable to submit review.");
  }
};

/* ==========================================
   VIEW REVIEWS SUBMITTED BY CUSTOMER
========================================== */

exports.customerReviews = async (req, res) => {
  try {
    // Confirm the user is logged in as a customer
    if (!req.session?.user) {
      return res.redirect("/auth/login");
    }

    if (req.session.user.role !== "customer") {
      return res.status(403).send("Access denied.");
    }

    const customerID = req.session.user.id;

    // Retrieve all reviews submitted by this customer
    const [reviews] = await db.promise().query(
      `
      SELECT
        r.review_id,
        r.booking_id,
        r.rating,
        r.review,
        r.created_at,

        a.artist_id,
        a.stage_name,
        a.genre,

        u.profile_image,

        b.event_name,
        b.event_date

      FROM reviews r

      INNER JOIN artists a
        ON r.artist_id = a.artist_id

      INNER JOIN users u
        ON a.user_id = u.id

      INNER JOIN bookings b
        ON r.booking_id = b.booking_id

      WHERE r.customer_id = ?
        AND b.customer_id = ?

      ORDER BY r.created_at DESC, r.review_id DESC
      `,
      [customerID, customerID],
    );

    // Calculate review statistics
    const totalReviews = reviews.length;

    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) /
          totalReviews
        : 0;

    // Render the customer reviews page
    return res.render("customer_reviews", {
      user: req.session.user,
      reviews,
      totalReviews,
      averageRating,
    });
  } catch (error) {
    console.error("Customer reviews error:", error);

    return res.status(500).send("Unable to load your reviews.");
  }
};
