const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const { upload } = require("../middlewares/upload.middleware");
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

    // ── Basic validation ─────────────────────────────────
    if (name !== undefined && name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters",
      });
    }

    if (phone !== undefined && phone !== "") {
      if (!/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Phone must be exactly 10 digits",
        });
      }
    }

    if (year !== undefined && year !== "") {
      if (!["1", "2", "3", "4", "5"].includes(String(year))) {
        return res.status(400).json({
          success: false,
          message: "Invalid year",
        });
      }
    }

    if (bio !== undefined && bio.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Bio cannot exceed 500 characters",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ── Update fields ─────────────────────────────────────
    if (name  !== undefined) user.name = name.trim();
    if (bio   !== undefined) user.bio  = bio;

    // Role-specific fields
    if (user.role === "user") {
      if (course !== undefined) user.course = course;
      if (year   !== undefined) user.year   = year;
    }

    // ── Phone duplicate check ─────────────────────────────
    if (phone !== undefined && phone !== "" && phone !== user.phone) {
      const phoneExists = await User.findOne({
        phone,
        _id: { $ne: user._id },
      });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "This phone number is already in use by another account",
        });
      }
      user.phone = phone;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      data:    user,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return res.status(400).json({
        success: false,
        message: `This ${field} is already in use by another account`,
      });
    }
    res.status(500).json({
      success: false,
      message: "Profile update failed",
    });
  }
});;

// ── Change Password ───────────────────────────────────────
router.patch("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // ── Basic presence checks ─────────────────────────────
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    // ── Passwords match ───────────────────────────────────
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    // ── Min length ────────────────────────────────────────
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    // ── Complexity checks ─────────────────────────────────
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must include at least one uppercase letter",
      });
    }

    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must include at least one number",
      });
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must include at least one special character",
      });
    }

    // ── Get user with password field ──────────────────────
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ── Social login users cannot change password ─────────
    if (user.provider && user.provider !== "local") {
      return res.status(400).json({
        success: false,
        message: `Your account uses ${user.provider} login. Password change is not available.`,
      });
    }

    // ── Verify current password ───────────────────────────
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // ── Cannot reuse same password ────────────────────────
    const isSame = await user.matchPassword(newPassword);
    if (isSame) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your current password",
      });
    }

    // ── Save — pre-save hook hashes automatically ─────────
    user.password      = newPassword;
    user.loginAttempts = 0;
    user.lockUntil     = null;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Password change failed. Please try again.",
    });
  }
});

module.exports = router;