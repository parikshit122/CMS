const {
  getSettingsSingleton,
  updateSettingsSingleton,
} = require("../../src/db/settings.ts");
const {
  countComplaints,
  deleteOldResolvedComplaints,
} = require("../../src/db/complaints.ts");
const {
  countNotifications,
  deleteAllNotificationsGlobal,
} = require("../../src/db/notifications.ts");
const { countUsers } = require("../../src/db/users.ts");
const { sendMail } = require("../services/email.service");

const getSettings = async (req, res) => {
  try {
    const settings = await getSettingsSingleton();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const ALLOWED_SETTING_FIELDS = new Set([
  "siteName",
  "siteTagline",
  "maintenanceMode",
  "maintenanceMessage",
  "defaultPriority",
  "autoCloseResolvedDays",
  "passwordMinLength",
  "passwordRequireSpecial",
  "passwordRequireNumber",
  "passwordRequireUppercase",
  "sessionTimeoutMinutes",
  "maxLoginAttempts",
  "otpExpiryMinutes",
  "emailEnabled",
  "emailSenderName",
  "notifyOnSubmit",
  "notifyOnAssign",
  "notifyOnResolve",
  "categories",
]);

const updateSettings = async (req, res) => {
  try {
    const updates = req.body || {};
    const sanitizedUpdates = {};

    Object.keys(updates).forEach((key) => {
      if (ALLOWED_SETTING_FIELDS.has(key) && updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    });

    const settings = await updateSettingsSingleton(sanitizedUpdates);

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: settings,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addCategory = async (req, res) => {
  try {
    const { category } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const cleaned = category.trim().toLowerCase();
    const settings = await getSettingsSingleton();
    const currentCategories = Array.isArray(settings.categories)
      ? settings.categories
      : [];

    if (currentCategories.includes(cleaned)) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const updated = await updateSettingsSingleton({
      categories: [...currentCategories, cleaned],
    });

    res.json({
      success: true,
      message: "Category added successfully",
      data: updated.categories,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { name } = req.params;
    const settings = await getSettingsSingleton();
    const currentCategories = Array.isArray(settings.categories)
      ? settings.categories
      : [];

    if (!currentCategories.includes(name)) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const inUse = await countComplaints({ category: name });
    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${inUse} complaint(s) use this category.`,
      });
    }

    const updated = await updateSettingsSingleton({
      categories: currentCategories.filter((c) => c !== name),
    });

    res.json({
      success: true,
      message: "Category deleted successfully",
      data: updated.categories,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const sendTestEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    const settings = await getSettingsSingleton();
    const senderName = settings.emailSenderName || "ComplaintSync";

    const result = await sendMail(
      email,
      `${senderName} — Test Email`,
      `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
      <h2 style="color: #6366f1;">Test Email Successful</h2>
      <p>This is a test email from your admin settings.</p>
      <p>If you received this, your email configuration is working correctly.</p>
      <p style="margin-top: 24px; color: #8a94a6; font-size: 13px;">
        Sent at: ${new Date().toLocaleString()}
      </p>
    </div>
  `,
      "TestEmail"
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send test email: " + (result.error || "Unknown error"),
      });
    }

    res.json({
      success: true,
      message: `Test email sent to ${email}`,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to send test email: " + err.message,
    });
  }
};

const clearOldResolved = async (req, res) => {
  try {
    const { days } = req.body;
    const cutoffDays = parseInt(days, 10) || 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);

    const deletedCount = await deleteOldResolvedComplaints(cutoffDate);

    res.json({
      success: true,
      message: `Deleted ${deletedCount} resolved complaint(s) older than ${cutoffDays} days`,
      deletedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const clearAllNotifications = async (req, res) => {
  try {
    const deletedCount = await deleteAllNotificationsGlobal();
    res.json({
      success: true,
      message: `Cleared ${deletedCount} notification(s)`,
      deletedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalStaff,
      totalAdmins,
      totalComplaints,
      totalNotifications,
      pendingComplaints,
      resolvedComplaints,
    ] = await Promise.all([
      countUsers(),
      countUsers("user"),
      countUsers("staff"),
      countUsers("admin"),
      countComplaints(),
      countNotifications(),
      countComplaints({ status: "pending" }),
      countComplaints({ status: "resolved" }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalStudents,
        totalStaff,
        totalAdmins,
        totalComplaints,
        totalNotifications,
        pendingComplaints,
        resolvedComplaints,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  addCategory,
  deleteCategory,
  sendTestEmail,
  clearOldResolved,
  clearAllNotifications,
  getSystemStats,
};