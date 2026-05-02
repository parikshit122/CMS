const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String },
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
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
}, { timestamps: true });

userSchema.virtual("isLocked").get(function () {
  return this.lockUntil && this.lockUntil > Date.now();
});

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.incrementLoginAttempts = async function () {
  if (this.loginAttempts >= 4) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  this.loginAttempts += 1;
  await this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

module.exports = mongoose.model("User", userSchema);