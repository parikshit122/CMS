const nodemailer = require("nodemailer");

// ── Transporter with pooled connections ───────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  requireTLS: true,      // Force TLS upgrade
  tls: {
    rejectUnauthorized: false,
    ciphers: "SSLv3",
  },
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
  connectionTimeout: 30000,   // 30 seconds — Render is slower
  greetingTimeout: 30000,
  socketTimeout: 45000,
});

// ── Verify transporter on startup ─────────────────────────
transporter.verify((error) => {
  if (error) {
    console.error("❌ Email transporter failed:", error.message);
  } else {
    console.log("✅ Email transporter ready");
  }
});

// ── Helper: send with logging ─────────────────────────────
const sendMailWithLog = async (mailOptions, label) => {
  console.log(`📧 [${label}] Sending to: ${mailOptions.to}`);

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`⚠️  [${label}] EMAIL not configured — skipping`);
    return { success: false, skipped: true };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [${label}] Sent to ${mailOptions.to} — ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [${label}] FAILED to ${mailOptions.to}: ${err.message}`);
    console.error(`   Full error:`, err);
    return { success: false, error: err.message };
  }
};

// ── Staff welcome email ──────────────────────────────────
const sendStaffWelcomeEmail = async (staff, plainPassword) => {
  const mailOptions = {
    from: `"ComplaintSync Admin" <${process.env.EMAIL_USER}>`,
    to: staff.email,
    subject: "Welcome to ComplaintSync — Your Staff Account",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
        <h2 style="color:#6366f1;">Welcome, ${staff.name}!</h2>
        <p>An account has been created for you on <strong>ComplaintSync</strong>.</p>
        <p>You have been added as a <strong>${staff.category || "Staff"}</strong> member.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
          <p style="margin:4px 0;"><strong>Email:</strong> ${staff.email}</p>
          <p style="margin:4px 0;"><strong>Password:</strong> <code style="background:#fff;padding:4px 8px;border-radius:4px;">${plainPassword}</code></p>
        </div>
        <p style="color:#ef4444;"><strong>Important:</strong> Please change your password after first login.</p>
        <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/auth"
           style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">
          Login Now
        </a>
        <p style="margin-top:24px;color:#8a94a6;font-size:13px;">
          If you have any questions, contact your admin.
        </p>
      </div>
    `,
  };

  return sendMailWithLog(mailOptions, "Staff Welcome");
};

// ── Password reset OTP ───────────────────────────────────
const sendPasswordResetOTPEmail = async (
  user,
  otp,
  expiryMinutes = 10,
  senderName = "ComplaintSync — MITM"
) => {
  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `${otp} is your ${senderName} password reset code`,
    replyTo: process.env.EMAIL_USER,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "high",
    },
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#021135,#086ead);padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:24px;">${senderName}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <p style="font-size:16px;color:#333;margin:0 0 8px;">Hello <strong>${user.name}</strong>,</p>
                    <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
                      You requested to reset your password. Use the code below.
                      Expires in <strong>${expiryMinutes} minute${expiryMinutes !== 1 ? "s" : ""}</strong>.
                    </p>
                    <div style="text-align:center;margin:32px 0;">
                      <div style="display:inline-block;background:#f0f9ff;border:2px solid #0ea0e9;border-radius:12px;padding:24px 48px;">
                        <p style="margin:0;font-size:12px;color:#0ea0e9;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Verification Code</p>
                        <p style="margin:12px 0 0;font-size:42px;font-weight:900;color:#021135;letter-spacing:12px;">${otp}</p>
                      </div>
                    </div>
                    <p style="font-size:14px;color:#555;line-height:1.6;">Do not share this code with anyone.</p>
                    <p style="font-size:13px;color:#999;">If you did not request this, ignore this email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} ${senderName}</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  };

  return sendMailWithLog(mailOptions, "Password Reset OTP");
};

