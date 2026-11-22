const { updateUserById } = require("../../src/db/users.ts");
const cloudinary = require("../config/cloudinary");

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(503).json({
        success: false,
        message: "Image upload storage is not configured yet. Add Cloudinary secrets in Settings to enable avatar uploads.",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "complaint-sync/avatars",
          transformation: [{ width: 300, height: 300, crop: "fill" }],
        },
        (error, uploadResult) => {
          if (error) reject(error);
          else resolve(uploadResult);
        }
      );

      stream.end(req.file.buffer);
    });

    await updateUserById(req.user.id, { avatar: result.secure_url });

    res.json({
      success: true,
      avatar: result.secure_url,
    });
  } catch (err) {
    console.error("Avatar upload failed:", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Upload failed",
    });
  }
};

module.exports = { uploadAvatar };