const multer = require("multer");

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed."),
      false
    );
  }
};

// ── Single file upload (avatar) ───────────────────────────
const upload = multer({
  storage,
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// ── Multiple files upload (complaint attachments) ─────────
// Max 5 images, 5MB each
const uploadComplaintFiles = multer({
  storage,
  limits: {
    fileSize:  5 * 1024 * 1024,
    files:     5,
  },
  fileFilter,
});

module.exports = { upload, uploadComplaintFiles };