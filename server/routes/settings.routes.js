const express   = require("express");
const router    = express.Router();
const { protect }    = require("../middlewares/auth.middleware");
const { adminOnly }  = require("../middlewares/role.middleware");
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

// All settings routes require admin
router.use(protect, adminOnly);

router.get("/",                           getSettings);
router.patch("/",                         updateSettings);
router.get("/system-stats",               getSystemStats);
router.post("/categories",                addCategory);
router.delete("/categories/:name",        deleteCategory);
router.post("/test-email",                sendTestEmail);
router.post("/danger/clear-old-resolved", clearOldResolved);
router.post("/danger/clear-notifications",clearAllNotifications);

module.exports = router;