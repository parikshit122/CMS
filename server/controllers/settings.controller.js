const Settings = require("../models/Settings");
const Notification = require("../models/Notification");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const nodemailer = require("nodemailer");

const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    const updates = req.body;

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        settings[key] = updates[key];
      }
    });

    await settings.save();

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

    const settings = await Settings.getSingleton();

    if (settings.categories.includes(cleaned)) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    settings.categories.push(cleaned);
    await settings.save();

    res.json({
      success: true,
      message: "Category added successfully",
      data: settings.categories,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { name } = req.params;
    const settings = await Settings.getSingleton();

    if (!settings.categories.includes(name)) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const inUse = await Complaint.countDocuments({ category: name });
    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${inUse} complaint(s) use this category.`,
      });
    }

    settings.categories = settings.categories.filter((c) => c !== name);
    await settings.save();

    res.json({
      success: true,
      message: "Category deleted successfully",
      data: settings.categories,
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

    const settings = await Settings.getSingleton();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${settings.emailSenderName}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "ComplaintSync — Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2 style="color: #6366f1;">Test Email Successful</h2>
          <p>This is a test email from your ComplaintSync admin settings.</p>
          <p>If you received this, your email configuration is working correctly.</p>
          <p style="margin-top: 24px; color: #8a94a6; font-size: 13px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

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
    const cutoffDays = parseInt(days) || 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);

    const result = await Complaint.deleteMany({
      status: "resolved",
      updatedAt: { $lt: cutoffDate },
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} resolved complaint(s) older than ${cutoffDays} days`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const clearAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({});
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} notification(s)`,
      deletedCount: result.deletedCount,
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
      User.countDocuments(),
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "staff" }),
      User.countDocuments({ role: "admin" }),
      Complaint.countDocuments(),
      Notification.countDocuments(),
      Complaint.countDocuments({ status: "pending" }),
      Complaint.countDocuments({ status: "resolved" }),
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