const express = require("express");
const router  = express.Router();
const { protect }              = require("../middlewares/auth.middleware");
const { authorizeRoles }       = require("../middlewares/role.middleware");
const { uploadComplaintFiles } = require("../middlewares/upload.middleware");
const {
  submitComplaint,
  getMyComplaints,
  getAssignedComplaints,
  getAllComplaints,
  updateComplaintStatus,
  getStaffStats,
  getAdminStats,
  getStaffList,
} = require("../controllers/complaint.controller");

// ── Student routes ────────────────────────────────────────
router.post(
  "/",
  protect,
  authorizeRoles("user"),
  (req, res, next) => {
    uploadComplaintFiles.array("attachments", 5)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "File upload error",
        });
      }
      next();
    });
  },
  submitComplaint
);

router.get("/my",          protect, authorizeRoles("user"),          getMyComplaints);
router.get("/assigned",    protect, authorizeRoles("staff"),         getAssignedComplaints);
router.get("/stats/staff", protect, authorizeRoles("staff"),         getStaffStats);
router.get("/",            protect, authorizeRoles("admin"),         getAllComplaints);
router.get("/stats/admin", protect, authorizeRoles("admin"),         getAdminStats);
router.get("/staff",       protect, authorizeRoles("admin"),         getStaffList);

router.patch("/:id/status", protect, authorizeRoles("staff", "admin"), updateComplaintStatus);

module.exports = router;