const db = require("../database/db");

// View all users with search and filters
exports.getUsers = async (req, res) => {
  try {
    const { search = "", role = "", verification = "" } = req.query;

    let query = `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        profile_image,
        is_verified,
        is_active,
        created_at
      FROM users
      WHERE 1 = 1
    `;

    const queryParams = [];

    // Search by name, email or phone
    if (search.trim() !== "") {
      query += `
        AND (
          first_name LIKE ?
          OR last_name LIKE ?
          OR email LIKE ?
          OR phone LIKE ?
        )
      `;

      const searchValue = `%${search.trim()}%`;

      queryParams.push(searchValue, searchValue, searchValue, searchValue);
    }

    // Filter by role
    if (["customer", "artist", "admin"].includes(role)) {
      query += `
        AND role = ?
      `;

      queryParams.push(role);
    }

    // Filter by verification
    if (verification === "verified") {
      query += `
        AND is_verified = TRUE
      `;
    } else if (verification === "unverified") {
      query += `
        AND is_verified = FALSE
      `;
    }

    query += `
      ORDER BY created_at DESC
    `;

    const [users] = await db.promise().query(query, queryParams);

    const [[userSummary]] = await db.promise().query(`
  SELECT
    COUNT(*) AS total,
    SUM(role = 'customer') AS customers,
    SUM(role = 'artist') AS artists,
    SUM(role = 'admin') AS admins,
    SUM(is_verified = TRUE) AS verified,
    SUM(is_verified = FALSE) AS unverified
  FROM users
`);

    res.render("admin_users", {
      user: req.session.user,
      users,
      search,
      role,
      verification,
      userSummary,
    });
  } catch (error) {
    console.error("Admin users error:", error);

    res.status(500).send("Unable to load users.");
  }
};

// View a single user's details
exports.viewUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.promise().query(
      `
      SELECT
  id,
  first_name,
  last_name,
  email,
  phone,
  role,
  profile_image,
  is_verified,
  is_active,
  created_at
FROM users
      WHERE id = ?
      `,
      [id],
    );

    if (users.length === 0) {
      return res.status(404).send("User not found.");
    }

    res.render("admin_user_details", {
      user: req.session.user,
      selectedUser: users[0],
    });
  } catch (error) {
    console.error("View user error:", error);

    res.status(500).send("Unable to load user details.");
  }
};

// Verify a user
exports.verifyUser = async (req, res) => {
  try {
    const { id } = req.params;

    await db.promise().query(
      `
      UPDATE users
      SET is_verified = TRUE
      WHERE id = ?
      `,
      [id],
    );

    res.redirect("/admin/users");
  } catch (error) {
    console.error("Verify user error:", error);

    res.status(500).send("Unable to verify user.");
  }
};

// Activate or deactivate a user
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent an admin from deactivating their own account
    if (Number(id) === Number(req.session.user.id)) {
      return res
        .status(400)
        .send("You cannot deactivate your own admin account.");
    }

    // Get the current account status
    const [users] = await db.promise().query(
      `
      SELECT id, is_active
      FROM users
      WHERE id = ?
      `,
      [id],
    );

    if (users.length === 0) {
      return res.status(404).send("User not found.");
    }

    const currentStatus = users[0].is_active;

    // Toggle the status
    await db.promise().query(
      `
      UPDATE users
      SET is_active = ?
      WHERE id = ?
      `,
      [currentStatus ? false : true, id],
    );

    res.redirect("/admin/users");
  } catch (error) {
    console.error("Toggle user status error:", error);

    res.status(500).send("Unable to update account status.");
  }
};
