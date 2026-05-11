const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      default: "ComplaintSync",
      trim: true,
    },
    siteTagline: {
      type: String,
      default: "MITM — Jayawanti Babu Foundation",
      trim: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: "We are performing scheduled maintenance. Please check back soon.",
      trim: true,
    },
    defaultPriority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    passwordMinLength: {
      type: Number,
      default: 8,
      min: 6,
      max: 32,
    },
    passwordRequireSpecial: {
      type: Boolean,
      default: true,
    },
    passwordRequireNumber: {
      type: Boolean,
      default: true,
    },
    passwordRequireUppercase: {
      type: Boolean,
      default: true,
    },
    sessionTimeoutMinutes: {
      type: Number,
      default: 15,
      min: 5,
      max: 240,
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
      min: 3,
      max: 20,
    },
    otpExpiryMinutes: {
      type: Number,
      default: 10,
      min: 1,
      max: 60,
    },

    emailEnabled: {
      type: Boolean,
      default: true,
    },
    emailSenderName: {
      type: String,
      default: "ComplaintSync — MITM",
      trim: true,
    },
    notifyOnSubmit: {
      type: Boolean,
      default: true,
    },
    notifyOnAssign: {
      type: Boolean,
      default: true,
    },
    notifyOnResolve: {
      type: Boolean,
      default: true,
    },

    categories: {
      type: [String],
      default: [
        "infrastructure",
        "cleanliness",
        "electrical",
        "plumbing",
        "safety",
        "it",
        "academic",
        "other",
      ],
    },

    autoCloseResolvedDays: {
      type: Number,
      default: 30,
      min: 7,
      max: 365,
    },
  },
  { timestamps: true },
);

settingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);