const cloudinary = require("../config/cloudinary");

// ── Upload a single file buffer to Cloudinary ─────────────
const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder:         "complaint-sync/complaints",
      resource_type:  "auto",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
};

// ── Upload multiple files ─────────────────────────────────
const uploadMultipleFiles = async (files, folder = "complaint-sync/complaints") => {
  const results = await Promise.all(
    files.map((file) =>
      uploadToCloudinary(file.buffer, {
        folder,
        public_id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      })
    )
  );
  return results;
};

// ── Delete a file from Cloudinary ────────────────────────
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
    return { success: false, error: err.message };
  }
};

// ── Delete multiple files ─────────────────────────────────
const deleteMultipleFiles = async (publicIds) => {
  await Promise.all(publicIds.map((id) => deleteFromCloudinary(id)));
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleFiles,
  deleteFromCloudinary,
  deleteMultipleFiles,
};