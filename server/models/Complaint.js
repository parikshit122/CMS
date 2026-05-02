const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
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
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "low",
  },
  location: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "in-progress", "resolved", "rejected"],
    default: "pending",
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model("Complaint", complaintSchema);