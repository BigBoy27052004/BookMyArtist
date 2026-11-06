const db = require("../database/db");

const unreadMessagesMiddleware = async (req, res, next) => {
  // Default unread count
  res.locals.unreadCount = 0;

  // Skip database query if the user is not logged in
  if (!req.session || !req.session.user) {
    return next();
  }

  try {
    const userID = req.session.user.id;

    const [rows] = await db.promise().query(
      `
      SELECT COUNT(*) AS unreadCount
      FROM messages
      WHERE receiver_id = ?
        AND is_read = FALSE
      `,
      [userID],
    );

    res.locals.unreadCount = rows[0].unreadCount;

    next();
  } catch (error) {
    console.error("Unread messages middleware error:", error);

    // Keep the application working even if counting fails
    next();
  }
};

module.exports = unreadMessagesMiddleware;
