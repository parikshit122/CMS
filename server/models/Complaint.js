const mongoose = require("mongoose");

// ── Counter collection for atomic ID generation ──────────
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

// ── Complaint Schema ─────────────────────────────────────
const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      lowercase: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    location: {
      type: String,
      trim: true,
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
      trim: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
    
    attachments: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        originalName: { type: String },
        mimeType: { type: String },
        size: { type: Number },
      },
    ],
  },
  { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────
complaintSchema.index({ student: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ category: 1 });

// ── Atomic complaintId generation ────────────────────────
// Uses a separate Counter document with $inc — fully atomic.
// No two complaints can ever get the same ID regardless of
// concurrent submissions.
complaintSchema.pre("save", async function () {
  // Only generate once
  if (this.complaintId) return;

  const year = new Date().getFullYear();
  const counterId = `complaint_${year}`;

  // findOneAndUpdate with $inc is atomic in MongoDB
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    {
      new: true, // return updated doc
      upsert: true, // create if doesn't exist
    },
  );

  this.complaintId = `CMP-${year}-${String(counter.seq).padStart(4, "0")}`;
});

// ── Auto-set resolvedAt ──────────────────────────────────
// Fixes B17 — resolvedAt was never being set
complaintSchema.pre("save", function () {
  if (this.isModified("status")) {
    if (this.status === "resolved" && !this.resolvedAt) {
      this.resolvedAt = new Date();
    }
    // Clear resolvedAt if somehow reverted (shouldn't happen but safe)
    if (this.status !== "resolved") {
      this.resolvedAt = null;
    }
  }
});

module.exports = mongoose.model("Complaint", complaintSchema);
