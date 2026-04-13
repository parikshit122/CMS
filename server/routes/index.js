const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const complaintRoutes = require("./complaint.routes");
const notificationRoutes = require("./notification.routes");
const adminRoutes = require("./admin.routes");

router.use("/auth", authRoutes);
router.use("/complaints", complaintRoutes);
router.use("/notifications", notificationRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
