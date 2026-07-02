const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const { uploadAvatar } = require("../controllers/user.controller");
const User = require("../models/User");

router.get("/test", (req, res) => {
  res.json({ message: "Users route working ✅" });
});

router.post(
  "/upload-avatar",
  protect,
  (req, res, next) => {
    upload.single("avatar")(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err.message);
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      }
      next();
    });
  },
  uploadAvatar
);

router.patch("/profile", protect, async (req, res) => {
  try {
    const { name, phone, course, year, bio } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined && phone !== "") user.phone = phone;
    if (course !== undefined) user.course = course;
    if (year !== undefined) user.year = year;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("Profile update error:", err.message);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `This ${field} is already in use by another account`,
      });
    }

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;