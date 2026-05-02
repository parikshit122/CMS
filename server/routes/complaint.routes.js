const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  submitComplaint,
  getMyComplaints,
  getAssignedComplaints,
  getAllComplaints,
  updateComplaintStatus,
  assignComplaint,
  getStaffStats,
  getAdminStats,
  getStaffList,
} = require("../controllers/complaint.controller");

router.post("/",          protect, authorizeRoles("user"),          submitComplaint);
router.get("/my",         protect, authorizeRoles("user"),          getMyComplaints);
router.get("/assigned",   protect, authorizeRoles("staff"),         getAssignedComplaints);
router.get("/",           protect, authorizeRoles("admin"),         getAllComplaints);
router.get("/stats/staff",protect, authorizeRoles("staff"),         getStaffStats);
router.get("/stats/admin",protect, authorizeRoles("admin"),         getAdminStats);
router.get("/staff",      protect, authorizeRoles("admin"),         getStaffList);
router.patch("/:id/status", protect, authorizeRoles("staff"),       updateComplaintStatus);
router.patch("/:id/assign", protect, authorizeRoles("admin"),       assignComplaint);

module.exports = router;