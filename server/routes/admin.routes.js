const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
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
} = require("../controllers/admin.controller");

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

router.get("/users/students", protect, adminOnly, getAllStudents);
router.get("/users/staff", protect, adminOnly, getAllStaff);

router.post("/users/staff", protect, adminOnly, addStaff);
router.patch("/users/staff/:id", protect, adminOnly, updateStaff);
router.delete("/users/staff/:id", protect, adminOnly, deleteStaff);

router.patch("/users/students/:id/suspend", protect, adminOnly, suspendStudent);
router.patch(
  "/users/students/:id/reactivate",
  protect,
  adminOnly,
  reactivateStudent
);

router.get(
  "/staff/by-category/:category",
  protect,
  adminOnly,
  getStaffByCategory
);

router.patch(
  "/complaints/:id/assign",
  protect,
  adminOnly,
  assignStaffToComplaint
);

module.exports = router;