const db = require("../database/db");
const bcrypt = require("bcrypt");

exports.register = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      role,
      stage_name,
      genre,
      biography,
      province,
      city,
      booking_price,
    } = req.body;

    // Check if email already exists
    const [existing] = await db
      .promise()
      .query("SELECT * FROM users WHERE email = ?", [email]);

    if (existing.length > 0) {
      return res.send("Email already exists.");
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Uploaded image filename
    let image = "default.jpeg";

    if (req.file) {
      image = req.file.filename;
    }

    // Save user
    const [userResult] = await db.promise().query(
      `INSERT INTO users
            (first_name,last_name,email,phone,password,role,profile_image)
            VALUES (?,?,?,?,?,?,?)`,
      [first_name, last_name, email, phone, hashedPassword, role, image],
    );

    const userID = userResult.insertId;

    // If artist, insert into artists table
    if (role === "artist") {
      await db.promise().query(
        `INSERT INTO artists
                (user_id,stage_name,genre,biography,province,city,booking_price)
                VALUES (?,?,?,?,?,?,?)`,
        [userID, stage_name, genre, biography, province, city, booking_price],
      );
    }

    res.redirect("/auth/login");
  } catch (err) {
    console.log(err);

    res.send("Registration failed.");
  }
};

// ADD THE CODE BELOW HERE
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await db.promise().query(
      `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        password,
        role,
        profile_image,
        is_active
      FROM users
      WHERE email = ?
      `,
      [email],
    );

    if (users.length === 0) {
      return res.send("Incorrect email or password.");
    }

    const user = users[0];

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.send("Incorrect email or password.");
    }

    if (!user.is_active) {
      return res
        .status(403)
        .send(
          "Your account has been deactivated. Please contact the administrator.",
        );
    }

    // Regenerate session after successful authentication
    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regeneration error:", err);
        return res.status(500).send("Login failed.");
      }

      req.session.user = {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image,
      };

      // Explicitly save the session before redirecting
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error:", saveErr);
          return res.status(500).send("Unable to save login session.");
        }

        console.log(`✅ Login session saved for ${user.email}`);

        if (user.role === "artist") {
          return res.redirect("/artist-dashboard");
        }

        if (user.role === "customer") {
          return res.redirect("/dashboard");
        }

        if (user.role === "admin") {
          return res.redirect("/admin-dashboard");
        }

        return res.status(403).send("Unknown account type.");
      });
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).send("Login failed.");
  }
};
