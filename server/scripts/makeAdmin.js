"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");

const EMAIL = "parikshitwadkar96@gmail.com";
const NAME = "Parikshit Wadkar";
const PASSWORD = "Admin@1234";

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");

    let user = await User.findOne({ email: EMAIL.toLowerCase() });

    if (user) {
      user.role = "admin";
      user.isEmailVerified = true;
      user.isActive = true;
      if (user.provider === "local") {
        user.password = PASSWORD;
      }
      await user.save();
      console.log(`✅ Existing user promoted to admin: ${EMAIL}`);
    } else {
      user = await User.create({
        name: NAME,
        email: EMAIL.toLowerCase(),
        password: PASSWORD,
        role: "admin",
        provider: "local",
        isEmailVerified: true,
        isActive: true,
      });
      console.log(`✅ Admin user created: ${EMAIL}`);
      console.log(`🔑 Password: ${PASSWORD}`);
    }

    console.log("\n📋 User Details:");
    console.log(`   Name:     ${user.name}`);
    console.log(`   Email:    ${user.email}`);
    console.log(`   Role:     ${user.role}`);
    console.log(`   Verified: ${user.isEmailVerified}`);
    console.log(`   Active:   ${user.isActive}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();