const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: { type: String, unique: true, sparse: true },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["user", "admin", "staff"],
      default: "user",
    },

    provider: {
      type: String,
      enum: ["local", "google", "facebook", "twitter"],
      default: "local",
    },

    avatar: { type: String },

    bio: { type: String, trim: true },

    course: { type: String, trim: true },
    year: { type: String, trim: true },

    category: {
      type: String,
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

    isActive: { type: Boolean, default: true },
    suspendedUntil: { type: Date },
    suspensionReason: { type: String },

    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    passwordResetOTP: { type: String, default: null },
    passwordResetOTPExpiry: { type: Date, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
