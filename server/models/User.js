const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^[0-9]{10}$/, "Phone must be 10 digits"],
      set: (v) => (v === "" ? undefined : v),
    },

    password: {
      type: String,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin", "staff"],
      default: "user",
    },

    provider: {
      type: String,
      enum: ["local", "google", "facebook", "twitter", "github"],
      default: "local",
    },

    avatar: { type: String },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
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
    lastLoginAt: { type: Date },
    lastLoginIP: { type: String },

    passwordResetOTP: { type: String, default: null, select: false },
    passwordResetOTPExpiry: { type: Date, default: null },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetTokenExpiry: { type: Date, default: null },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationOTP: { type: String, default: null, select: false },
    emailVerificationOTPExpiry: { type: Date, default: null },
    emailVerificationAttempts: { type: Number, default: 0 },
    lastOTPSentAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.passwordResetOTP;
        delete ret.passwordResetToken;
        delete ret.emailVerificationOTP;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ✅ Only ONE index per field - no duplicates
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// ✅ Hash password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
});

// ✅ Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > new Date();
};

// ✅ Increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    this.loginAttempts = 0;
  }
  await this.save();
};

// ✅ Reset login attempts on success
userSchema.methods.resetLoginAttempts = async function (ip) {
  this.loginAttempts = 0;
  this.lockUntil = null;
  this.lastLoginAt = new Date();
  this.lastLoginIP = ip || "";
  await this.save();
};

module.exports = mongoose.model("User", userSchema);