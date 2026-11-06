const db = require("../database/db");

// MARK ALL NOTIFICATIONS AS READ
exports.markAllAsRead = async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.redirect("/auth/login");
    }

    const userID = req.session.user.id;

    await db.promise().query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = ?
        AND is_read = FALSE
      `,
      [userID],
    );

    console.log(`Notifications marked as read for user ${userID}`);

    // Return the user to their dashboard
    if (req.session.user.role === "artist") {
      return res.redirect("/artist-dashboard");
    }

    if (req.session.user.role === "admin") {
      return res.redirect("/admin-dashboard");
    }

    return res.redirect("/dashboard");
  } catch (error) {
    console.error("Mark notifications as read error:", error);

    return res.status(500).send("Unable to mark notifications as read.");
  }
};
