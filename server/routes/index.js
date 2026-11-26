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
const lostFoundRoutes = require("./lostFound.routes");
const publicRoutes = require("./public.routes");
const avishkarRoutes = require("./avishkar.routes");
const campusRoutes = require("./campus.routes");

router.use("/public", publicRoutes);
router.use("/auth", authRoutes);
router.use("/settings", settingsRoutes);

router.use(protect);
router.use(checkMaintenance);

router.use("/complaints", complaintRoutes);
router.use("/users", userRoutes);
router.use("/admin", adminRoutes);
router.use("/notifications", notificationRoutes);
router.use("/lost-found", lostFoundRoutes);
router.use("/avishkar", avishkarRoutes);
router.use("/ai", avishkarRoutes);
router.use("/campus", campusRoutes);

module.exports = router;