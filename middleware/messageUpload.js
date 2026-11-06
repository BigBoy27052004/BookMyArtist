const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Private storage directory, outside /public
const uploadDirectory = path.join(
  __dirname,
  "../private_uploads/message_attachments",
);

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

// Allowed file formats
const allowedTypes = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

// Generate a unique filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = allowedTypes[file.mimetype];

    const uniqueName = crypto.randomUUID() + extension;

    cb(null, uniqueName);
  },
});

// Validate attachment types
const fileFilter = (req, file, cb) => {
  if (!allowedTypes[file.mimetype]) {
    return cb(new Error("Only PDF, JPG and PNG attachments are allowed."));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

module.exports = {
  upload,
  uploadDirectory,
};
