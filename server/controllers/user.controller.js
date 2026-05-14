const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "complaint-sync/avatars",
          transformation: [{ width: 300, height: 300, crop: "fill" }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: result.secure_url },
      { returnDocument: "after" }
    );

    res.json({
      success: true,
      avatar: result.secure_url,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Upload failed",
    });
  }
};

module.exports = { uploadAvatar };