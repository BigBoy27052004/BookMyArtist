const db = require("../database/db");

exports.browseArtists = async (req, res) => {
  try {
    const search = req.query.search || "";
    const genre = req.query.genre || "";
    const province = req.query.province || "";

    let sql = `
  SELECT
    a.artist_id,
    a.stage_name,
    a.genre,
    a.biography,
    a.province,
    a.city,
    a.booking_price,

    u.profile_image,
    u.is_verified,

    COALESCE(AVG(r.rating), 0) AS average_rating,
    COUNT(r.review_id) AS review_count

  FROM artists a

  INNER JOIN users u
    ON a.user_id = u.id

  LEFT JOIN reviews r
    ON a.artist_id = r.artist_id

  WHERE 1 = 1
`;

    const params = [];

    // Search by artist name
    if (search) {
      sql += ` AND a.stage_name LIKE ?`;
      params.push(`%${search}%`);
    }

    // Filter by genre
    if (genre) {
      sql += ` AND a.genre = ?`;
      params.push(genre);
    }

    // Filter by province
    if (province) {
      sql += ` AND a.province = ?`;
      params.push(province);
    }

    sql += `
      GROUP BY
        a.artist_id,
        a.stage_name,
        a.genre,
        a.biography,
        a.province,
        a.city,
        a.booking_price,
        u.profile_image

      ORDER BY
        average_rating DESC,
        review_count DESC,
        a.stage_name ASC
    `;

    const [artists] = await db.promise().query(sql, params);

    res.render("browse_artist", {
      artists,
      search,
      genre,
      province,
    });
  } catch (error) {
    console.error("Browse artists error:", error);

    res.status(500).send("Unable to load artists.");
  }
};

exports.viewArtist = async (req, res) => {
  try {
    const artistId = req.params.id;

    const [artists] = await db.promise().query(
      `
      SELECT
        a.artist_id,
        a.stage_name,
        a.genre,
        a.biography,
        a.province,
        a.city,
        a.booking_price,

        u.first_name,
        u.last_name,
        u.profile_image,
        u.is_verified,

        COALESCE(AVG(r.rating), 0) AS average_rating,
        COUNT(r.review_id) AS review_count

      FROM artists a

      INNER JOIN users u
        ON a.user_id = u.id

      LEFT JOIN reviews r
        ON a.artist_id = r.artist_id

      WHERE a.artist_id = ?

      GROUP BY
        a.artist_id,
        a.stage_name,
        a.genre,
        a.biography,
        a.province,
        a.city,
        a.booking_price,
        u.first_name,
        u.last_name,
        u.profile_image,
        u.is_verified
      `,
      [artistId],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist not found.");
    }

    const artist = artists[0];

    // Get individual customer reviews
    const [reviews] = await db.promise().query(
      `
  SELECT
    r.review_id,
    r.rating,
    r.review,
    r.created_at,

    u.first_name,
    u.last_name,

    b.event_name,
    b.event_date

  FROM reviews r

  INNER JOIN users u
    ON r.customer_id = u.id

  LEFT JOIN bookings b
    ON r.booking_id = b.booking_id

  WHERE r.artist_id = ?

  ORDER BY r.created_at DESC, r.review_id DESC
  `,
      [artistId],
    );

    // Retrieve dates manually blocked by this artist
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

    // Retrieve accepted and completed booking dates
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

    // Render public artist profile
    res.render("artist_profile", {
      artist,
      reviews,
      user: req.session?.user || null,
      unavailableDates,
      bookedDates,
    });
  } catch (error) {
    console.error("View artist error:", error);

    res.status(500).send("Unable to load artist profile.");
  }
};

// ==========================================
// LOGGED-IN ARTIST PROFILE
// ==========================================

exports.myProfile = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.redirect("/auth/login");
    }

    const userID = req.session.user.id;

    if (req.session.user.role !== "artist") {
      return res.status(403).send("Access denied.");
    }

    const [artists] = await db.promise().query(
      `
      SELECT
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
        u.profile_image,
        u.is_verified

      FROM artists a

      INNER JOIN users u
        ON a.user_id = u.id

      WHERE a.user_id = ?
      `,
      [userID],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist profile not found.");
    }

    res.render("artist_my_profile", {
      artist: artists[0],
    });
  } catch (error) {
    console.error("My artist profile error:", error);
    res.status(500).send("Unable to load your profile.");
  }
};

// ==========================================
// EDIT ARTIST PROFILE
// ==========================================

exports.editProfile = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.redirect("/auth/login");
    }

    const userID = req.session.user.id;

    if (req.session.user.role !== "artist") {
      return res.status(403).send("Access denied.");
    }

    const [artists] = await db.promise().query(
      `
      SELECT
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

      FROM artists a

      INNER JOIN users u
        ON a.user_id = u.id

      WHERE a.user_id = ?
      `,
      [userID],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist profile not found.");
    }

    res.render("artist_edit_profile", {
      artist: artists[0],
    });
  } catch (error) {
    console.error("Edit artist profile error:", error);
    res.status(500).send("Unable to load edit profile.");
  }
};

exports.updateProfile = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.redirect("/auth/login");
    }

    const userID = req.session.user.id;

    if (req.session.user.role !== "artist") {
      return res.status(403).send("Access denied.");
    }

    const {
      first_name,
      last_name,
      phone,
      stage_name,
      genre,
      biography,
      province,
      city,
      booking_price,
    } = req.body;

    let profileImage = null;

    if (req.file) {
      profileImage = req.file.filename;
    }

    await db.promise().query(
      `
      UPDATE users
      SET
        first_name = ?,
        last_name = ?,
        phone = ?
        ${profileImage ? ", profile_image = ?" : ""}
      WHERE id = ?
      `,
      profileImage
        ? [first_name, last_name, phone, profileImage, userID]
        : [first_name, last_name, phone, userID],
    );

    await db.promise().query(
      `
      UPDATE artists
      SET
        stage_name = ?,
        genre = ?,
        biography = ?,
        province = ?,
        city = ?,
        booking_price = ?
      WHERE user_id = ?
      `,
      [stage_name, genre, biography, province, city, booking_price, userID],
    );

    // Keep the current session information up to date
    req.session.user.first_name = first_name;
    req.session.user.last_name = last_name;

    if (profileImage) {
      req.session.user.profile_image = profileImage;
    }

    res.redirect("/artists/my-profile");
  } catch (error) {
    console.error("Update artist profile error:", error);
    res.status(500).send("Unable to update profile.");
  }
};
