const { getSettingsSingleton } = require("../../src/db/settings.ts");

const checkMaintenance = async (req, res, next) => {
  try {
    const settings = await getSettingsSingleton();

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
  } catch {
    // Allow request to proceed if settings check fails transiently
    return next();
  }
};

module.exports = checkMaintenance;