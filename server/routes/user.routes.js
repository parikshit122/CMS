const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const { uploadAvatar } = require("../controllers/user.controller");
const User = require("../models/User");

router.get("/test", (req, res) => {
  res.json({ message: "Users route working ✅" });
});

router.post("/upload-avatar", protect, upload.single("avatar"), uploadAvatar);

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
    if (phone !== undefined) user.phone = phone;
    if (course !== undefined) user.course = course;
    if (year !== undefined) user.year = year;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({
      success: true,
      data: user,
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;