const Settings = require("../models/Settings");

const checkMaintenance = async (req, res, next) => {
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
    // Fail closed: if we cannot determine maintenance state, block access
    // rather than risk exposing the app during an outage.
    return res.status(503).json({
      success: false,
      maintenance: true,
      message: "Service temporarily unavailable. Please try again later.",
    });
  }
};

module.exports = checkMaintenance;