// ── Password reset success ────────────────────────────────
const sendPasswordResetSuccessEmail = async (
  user,
  senderName = "ComplaintSync — MITM"
) => {
  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Your password has been changed successfully`,
    replyTo: process.env.EMAIL_USER,
    html: `
      <div style="font-family:Arial;padding:40px;text-align:center;background:#f4f4f4;">
        <div style="background:#fff;padding:40px;border-radius:8px;max-width:500px;margin:auto;">
          <div style="width:64px;height:64px;line-height:64px;background:#f0fdf4;border:2px solid #22c55e;border-radius:50%;margin:auto;">
            <span style="font-size:32px;">✓</span>
          </div>
          <p style="margin:20px 0;">Hello <strong>${user.name}</strong>,</p>
          <p>Your password has been successfully changed. You can now log in with your new password.</p>
        </div>
      </div>
    `,
  };

  return sendMailWithLog(mailOptions, "Password Reset Success");
};

const sendEmailVerificationOTP = async (
  user,
  otp,
  expiryMinutes = 10,
  senderName = "ComplaintSync"
) => {
  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Your verification code is ${otp}`,
    replyTo: process.env.EMAIL_USER,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "high",
    },
    text: `Hello ${user.name}, Your verification code is: ${otp}. Expires in ${expiryMinutes} minutes.`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#021135,#086ead);padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:24px;">${senderName}</h1>
                    <p style="margin:8px 0 0;color:#c9e0ff;font-size:14px;">Email Verification</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <p style="font-size:16px;color:#333;margin:0 0 8px;">Hello <strong>${user.name}</strong>,</p>
                    <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
                      Please use the verification code below to complete your registration.
                      Expires in <strong>${expiryMinutes} minutes</strong>.
                    </p>
                    <div style="text-align:center;margin:32px 0;">
                      <div style="display:inline-block;background:#f0f9ff;border:2px solid #0ea0e9;border-radius:12px;padding:24px 48px;">
                        <p style="margin:0;font-size:12px;color:#0ea0e9;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Verification Code</p>
                        <p style="margin:12px 0 0;font-size:42px;font-weight:900;color:#021135;letter-spacing:12px;">${otp}</p>
                      </div>
                    </div>
                    <p style="font-size:14px;color:#555;">Do not share this code with anyone.</p>
                    <p style="font-size:13px;color:#999;">If you did not create an account, ignore this email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} ${senderName}</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  };

  return sendMailWithLog(mailOptions, "Verification OTP");
};

