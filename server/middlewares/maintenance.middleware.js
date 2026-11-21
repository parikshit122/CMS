const mongoose = require("mongoose");
const Settings = require("../models/Settings");

const checkMaintenance = async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return next();
  }

  try {
    const settings = await Settings.getSingleton();

    if (!settings.maintenanceMode) {
      return next();
    }

    if (req.user?.role === "admin") {
      return next();
    }

    return res.status(503).json({
      success: false,
      maintenance: true,
      message:
        settings.maintenanceMessage ||
        "Site is under maintenance. Please try again later.",
    });
  } catch (err) {
    return res.status(503).json({
      success: false,
      maintenance: true,
      message: "Service temporarily unavailable. Please try again later.",
    });
  }
};

module.exports = checkMaintenance;