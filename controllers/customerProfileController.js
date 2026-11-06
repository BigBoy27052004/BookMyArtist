const db = require("../database/db");
const fs = require("fs/promises");

// ==========================================
// DISPLAY CUSTOMER PROFILE
// ==========================================

exports.showProfile = async (req, res) => {
  try {
    // Check that the user is logged in
    if (!req.session?.user) {
      return res.redirect("/auth/login");
    }

    // Only customers can access this page
    if (req.session.user.role !== "customer") {
      return res.status(403).send("Access denied.");
    }

    const userID = req.session.user.id;

    // Retrieve the customer's information
    const [customers] = await db.promise().query(
      `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        province,
        city,
        profile_image
      FROM users
      WHERE id = ?
        AND role = 'customer'
        AND is_active = TRUE
      LIMIT 1
      `,
      [userID],
    );

    if (customers.length === 0) {
      return res.status(404).send("Customer profile not found.");
    }

    return res.render("customer_profile", {
      user: req.session.user,
      customer: customers[0],
      updated: req.query.updated === "true",
    });
  } catch (error) {
    console.error("Customer profile error:", error);

    return res.status(500).send("Unable to load customer profile.");
  }
};

/* ==========================================
   UPDATE CUSTOMER PROFILE
========================================== */

exports.updateProfile = async (req, res) => {
  let imageSaved = false;

  // Remove a newly uploaded file if saving fails.
  const cleanup = async () => {
    if (req.file && !imageSaved) {
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.error("Image cleanup error:", error);
      }
    }
  };

  try {
    if (!req.session?.user) {
      await cleanup();
      return res.redirect("/auth/login");
    }

    if (req.session.user.role !== "customer") {
      await cleanup();
      return res.status(403).send("Access denied.");
    }

    const userID = req.session.user.id;

    const first_name = String(req.body.first_name || "").trim();
    const last_name = String(req.body.last_name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const province = String(req.body.province || "").trim();
    const city = String(req.body.city || "").trim();

    // Validate required fields.
    if (!first_name || !last_name || !email) {
      await cleanup();
      return res
        .status(400)
        .send("First name, last name and email are required.");
    }

    if (
      first_name.length > 100 ||
      last_name.length > 100 ||
      email.length > 150 ||
      phone.length > 20 ||
      province.length > 100 ||
      city.length > 100
    ) {
      await cleanup();
      return res
        .status(400)
        .send("One or more fields exceed the allowed length.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await cleanup();
      return res.status(400).send("Please enter a valid email address.");
    }

    // Make sure no other account uses this email.
    const [existingEmail] = await db.promise().query(
      `
      SELECT id
      FROM users
      WHERE email = ? AND id <> ?
      LIMIT 1
      `,
      [email, userID],
    );

    if (existingEmail.length > 0) {
      await cleanup();
      return res.status(409).send("This email address is already registered.");
    }

    // Retrieve the customer's current profile image.
    const [customers] = await db.promise().query(
      `
      SELECT profile_image
      FROM users
      WHERE id = ?
        AND role = 'customer'
        AND is_active = TRUE
      LIMIT 1
      `,
      [userID],
    );

    if (customers.length === 0) {
      await cleanup();
      return res.status(404).send("Customer profile not found.");
    }

    let profileImage = customers[0].profile_image;

    // Check the actual contents of an uploaded image.
    if (req.file) {
      const buffer = await fs.readFile(req.file.path);

      const isJPEG =
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff;

      const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

      const isPNG =
        buffer.length >= 8 && buffer.subarray(0, 8).equals(pngSignature);

      const isWEBP =
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP";

      const extension = require("path")
        .extname(req.file.filename)
        .toLowerCase();

      const validImage =
        (isJPEG &&
          ["image/jpeg", "image/jpg"].includes(req.file.mimetype) &&
          [".jpg", ".jpeg"].includes(extension)) ||
        (isPNG && req.file.mimetype === "image/png" && extension === ".png") ||
        (isWEBP && req.file.mimetype === "image/webp" && extension === ".webp");

      if (!validImage) {
        await cleanup();
        return res
          .status(400)
          .send("Please upload a valid JPG, PNG or WEBP image.");
      }

      profileImage = req.file.filename;
    }

    // Save updated details in MySQL.
    await db.promise().query(
      `
      UPDATE users
      SET
        first_name = ?,
        last_name = ?,
        email = ?,
        phone = ?,
        province = ?,
        city = ?,
        profile_image = ?
      WHERE id = ?
        AND role = 'customer'
        AND is_active = TRUE
      `,
      [
        first_name,
        last_name,
        email,
        phone || null,
        province || null,
        city || null,
        profileImage,
        userID,
      ],
    );

    imageSaved = true;

    // Update the logged-in session as well.
    req.session.user.first_name = first_name;
    req.session.user.last_name = last_name;
    req.session.user.email = email;
    req.session.user.profile_image = profileImage;

    req.session.save((error) => {
      if (error) {
        console.error("Profile session error:", error);
        return res
          .status(500)
          .send("Profile saved, but the session could not be refreshed.");
      }

      return res.redirect("/customer/profile?updated=true");
    });
  } catch (error) {
    await cleanup();

    console.error("Update customer profile error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).send("This email address is already registered.");
    }

    return res.status(500).send("Unable to update customer profile.");
  }
};
