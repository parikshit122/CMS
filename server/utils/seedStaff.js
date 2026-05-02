const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");

const seed = async () => {
  try {
    console.log("Connecting to:", process.env.MONGO_URI ? "URI found" : "URI missing");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const existing = await User.findOne({ email: "staff@test.com" });

    if (existing) {
      existing.role = "staff";
      await existing.save();
      console.log("Updated existing user to staff role");
    } else {
      await User.create({
        name: "Staff User",
        email: "staff@test.com",
        phone: "9876543210",
        password: "Staff@123",
        role: "staff",
      });
      console.log("Staff user created successfully");
    }

    console.log("Email:    staff@test.com");
    console.log("Password: Staff@123");
    mongoose.disconnect();
  } catch (err) {
    console.error("Seed failed:", err.message);
    mongoose.disconnect();
  }
};

seed();