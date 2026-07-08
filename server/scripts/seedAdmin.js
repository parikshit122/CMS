require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const readline = require("readline");

// ── Minimal schemas (avoid loading full app) ─────────────
const userSchema = new mongoose.Schema(
  {
    name:            String,
    email:           { type: String, lowercase: true, trim: true },
    password:        String,
    role:            { type: String, default: "user" },
    phone:           String,
    isEmailVerified: { type: Boolean, default: false },
    isActive:        { type: Boolean, default: true },
    provider:        { type: String, default: "local" },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// ── Readline helper ───────────────────────────────────────
const rl = readline.createInterface({
  input:  process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

// ── Main ──────────────────────────────────────────────────
const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB\n");

  const args    = process.argv.slice(2);
  const promote = args.includes("--promote");

  // ── Mode 1: Promote existing user ────────────────────────
  if (promote) {
    const emailArg = args[args.indexOf("--promote") + 1];
    const email    = emailArg || await ask("Enter email to promote to admin: ");

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    if (user.role === "admin") {
      console.log(`ℹ️  ${user.name} is already an admin`);
      process.exit(0);
    }

    user.role            = "admin";
    user.isEmailVerified = true;
    await user.save();

    console.log(`✅ ${user.name} (${user.email}) promoted to admin`);
    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── Mode 2: Create new admin ──────────────────────────────
  console.log("── Create Admin Account ─────────────────────────────\n");

  const name     = await ask("Full Name:     ");
  const email    = await ask("Email:         ");
  const phone    = await ask("Phone (10 digits, or press Enter to skip): ");
  const password = await ask("Password:      ");

  if (!name.trim()) {
    console.error("❌ Name is required");
    process.exit(1);
  }

  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    console.error("❌ Invalid email");
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error("❌ Password must be at least 8 characters");
    process.exit(1);
  }

  // Check if email already exists
  const existing = await User.findOne({
    email: email.trim().toLowerCase(),
  });

  if (existing) {
    // If exists but not admin — promote them
    if (existing.role !== "admin") {
      const confirm = await ask(
        `\n⚠️  User already exists as "${existing.role}". Promote to admin? (yes/no): `
      );

      if (confirm.toLowerCase() !== "yes") {
        console.log("Cancelled.");
        process.exit(0);
      }

      existing.role            = "admin";
      existing.isEmailVerified = true;
      await existing.save();

      console.log(`\n✅ ${existing.name} promoted to admin successfully`);
    } else {
      console.log(`\nℹ️  ${existing.name} is already an admin`);
    }

    rl.close();
    await mongoose.disconnect();
    process.exit(0);
  }

  // Create new admin
  const hashed = await bcrypt.hash(password, 12);

  const adminData = {
    name:            name.trim(),
    email:           email.trim().toLowerCase(),
    password:        hashed,
    role:            "admin",
    isEmailVerified: true,
    isActive:        true,
    provider:        "local",
  };

  if (phone.trim() && /^[0-9]{10}$/.test(phone.trim())) {
    adminData.phone = phone.trim();
  }

  const admin = await User.create(adminData);

  console.log("\n✅ Admin account created successfully!");
  console.log("─────────────────────────────────────");
  console.log(`   Name:  ${admin.name}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role:  ${admin.role}`);
  console.log(`   ID:    ${admin._id}`);
  console.log("─────────────────────────────────────");
  console.log("\n⚠️  Keep these credentials safe.\n");

  rl.close();
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ Seeder failed:", err.message);
  process.exit(1);
});