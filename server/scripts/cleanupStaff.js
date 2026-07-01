const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const User = require("../models/User");
const Complaint = require("../models/Complaint");

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  process.env.DB_URI ||
  process.env.MONGO_URL ||
  process.env.ATLAS_URI;

const cleanup = async () => {
  try {
    if (!MONGO_URI) {
      console.error("❌ No MongoDB URI found in .env file!");
      console.error("   Looked for: MONGO_URI, MONGODB_URI, DATABASE_URL, DB_URI, MONGO_URL, ATLAS_URI");
      console.error("\n   Available env vars:");
      Object.keys(process.env)
        .filter((k) => k.toLowerCase().includes("mongo") || k.toLowerCase().includes("db"))
        .forEach((k) => console.error(`   - ${k}`));
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected!\n");

    const staffUsers = await User.find({ role: "staff" }).select(
      "name email createdAt"
    );

    if (staffUsers.length === 0) {
      console.log("ℹ️  No staff users found. Nothing to delete.");
      process.exit(0);
    }

    console.log(`Found ${staffUsers.length} staff user(s):\n`);
    staffUsers.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.name} <${u.email}>`);
    });

    const staffIds = staffUsers.map((u) => u._id);
    const assignedCount = await Complaint.countDocuments({
      assignedTo: { $in: staffIds },
    });

    console.log(
      `\n⚠️  ${assignedCount} complaint(s) are assigned to these staff members.`
    );

    console.log("\n🚨 This will:");
    console.log("   1. DELETE all staff users");
    console.log("   2. UNASSIGN their complaints (set status back to 'pending')");
    console.log("\nPress Ctrl+C to cancel. Continuing in 5 seconds...\n");

    await new Promise((r) => setTimeout(r, 5000));

    const unassignResult = await Complaint.updateMany(
      { assignedTo: { $in: staffIds } },
      {
        $unset: { assignedTo: "" },
        $set: { status: "pending" },
      }
    );
    console.log(
      `✅ Unassigned ${unassignResult.modifiedCount} complaint(s) → set to 'pending'`
    );

    const deleteResult = await User.deleteMany({ role: "staff" });
    console.log(`✅ Deleted ${deleteResult.deletedCount} staff user(s)`);

    console.log("\n🎉 Cleanup complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
};

cleanup();