// ── Email verified success ────────────────────────────────
const sendEmailVerifiedSuccessEmail = async (
  user,
  senderName = "ComplaintSync"
) => {
  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Welcome to ${senderName}! Your email is verified ✅`,
    html: `
      <div style="font-family:Arial;padding:40px;text-align:center;background:#f4f4f4;">
        <div style="background:#fff;padding:40px;border-radius:8px;max-width:500px;margin:auto;">
          <div style="width:80px;height:80px;line-height:80px;background:#f0fdf4;border:2px solid #22c55e;border-radius:50%;margin:auto;">
            <span style="font-size:40px;">✓</span>
          </div>
          <h2 style="margin:20px 0 12px;color:#333;">Welcome, ${user.name}!</h2>
          <p style="color:#555;">Your email has been successfully verified.</p>
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/auth"
             style="display:inline-block;background:#0ea0e9;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:20px;">
            Login to Your Account
          </a>
        </div>
      </div>
    `,
  };

  return sendMailWithLog(mailOptions, "Email Verified Success");
};

// ── Complaint assigned email ──────────────────────────────
const sendComplaintAssignedEmail = async (
  student,
  complaint,
  staff,
  senderName = "ComplaintSync"
) => {
  if (!student?.email) {
    console.warn("⚠️  [Complaint Assigned] No student email — skipping");
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: `Your complaint has been assigned — ${complaint.complaintId || complaint._id}`,
    html: `
      <div style="font-family:Arial;padding:40px;background:#f4f4f4;">
        <div style="background:#fff;padding:32px;border-radius:8px;max-width:600px;margin:auto;">
          <h2 style="color:#021135;">Complaint Assigned</h2>
          <p>Hello <strong>${student.name}</strong>,</p>
          <p>Your complaint has been assigned to <strong>${staff.name}</strong>.</p>
          <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
            <p><strong>ID:</strong> ${complaint.complaintId || complaint._id}</p>
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Category:</strong> ${complaint.category}</p>
            <p><strong>Priority:</strong> ${(complaint.priority || "medium").toUpperCase()}</p>
          </div>
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/complaints"
             style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
            Track My Complaint
          </a>
        </div>
      </div>
    `,
  };

  return sendMailWithLog(mailOptions, "Complaint Assigned");
};

// ── Complaint resolved email ──────────────────────────────
const sendComplaintResolvedEmail = async (
  student,
  complaint,
  staff,
  senderName = "ComplaintSync"
) => {
  if (!student?.email) {
    console.warn("⚠️  [Complaint Resolved] No student email — skipping");
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: `✅ Complaint Resolved — ${complaint.complaintId || complaint._id}`,
    html: `
      <div style="font-family:Arial;padding:40px;background:#f4f4f4;">
        <div style="background:#fff;padding:32px;border-radius:8px;max-width:600px;margin:auto;">
          <div style="text-align:center;">
            <div style="width:56px;height:56px;line-height:56px;background:#f0fdf4;border:2px solid #22c55e;border-radius:50%;margin:auto;">
              <span style="font-size:28px;">✓</span>
            </div>
            <h2 style="color:#059669;margin-top:16px;">Complaint Resolved</h2>
          </div>
          <p>Hello <strong>${student.name}</strong>,</p>
          <p>Great news! Your complaint has been resolved by <strong>${staff.name}</strong>.</p>
          <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #bbf7d0;">
            <p><strong>ID:</strong> ${complaint.complaintId || complaint._id}</p>
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Resolved On:</strong> ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
          </div>
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/complaints"
             style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
            View My Complaints
          </a>
        </div>
      </div>
    `,
  };

  return sendMailWithLog(mailOptions, "Complaint Resolved");
};

// ── Complaint rejected email ──────────────────────────────
const sendComplaintRejectedEmail = async (
  student,
  complaint,
  rejectedBy,
  senderName = "ComplaintSync"
) => {
  if (!student?.email) {
    console.warn("⚠️  [Complaint Rejected] No student email — skipping");
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: `Complaint Update — ${complaint.complaintId || complaint._id}`,
    html: `
      <div style="font-family:Arial;padding:40px;background:#f4f4f4;">
        <div style="background:#fff;padding:32px;border-radius:8px;max-width:600px;margin:auto;">
          <h2 style="color:#991b1b;">Complaint Update</h2>
          <p>Hello <strong>${student.name}</strong>,</p>
          <p>After careful review, your complaint could not be processed at this time.</p>
          <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;border:1px solid #fecaca;">
            <p><strong>ID:</strong> ${complaint.complaintId || complaint._id}</p>
            <p><strong>Title:</strong> ${complaint.title}</p>
            <p><strong>Reviewed By:</strong> ${rejectedBy.name}</p>
          </div>
          ${complaint.rejectionReason ? `
            <div style="background:#fff7ed;border-left:4px solid #f59e0b;padding:16px;margin:16px 0;">
              <p style="margin:0;font-size:12px;color:#92400e;font-weight:700;text-transform:uppercase;">Reason for Rejection</p>
              <p style="margin:8px 0 0;color:#0f172a;">${complaint.rejectionReason}</p>
            </div>
          ` : ""}
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/submit"
             style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">
            Submit New Complaint
          </a>
        </div>
      </div>
    `,
  };

  return sendMailWithLog(mailOptions, "Complaint Rejected");
};

module.exports = {
  sendStaffWelcomeEmail,
  sendPasswordResetOTPEmail,
  sendPasswordResetSuccessEmail,
  sendEmailVerificationOTP,
  sendEmailVerifiedSuccessEmail,
  sendComplaintAssignedEmail,
  sendComplaintResolvedEmail,
  sendComplaintRejectedEmail,
};