const db = require("../database/db");

// View all contact messages
exports.getMessages = async (req, res) => {
  try {
    const [messages] = await db.promise().query(`
      SELECT *
      FROM contact_messages
      ORDER BY created_at DESC
    `);

    res.render("admin_contact_messages", {
      messages,
    });
  } catch (error) {
    console.error("Admin contact messages error:", error);

    res.status(500).send("Unable to load contact messages.");
  }
};

// Mark a contact message as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    await db.promise().query(
      `UPDATE contact_messages
       SET is_read = TRUE
       WHERE message_id = ?`,
      [id],
    );

    res.redirect("/admin/contact-messages");
  } catch (error) {
    console.error("Mark message as read error:", error);

    res.status(500).send("Unable to update message.");
  }
};

// Delete a contact message
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    await db.promise().query(
      `DELETE FROM contact_messages
       WHERE message_id = ?`,
      [id],
    );

    res.redirect("/admin/contact-messages");
  } catch (error) {
    console.error("Delete contact message error:", error);

    res.status(500).send("Unable to delete message.");
  }
};
