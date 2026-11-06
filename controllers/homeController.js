const db = require("../database/db");

exports.home = async (req, res) => {
  try {
    const [featuredArtists] = await db.promise().query(`
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

      GROUP BY
        a.artist_id,
        a.stage_name,
        a.genre,
        a.biography,
        a.province,
        a.city,
        a.booking_price,
        u.profile_image,
        u.is_verified

      ORDER BY
        average_rating DESC,
        review_count DESC,
        a.stage_name ASC

      LIMIT 6
    `);

    res.render("home", {
      featuredArtists,
    });
  } catch (error) {
    console.error("Home page error:", error);

    res.status(500).send("Unable to load home page.");
  }
};
