const db = require("../database/db");
const fs = require("fs/promises");
const path = require("path");
const { uploadDirectory } = require("../middleware/messageUpload");

// ==========================================
// VIEW ALL MESSAGES
// ==========================================
exports.messages = async (req, res) => {
  try {
    const userID = req.session.user.id;

    const [messages] = await db.promise().query(
      `
      SELECT
        m.message_id,
        m.sender_id,
        m.receiver_id,
        m.message,
        m.is_read,
        m.sent_at,
        sender.first_name AS sender_first_name,
        sender.last_name AS sender_last_name,
        sender.profile_image AS sender_profile_image,
        receiver.first_name AS receiver_first_name,
        receiver.last_name AS receiver_last_name,
        receiver.profile_image AS receiver_profile_image
      FROM messages m
      INNER JOIN users sender ON m.sender_id = sender.id
      INNER JOIN users receiver ON m.receiver_id = receiver.id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.sent_at DESC
      `,
      [userID, userID],
    );
    const [unreadResult] = await db.promise().query(
      `
  SELECT COUNT(*) AS unreadCount
  FROM messages
  WHERE receiver_id = ?
    AND is_read = FALSE
  `,
      [userID],
    );

    const unreadCount = unreadResult[0].unreadCount;

    // Get potential people to message
    let contacts = [];

    if (req.session.user.role === "artist") {
      const [customers] = await db.promise().query(
        `
        SELECT DISTINCT
    u.id,
    u.first_name,
    u.last_name,
    u.profile_image,
    (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.sender_id = u.id
          AND m.receiver_id = ?
          AND m.is_read = FALSE
    ) AS unread_count
FROM users u
INNER JOIN bookings b ON b.customer_id = u.id
INNER JOIN artists a ON a.artist_id = b.artist_id
WHERE a.user_id = ?
  AND u.id <> ?
ORDER BY u.first_name, u.last_name
        `,
        [userID, userID, userID],
      );

      contacts = customers;
    } else if (req.session.user.role === "customer") {
      const [artists] = await db.promise().query(
        `
        SELECT DISTINCT
    u.id,
    u.first_name,
    u.last_name,
    u.profile_image,
    a.stage_name,
    (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.sender_id = u.id
          AND m.receiver_id = ?
          AND m.is_read = FALSE
    ) AS unread_count
FROM artists a
INNER JOIN users u ON u.id = a.user_id
WHERE u.id <> ?
ORDER BY a.stage_name
        `,
        [userID, userID],
      );

      contacts = artists;
    }

    res.render("messages", {
      user: req.session.user,
      messages,
      contacts,
      unreadCount,
    });
  } catch (error) {
    console.error("Messages error:", error);
    res.status(500).send("Unable to load messages.");
  }
};

// ==========================================
// OPEN A CONVERSATION
// ==========================================
exports.conversation = async (req, res) => {
  try {
    const currentUserID = req.session.user.id;
    const otherUserID = Number(req.params.userId);

    if (!Number.isInteger(otherUserID) || otherUserID <= 0) {
      return res.status(400).send("Invalid user ID.");
    }

    if (otherUserID === currentUserID) {
      return res.status(400).send("You cannot message yourself.");
    }

    const [users] = await db.promise().query(
      `
      SELECT
  u.id,
  u.first_name,
  u.last_name,
  u.profile_image,
  u.role,
  a.stage_name
FROM users u
LEFT JOIN artists a ON a.user_id = u.id
WHERE u.id = ? AND u.is_active = TRUE
      `,
      [otherUserID],
    );

    if (users.length === 0) {
      return res.status(404).send("User not found or inactive.");
    }

    const otherUser = users[0];

    // Customers may message artists; artists may message customers.
    // Other role combinations are not allowed.
    const currentRole = req.session.user.role;

    if (
      !(
        (currentRole === "customer" && otherUser.role === "artist") ||
        (currentRole === "artist" && otherUser.role === "customer")
      )
    ) {
      return res
        .status(403)
        .send("You cannot start a conversation with this user.");
    }

    // Only display messages exchanged between these two users.
    const [messages] = await db.promise().query(
      `
      SELECT
  message_id,
  sender_id,
  receiver_id,
  message,
  attachment_path,
  attachment_name,
  is_read,
  sent_at
FROM messages
      WHERE
        (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
      ORDER BY sent_at ASC
      `,
      [currentUserID, otherUserID, otherUserID, currentUserID],
    );

    // Mark incoming messages as read.
    await db.promise().query(
      `
      UPDATE messages
      SET is_read = TRUE
      WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE
      `,
      [otherUserID, currentUserID],
    );

    res.render("message_conversation", {
      user: req.session.user,
      otherUser,
      messages,
    });
  } catch (error) {
    console.error("Conversation error:", error);
    res.status(500).send("Unable to open conversation.");
  }
};

// ==========================================
// SEND A MESSAGE
// ==========================================

