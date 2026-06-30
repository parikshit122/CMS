const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/auth.middleware");
const checkMaintenance = require("../middlewares/maintenance.middleware");

const authRoutes = require("./auth.routes");
const complaintRoutes = require("./complaint.routes");
const userRoutes = require("./user.routes");
const adminRoutes = require("./admin.routes");
const notificationRoutes = require("./notification.routes");
const settingsRoutes = require("./settings.routes");

router.use("/auth", authRoutes);
router.use("/settings", settingsRoutes);

router.use(protect);
router.use(checkMaintenance);

router.use("/complaints", complaintRoutes);
router.use("/users", userRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);

module.exports = router;