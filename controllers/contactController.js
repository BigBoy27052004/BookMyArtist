const db = require("../database/db");

exports.submitContactForm = async (req, res) => {
  try {
    const {
      name,
      email,
      subject,
      message
    } = req.body;

    await db.promise().query(
      `INSERT INTO contact_messages
       (name, email, subject, message)
       VALUES (?, ?, ?, ?)`,
      [name, email, subject, message]
    );

    console.log("✅ Contact message saved:", email);

    res.redirect("/contact?success=true");

  } catch (error) {
    console.error("Contact form error:", error);

    res.status(500).send("Unable to send message.");
  }
};
