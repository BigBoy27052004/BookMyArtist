const db = require("../database/db");

// View all artists
exports.getArtists = async (req, res) => {
  try {
    const [artists] = await db.promise().query(`
      SELECT
        artists.artist_id,
        artists.user_id,
        artists.stage_name,
        artists.genre,
        artists.biography,
        artists.province,
        artists.city,
        artists.booking_price,
        users.first_name,
        users.last_name,
        users.email,
        users.phone,
        users.profile_image,
        users.is_verified,
        users.created_at
      FROM artists
      INNER JOIN users
        ON artists.user_id = users.id
      ORDER BY users.created_at DESC
    `);

    res.render("admin_artists", {
      user: req.session.user,
      artists,
    });
  } catch (error) {
    console.error("Admin artists error:", error);

    res.status(500).send("Unable to load artists.");
  }
};

// View a single artist
exports.viewArtist = async (req, res) => {
  try {
    const { id } = req.params;

    const [artists] = await db.promise().query(
      `
      SELECT
        artists.artist_id,
        artists.user_id,
        artists.stage_name,
        artists.genre,
        artists.biography,
        artists.province,
        artists.city,
        artists.booking_price,
        users.first_name,
        users.last_name,
        users.email,
        users.phone,
        users.profile_image,
        users.is_verified,
        users.created_at
      FROM artists
      INNER JOIN users
        ON artists.user_id = users.id
      WHERE artists.artist_id = ?
      `,
      [id],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist not found.");
    }

    res.render("admin_artist_details", {
      user: req.session.user,
      selectedArtist: artists[0],
    });
  } catch (error) {
    console.error("View artist error:", error);

    res.status(500).send("Unable to load artist details.");
  }
};

// Verify an artist
exports.verifyArtist = async (req, res) => {
  try {
    const { id } = req.params;

    const [artists] = await db.promise().query(
      `
      SELECT user_id
      FROM artists
      WHERE artist_id = ?
      `,
      [id],
    );

    if (artists.length === 0) {
      return res.status(404).send("Artist not found.");
    }

    await db.promise().query(
      `
      UPDATE users
      SET is_verified = TRUE
      WHERE id = ?
      `,
      [artists[0].user_id],
    );

    res.redirect("/admin/artists");
  } catch (error) {
    console.error("Verify artist error:", error);

    res.status(500).send("Unable to verify artist.");
  }
};