/* ==========================================
   SEND MESSAGE WITH OPTIONAL ATTACHMENT
========================================== */

exports.sendMessage = async (req, res) => {
  let attachmentSaved = false;

  // Remove uploaded files if validation fails.
  const cleanup = async () => {
    if (req.file && !attachmentSaved) {
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("Attachment cleanup error:", error);
        }
      }
    }
  };

  try {
    const senderID = req.session.user.id;
    const receiverID = Number(req.params.userId);

    const message =
      typeof req.body.message === "string" ? req.body.message.trim() : "";

    if (
      !Number.isInteger(receiverID) ||
      receiverID <= 0 ||
      receiverID === senderID
    ) {
      await cleanup();
      return res.status(400).send("Invalid recipient.");
    }

    // Allow a message, attachment, or both.
    if (!message && !req.file) {
      return res.status(400).send("Please enter a message or attach a file.");
    }

    if (message.length > 5000) {
      await cleanup();
      return res.status(400).send("Messages cannot exceed 5000 characters.");
    }

    // Verify recipient.
    const [recipients] = await db.promise().query(
      `
      SELECT id, role
      FROM users
      WHERE id = ?
        AND is_active = TRUE
      `,
      [receiverID],
    );

    if (recipients.length === 0) {
      await cleanup();
      return res.status(404).send("Recipient not found or inactive.");
    }

    const senderRole = req.session.user.role;
    const receiverRole = recipients[0].role;

    const allowedConversation =
      (senderRole === "customer" && receiverRole === "artist") ||
      (senderRole === "artist" && receiverRole === "customer");

    if (!allowedConversation) {
      await cleanup();
      return res.status(403).send("You cannot message this user.");
    }

    // Validate the actual file signature.
    // MIME types alone can be spoofed.
    if (req.file) {
      const handle = await fs.open(req.file.path, "r");

      let header;

      try {
        const buffer = Buffer.alloc(8);
        const result = await handle.read(buffer, 0, 8, 0);
        header = buffer.subarray(0, result.bytesRead);
      } finally {
        await handle.close();
      }

      const isPDF =
        req.file.mimetype === "application/pdf" &&
        header.subarray(0, 5).toString() === "%PDF-";

      const isJPEG =
        req.file.mimetype === "image/jpeg" &&
        header.length >= 3 &&
        header[0] === 0xff &&
        header[1] === 0xd8 &&
        header[2] === 0xff;

      const isPNG =
        req.file.mimetype === "image/png" &&
        header.length >= 8 &&
        header
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

      if (!isPDF && !isJPEG && !isPNG) {
        await cleanup();

        return res
          .status(400)
          .send("Invalid attachment. Upload a valid PDF, JPG or PNG.");
      }
    }

    // Save message and optional attachment reference.
    const [result] = await db.promise().query(
      `
      INSERT INTO messages
        (
          sender_id,
          receiver_id,
          message,
          attachment_path,
          attachment_name
        )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        senderID,
        receiverID,
        message,
        req.file ? req.file.filename : null,
        req.file ? req.file.originalname : null,
      ],
    );

    attachmentSaved = true;

    console.log("Message sent successfully:", result.insertId);

    return res.redirect(`/messages/conversation/${receiverID}`);
  } catch (error) {
    await cleanup();

    console.error("Send message error:", error);

    return res.status(500).send("Unable to send message.");
  }
};

/* ==========================================
   DOWNLOAD PRIVATE MESSAGE ATTACHMENT
========================================== */

exports.downloadAttachment = async (req, res) => {
  try {
    const userID = req.session.user.id;
    const messageID = Number(req.params.messageId);

    if (!Number.isInteger(messageID) || messageID <= 0) {
      return res.status(400).send("Invalid message ID.");
    }

    // Only the sender or receiver may access the file.
    const [messages] = await db.promise().query(
      `
      SELECT
        attachment_path,
        attachment_name
      FROM messages
      WHERE message_id = ?
        AND (sender_id = ? OR receiver_id = ?)
        AND attachment_path IS NOT NULL
      LIMIT 1
      `,
      [messageID, userID, userID],
    );

    if (messages.length === 0) {
      return res.status(404).send("Attachment not found.");
    }

    const attachment = messages[0];

    // Accept only filenames generated by our upload middleware.
    if (!/^[0-9a-f-]{36}\.(pdf|jpg|png)$/.test(attachment.attachment_path)) {
      return res.status(400).send("Invalid attachment reference.");
    }

    const filePath = path.join(uploadDirectory, attachment.attachment_path);

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.download(
      filePath,
      attachment.attachment_name || "attachment",
      (error) => {
        if (error) {
          console.error("Attachment download error:", error);

          if (!res.headersSent) {
            res.status(404).send("Attachment file unavailable.");
          }
        }
      },
    );
  } catch (error) {
    console.error("Download attachment error:", error);

    return res.status(500).send("Unable to download attachment.");
  }
};
