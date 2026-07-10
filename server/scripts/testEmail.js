// E:\CMS\server\scripts\testEmail.js
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const {
  sendWelcomeEmail,
  sendEmailVerificationOTP,
  sendEmailVerifiedSuccessEmail,
  sendPasswordResetOTPEmail,
  sendPasswordResetSuccessEmail,
  sendComplaintSubmittedEmail,
  sendComplaintStatusUpdateEmail,
  sendComplaintResolvedEmail,
  sendComplaintAssignedEmail,
  sendComplaintRejectedEmail,
} = require("../services/email.service");

// ── Mock data ──────────────────────────────────────────────────────────────────
const TO    = process.env.EMAIL_FROM;
const NAME  = "Test User";

const mockUser = { name: NAME, email: TO, role: "user" };
const mockStaff = { name: "Staff Member", email: TO, role: "staff" };

const mockComplaint = {
  complaintId:     "CMP-2026-0001",
  title:           "Street light not working on Main Block",
  description:     "The street light near Block C has been non-functional for 3 days causing safety concerns for students returning at night.",
  category:        "electrical",
  priority:        "high",
  location:        "Block C, Main Campus",
  status:          "pending",
  rejectionReason: "Issue is outside the jurisdiction of our department.",
};

// ── Runner ─────────────────────────────────────────────────────────────────────
const tests = [
  {
    name: "1. Welcome + OTP (Registration)",
    fn:   () => sendWelcomeEmail(mockUser, "847291", 10),
  },
  {
    name: "2. Email Verification OTP (Resend)",
    fn:   () => sendEmailVerificationOTP(mockUser, "382910", 10),
  },
  {
    name: "3. Email Verified Success",
    fn:   () => sendEmailVerifiedSuccessEmail(mockUser),
  },
  {
    name: "4. Forgot Password OTP",
    fn:   () => sendPasswordResetOTPEmail(mockUser, "561038", 10),
  },
  {
    name: "5. Password Reset Success",
    fn:   () => sendPasswordResetSuccessEmail(mockUser),
  },
  {
    name: "6. Complaint Submitted",
    fn:   () => sendComplaintSubmittedEmail(mockUser, mockComplaint),
  },
  {
    name: "7. Complaint Status → In Progress",
    fn:   () => sendComplaintStatusUpdateEmail(
      mockUser,
      { ...mockComplaint, status: "in-progress" },
      "pending",
      "Our team is now working on your issue."
    ),
  },
  {
    name: "8. Complaint Resolved",
    fn:   () => sendComplaintResolvedEmail(
      mockUser,
      { ...mockComplaint, status: "resolved" },
      "Replaced the faulty bulb and checked the wiring."
    ),
  },
  {
    name: "9. Complaint Rejected",
    fn:   () => sendComplaintRejectedEmail(
      mockUser,
      { ...mockComplaint, status: "rejected" },
      mockComplaint.rejectionReason
    ),
  },
  {
    name: "10. Complaint Assigned to Staff",
    fn:   () => sendComplaintAssignedEmail(mockStaff, mockComplaint),
  },
];

const runTests = async () => {
  console.log(`\n🚀 Testing all email templates → sending to: ${TO}\n`);
  console.log("=".repeat(60));

  const arg    = process.argv[2];
  const toRun  = arg ? tests.filter((_, i) => String(i + 1) === arg) : tests;

  for (const test of toRun) {
    process.stdout.write(`📧 ${test.name} ... `);
    try {
      const result = await test.fn();
      if (result.success) {
        console.log(`✅ OK | ${result.messageId}`);
      } else if (result.skipped) {
        console.log("⚠️  Skipped (config missing)");
      } else {
        console.log(`❌ Failed:`, result.error);
      }
    } catch (err) {
      console.log(`💥 Error: ${err.message}`);
    }

    // Small delay between sends to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("=".repeat(60));
  console.log("\n✅ Done. Check your inbox.\n");
};

runTests();