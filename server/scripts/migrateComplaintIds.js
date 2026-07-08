
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", counterSchema);

const complaintSchema = new mongoose.Schema(
  {
    complaintId:  String,
    title:        String,
    status:       String,
    student:      mongoose.Schema.Types.ObjectId,
    assignedTo:   mongoose.Schema.Types.ObjectId,
    category:     String,
    priority:     String,
    location:     String,
    description:  String,
    resolvedAt:   Date,
    rejectionReason: String,
  },
  { timestamps: true }
);
const Complaint = mongoose.model("Complaint", complaintSchema);

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // ── Step 1: Find max sequence per year ──────────────────
  const complaints = await Complaint.find({ complaintId: { $exists: true } })
    .select("complaintId createdAt")
    .lean();

  const maxByYear = {};

  complaints.forEach((c) => {
    if (!c.complaintId) return;

    // Parse CMP-2024-0042 → year=2024, seq=42
    const match = c.complaintId.match(/^CMP-(\d{4})-(\d+)$/);
    if (!match) return;

    const year = parseInt(match[1]);
    const seq  = parseInt(match[2]);

    if (!maxByYear[year] || seq > maxByYear[year]) {
      maxByYear[year] = seq;
    }
  });

  console.log("📊 Max sequences found:", maxByYear);

  // ── Step 2: Upsert Counter documents ────────────────────
  for (const [year, maxSeq] of Object.entries(maxByYear)) {
    await Counter.findOneAndUpdate(
      { _id: `complaint_${year}` },
      { $max: { seq: maxSeq } },   // Only update if new value is higher
      { upsert: true }
    );
    console.log(`✅ Counter complaint_${year} set to ${maxSeq}`);
  }

  // ── Step 3: Fix complaints with no complaintId ───────────
  const missing = await Complaint.find({
    $or: [
      { complaintId: { $exists: false } },
      { complaintId: null },
      { complaintId: "" },
    ],
  }).lean();

  console.log(`🔧 Found ${missing.length} complaints with no complaintId`);

  for (const c of missing) {
    const year      = new Date(c.createdAt).getFullYear();
    const counterId = `complaint_${year}`;

    const counter = await Counter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const newId = `CMP-${year}-${String(counter.seq).padStart(4, "0")}`;

    await Complaint.updateOne(
      { _id: c._id },
      { $set: { complaintId: newId } }
    );

    console.log(`  Fixed complaint ${c._id} → ${newId}`);
  }

  // ── Step 4: Fix missing resolvedAt ───────────────────────
  const resolvedNoDate = await Complaint.find({
    status:     "resolved",
    resolvedAt: { $exists: false },
  }).lean();

  console.log(
    `🔧 Found ${resolvedNoDate.length} resolved complaints with no resolvedAt`
  );

  for (const c of resolvedNoDate) {
    await Complaint.updateOne(
      { _id: c._id },
      { $set: { resolvedAt: c.updatedAt || new Date() } }
    );
  }

  console.log("✅ Migration complete");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});