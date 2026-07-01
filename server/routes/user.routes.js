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
    console.log("\n🎯 ========== UPLOAD-AVATAR HIT ==========");
    upload.single("avatar")(req, res, (err) => {
      if (err) {
        console.error("❌ MULTER ERROR:", err.message);
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      }
      console.log("✅ Multer OK. File received:", !!req.file);
      console.log("========================================\n");
      next();
    });
  },
  uploadAvatar
);

router.patch("/profile", protect, async (req, res) => {
  console.log("\n🎯 ========== PATCH /profile HIT ==========");
  console.log("📦 Request Body:", JSON.stringify(req.body, null, 2));
  console.log("👤 User ID:", req.user?.id);
  console.log("=========================================\n");

  try {
    const { name, phone, course, year, bio } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      console.log("❌ User not found in DB");
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("📄 Current user data:");
    console.log("   name:", user.name);
    console.log("   phone:", user.phone);
    console.log("   role:", user.role);

    if (name !== undefined) user.name = name;
    if (phone !== undefined && phone !== "") user.phone = phone;
    if (course !== undefined) user.course = course;
    if (year !== undefined) user.year = year;
    if (bio !== undefined) user.bio = bio;

    console.log("💾 Saving user...");
    await user.save();
    console.log("✅ User saved successfully\n");

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error("\n❌ ========== ERROR OCCURRED ==========");
    console.error("Type:", err.name);
    console.error("Message:", err.message);
    console.error("Code:", err.code);
    if (err.errors) console.error("Validation:", err.errors);
    if (err.keyPattern) console.error("Duplicate Key:", err.keyPattern);
    console.error("======================================\n");

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