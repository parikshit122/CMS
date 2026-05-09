const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    location: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "rejected"],
      default: "pending",
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
    },
  },
  { timestamps: true }
);

complaintSchema.pre("save", async function () {
  if (this.complaintId) return;

  const year = new Date().getFullYear();

  const count = await this.constructor.countDocuments({
    complaintId: { $regex: `^CMP-${year}-` },
  });

  this.complaintId = `CMP-${year}-${String(count + 1).padStart(4, "0")}`;
});

module.exports = mongoose.model("Complaint", complaintSchema);