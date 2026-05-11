const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const complaintRoutes = require("./complaint.routes");
const userRoutes = require("./user.routes");
const adminRoutes = require("./admin.routes");
const notificationRoutes = require("./notification.routes");
const settingsRoutes = require("./settings.routes");

router.use("/auth", authRoutes);
router.use("/complaints", complaintRoutes);
router.use("/users", userRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);
router.use("/settings", settingsRoutes);

module.exports = router;