const express    = require("express");
const router     = express.Router();
const { protect }              = require("../middlewares/auth.middleware");
const { adminOnly }            = require("../middlewares/role.middleware");
const {
  getAllStudents,
  getAllStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  suspendStudent,
  reactivateStudent,
  getStaffByCategory,
  assignStaffToComplaint,
  getStudentDeletePreview,
  deleteStudent,
  getStaffDeletePreview,
  deleteComplaint,
} = require("../controllers/admin.controller");

// ── Student routes ────────────────────────────────────────
router.get("/users/students",                    protect, adminOnly, getAllStudents);
router.patch("/users/students/:id/suspend",      protect, adminOnly, suspendStudent);
router.patch("/users/students/:id/reactivate",   protect, adminOnly, reactivateStudent);
router.get("/users/students/:id/delete-preview", protect, adminOnly, getStudentDeletePreview);
router.delete("/users/students/:id",             protect, adminOnly, deleteStudent);

// ── Staff routes ──────────────────────────────────────────
router.get("/users/staff",                       protect, adminOnly, getAllStaff);
router.post("/users/staff",                      protect, adminOnly, addStaff);
router.patch("/users/staff/:id",                 protect, adminOnly, updateStaff);
router.get("/users/staff/:id/delete-preview",    protect, adminOnly, getStaffDeletePreview);
router.delete("/users/staff/:id",                protect, adminOnly, deleteStaff);

// ── Staff by category ─────────────────────────────────────
router.get("/staff/by-category/:category",       protect, adminOnly, getStaffByCategory);

// ── Complaint routes ──────────────────────────────────────
router.patch("/complaints/:id/assign",           protect, adminOnly, assignStaffToComplaint);
router.delete("/complaints/:id",                 protect, adminOnly, deleteComplaint);

// ── Promote user role ─────────────────────────────────────
router.patch("/users/:id/promote", protect, adminOnly, async (req, res) => {
  try {
    const { id }   = req.params;
    const { role } = req.body;

    const allowedRoles = ["user", "staff", "admin"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    const User = require("../models/User");
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role            = role;
    user.isEmailVerified = true;
    await user.save();

    res.json({
      success: true,
      message: `${user.name} role updated to ${role}`,
      data: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;