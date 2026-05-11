const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const {
  getSettings,
  updateSettings,
  addCategory,
  deleteCategory,
  sendTestEmail,
  clearOldResolved,
  clearAllNotifications,
  getSystemStats,
} = require("../controllers/settings.controller");

const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

router.use(protect, adminOnly);

router.get("/", getSettings);
router.patch("/", updateSettings);
router.get("/system-stats", getSystemStats);

router.post("/categories", addCategory);
router.delete("/categories/:name", deleteCategory);

router.post("/test-email", sendTestEmail);

router.post("/danger/clear-old-resolved", clearOldResolved);
router.post("/danger/clear-notifications", clearAllNotifications);

module.exports = router;