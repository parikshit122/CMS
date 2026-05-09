const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

const uploadAvatar = async (req, res) => {
  try {
    console.log("==== UPLOAD START ====");
    console.log("File:", req.file);
    console.log("User:", req.user);

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
          if (error) {
            console.error("Cloudinary Error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.end(req.file.buffer);
    });

    console.log("Cloudinary Result:", result);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: result.secure_url },
      { new: true }
    );

    res.json({
      success: true,
      avatar: user.avatar,
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Upload failed",
    });
  }
};

module.exports = { uploadAvatar };