"use strict";

const axios = require("axios");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

console.log("📧 [EmailService] Config Check:");
console.log("   BREVO_API_KEY:", process.env.BREVO_API_KEY ? `✅ Set (${process.env.BREVO_API_KEY.length} chars)` : "❌ MISSING");
console.log("   EMAIL_FROM:", process.env.EMAIL_FROM || "❌ not set");
console.log("   EMAIL_SENDER_NAME:", process.env.EMAIL_SENDER_NAME || "❌ not set");

const sendMail = async (to, subject, html, label = "Email") => {
  const senderEmail = process.env.EMAIL_FROM;
  const senderName = process.env.EMAIL_SENDER_NAME || "ComplaintSync";

  if (!process.env.BREVO_API_KEY) {
    console.warn(`⚠️  [${label}] BREVO_API_KEY not set — skipping`);
    return { success: false, skipped: true };
  }

  if (!senderEmail) {
    console.warn(`⚠️  [${label}] EMAIL_FROM not set — skipping`);
    return { success: false, skipped: true };
  }

  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        timeout: 15000,
      }
    );

    console.log(`✅ [${label}] Sent to ${to} | MessageId: ${response.data.messageId}`);
    return { success: true, messageId: response.data.messageId };
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    console.error(`❌ [${label}] Failed to send to ${to}:`, errorMsg);
    if (err.response?.data) {
      console.error(`   Details:`, JSON.stringify(err.response.data));
    }
    return { success: false, error: errorMsg };
  }
};

const layout = (content, senderName = "ComplaintSync") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${senderName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;
                 box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);
                        padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;
                          letter-spacing:0.5px;">
                ${senderName}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;
                        border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                This is an automated message from <strong>${senderName}</strong>.<br/>
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const infoRow = (label, value) => `
  <tr>
    <td style="padding:10px 12px;background:#f8fafc;font-weight:600;
                color:#374151;width:40%;border-bottom:1px solid #e2e8f0;
                font-size:14px;">
      ${label}
    </td>
    <td style="padding:10px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;
                font-size:14px;">
      ${value}
    </td>
  </tr>`;

const infoTable = (rows) => `
  <table width="100%" cellpadding="0" cellspacing="0"
    style="border:1px solid #e2e8f0;border-radius:8px;
           overflow:hidden;margin:20px 0;border-collapse:collapse;">
    ${rows}
  </table>`;

const statusBadge = (status) => {
  const map = {
    pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
    "in-progress": { bg: "#dbeafe", color: "#1e40af", label: "In Progress" },
    resolved: { bg: "#d1fae5", color: "#065f46", label: "Resolved" },
    rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
  };
  const s = map[status?.toLowerCase()] || { bg: "#f1f5f9", color: "#475569", label: status };
  return `<span style="background:${s.bg};color:${s.color};padding:4px 12px;
    border-radius:20px;font-size:12px;font-weight:700;
    text-transform:uppercase;letter-spacing:0.5px;">${s.label}</span>`;
};

const priorityBadge = (priority) => {
  const map = {
    low: { color: "#059669", label: "Low" },
    medium: { color: "#d97706", label: "Medium" },
    high: { color: "#dc2626", label: "High" },
    urgent: { color: "#7c3aed", label: "Urgent" },
  };
  const p = map[priority?.toLowerCase()] || { color: "#6b7280", label: priority };
  return `<strong style="color:${p.color};">${p.label}</strong>`;
};

const divider = () =>
  `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>`;

const greeting = (name) =>
  `<p style="margin:0 0 16px;color:#1e293b;font-size:16px;">
    Dear <strong>${name || "User"}</strong>,
  </p>`;

const signOff = (senderName = "ComplaintSync") =>
  `<p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
    Warm regards,<br/>
    <strong style="color:#4f46e5;">The ${senderName} Team</strong>
  </p>`;

const sendEmailVerificationOTP = async (user, otp, expiryMinutes = 10, senderName) => {
  const name = user.name || "User";
  const sender = senderName || process.env.EMAIL_SENDER_NAME || "ComplaintSync";

  const content = `
    ${greeting(name)}
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      Welcome to <strong>${sender}</strong>! To complete your registration,
      please verify your email address using the OTP below.
    </p>
    <div style="background:linear-gradient(135deg,#f0f0ff,#e8e8ff);
                border:2px solid #6366f1;border-radius:12px;
                padding:28px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 8px;color:#4f46e5;font-size:13px;
                font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Your Verification Code
      </p>
      <div style="font-size:42px;font-weight:800;color:#4f46e5;
                  letter-spacing:10px;font-family:monospace;margin:8px 0;">
        ${otp}
      </div>
      <p style="margin:8px 0 0;color:#6b7280;font-size:13px;">
        ⏱ Expires in <strong>${expiryMinutes} minutes</strong>
      </p>
    </div>
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;
                border-radius:4px;padding:12px 16px;margin:20px 0;">
      <p style="margin:0;color:#92400e;font-size:13px;">
        🔒 <strong>Security Notice:</strong> Never share this code with anyone.
        Our team will never ask for your OTP.
      </p>
    </div>
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">
      If you did not create an account, please ignore this email.
    </p>
    ${signOff(sender)}`;

  return sendMail(
    user.email,
    `Verify Your Email – ${sender}`,
    layout(content, sender),
    "EmailVerificationOTP"
  );
};

const sendEmailVerifiedSuccessEmail = async (user, senderName) => {
  const name = user.name || "User";
  const sender = senderName || process.env.EMAIL_SENDER_NAME || "ComplaintSync";

  const content = `
    ${greeting(name)}
    <div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);
                border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <div style="font-size:48px;margin-bottom:8px;">✅</div>
      <h2 style="margin:0;color:#065f46;font-size:20px;font-weight:700;">
        Email Verified Successfully!
      </h2>
      <p style="margin:8px 0 0;color:#047857;font-size:14px;">
        Your account is now active and ready to use.
      </p>
    </div>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
      You can now log in and start using <strong>${sender}</strong> to submit
      and track your complaints.
    </p>
    ${infoTable(
      infoRow("Name", name) +
      infoRow("Email", user.email) +
      infoRow("Status", "✅ Verified")
    )}
    ${divider()}
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
      If you have any questions or need help getting started, feel free to
      reach out to our support team.
    </p>
    ${signOff(sender)}`;

  return sendMail(
    user.email,
    `Welcome to ${sender} – Account Verified!`,
    layout(content, sender),
    "EmailVerifiedSuccess"
  );
};

const sendPasswordResetOTPEmail = async (user, otp, expiryMinutes = 10, senderName) => {
  const name = user.name || "User";
  const sender = senderName || process.env.EMAIL_SENDER_NAME || "ComplaintSync";

  const content = `
    ${greeting(name)}
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      We received a request to reset your password. Use the OTP below to
      proceed. If you did not make this request, you can safely ignore this email.
    </p>
    <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);
                border:2px solid #f97316;border-radius:12px;
                padding:28px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 8px;color:#c2410c;font-size:13px;
                font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Password Reset OTP
      </p>
      <div style="font-size:42px;font-weight:800;color:#ea580c;
                  letter-spacing:10px;font-family:monospace;margin:8px 0;">
        ${otp}
      </div>
      <p style="margin:8px 0 0;color:#6b7280;font-size:13px;">
        ⏱ Expires in <strong>${expiryMinutes} minutes</strong>
      </p>
    </div>
    <div style="background:#fee2e2;border-left:4px solid #ef4444;
                border-radius:4px;padding:12px 16px;margin:20px 0;">
      <p style="margin:0;color:#991b1b;font-size:13px;">
        ⚠️ <strong>Warning:</strong> Do not share this OTP with anyone.
        This code can be used to change your password.
      </p>
    </div>
    ${infoTable(
      infoRow("Account", user.email) +
      infoRow("Requested", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })) +
      infoRow("Expires in", `${expiryMinutes} minutes`)
    )}
    <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">
      If you did not request a password reset, please secure your account
      immediately by contacting support.
    </p>
    ${signOff(sender)}`;

  return sendMail(
    user.email,
    `Password Reset OTP – ${sender}`,
    layout(content, sender),
    "PasswordResetOTP"
  );
};

const sendPasswordResetSuccessEmail = async (user, senderName) => {
  const name = user.name || "User";
  const sender = senderName || process.env.EMAIL_SENDER_NAME || "ComplaintSync";

  const content = `
    ${greeting(name)}
    <div style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);
                border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <div style="font-size:48px;margin-bottom:8px;">🔐</div>
      <h2 style="margin:0;color:#1e40af;font-size:20px;font-weight:700;">
        Password Reset Successful
      </h2>
      <p style="margin:8px 0 0;color:#1d4ed8;font-size:14px;">
        Your password has been updated successfully.
      </p>
    </div>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      This is a confirmation that the password for your account has been
      successfully changed.
    </p>
    ${infoTable(
      infoRow("Account", user.email) +
      infoRow("Changed", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })) +
      infoRow("Status", "✅ Password Updated")
    )}
    <div style="background:#fee2e2;border-left:4px solid #ef4444;
                border-radius:4px;padding:12px 16px;margin:20px 0;">
      <p style="margin:0;color:#991b1b;font-size:13px;">
        🚨 <strong>Not you?</strong> If you did not change your password,
        your account may be compromised. Contact support immediately.
      </p>
    </div>
    ${signOff(sender)}`;

  return sendMail(
    user.email,
    `Password Changed Successfully – ${sender}`,
    layout(content, sender),
    "PasswordResetSuccess"
  );
};

const sendComplaintSubmittedEmail = async (user, complaint, senderName) => {
  const name = user.name || "User";
  const sender = senderName || process.env.EMAIL_SENDER_NAME || "ComplaintSync";

  const content = `
    ${greeting(name)}
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      Your complaint has been <strong>successfully submitted</strong>.
      We will review it and keep you updated on its progress.
    </p>
    ${infoTable(
      infoRow("Complaint ID", `<strong style="color:#4f46e5;">${complaint.complaintId}</strong>`) +
      infoRow("Title", complaint.title) +
      infoRow("Category", complaint.category) +
      infoRow("Priority", priorityBadge(complaint.priority)) +
      infoRow("Status", statusBadge("pending")) +
      infoRow("Submitted", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))
    )}
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;
                border-radius:4px;padding:12px 16px;margin:20px 0;">
      <p style="margin:0;color:#1e40af;font-size:13px;">
        📋 <strong>What happens next?</strong><br/>
        Our team will review your complaint and assign it to the appropriate
        staff member. You will receive email updates at every step.
      </p>
    </div>
    ${signOff(sender)}`;

  return sendMail(
    user.email,
    `Complaint Received – ${complaint.complaintId} | ${sender}`,
    layout(content, sender),
    "ComplaintSubmitted"
  );
};

const sendComplaintStatusUpdateEmail = async (user, complaint, oldStatus, note, senderName) => {
  const name = user.name || "User";
  const sender = senderName || process.env.EMAIL_SENDER_NAME || "ComplaintSync";
  const newStatus = complaint.status;

  const content = `
    ${greeting(name)}
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      The status of your complaint has been updated.
    </p>
    ${infoTable(
      infoRow("Complaint ID", `<strong style="color:#4f46e5;">${complaint.complaintId}</strong>`) +
      infoRow("Title", complaint.title) +
      infoRow("Previous Status", statusBadge(oldStatus)) +
      infoRow("New Status", statusBadge(newStatus)) +
      infoRow("Updated", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })) +
      (note ? infoRow("Staff Note", `<em>${note}</em>`) : "")
    )}
    ${newStatus === "rejected" ? `
    <div style="background:#fee2e2;border-left:4px solid #ef4444;
                border-radius:4px;padding:12px 16px;margin:20px 0;">
      <p style="margin:0;color:#991b1b;font-size:13px;">
        ❌ <strong>Complaint Rejected.</strong>
        If you believe this was rejected in error, please submit a new
        complaint with additional details.
      </p>
    </div>` : ""}
    ${newStatus === "in-progress" ? `
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;
                border-radius:4px;padding:12px 16px;margin:20px 0;">
      <p style="margin:0;color:#1e40af;font-size:13px;">
        🔧 <strong>Your complaint is being worked on.</strong>
        Our staff is actively addressing your issue.
      </p>
    </div>` : ""}
    ${signOff(sender)}`;

  return sendMail(
    user.email,
    `Complaint ${complaint.complaintId} – Status Updated to ${newStatus} | ${sender}`,
    layout(content, sender),
    "ComplaintStatusUpdate"
  );
};

const sendComplaintResolvedEmail = async (user, complaint, note, senderName) => {
  const name = user.name || "User";
  const sender = senderName || process.env.EMAIL_SENDER_NAME || "ComplaintSync";

  const content = `
    ${greeting(name)}
    <div style="background:linear-gradient(135deg,#d1fae5,#a7f3d0);
                border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <div style="font-size:48px;margin-bottom:8px;">🎉</div>
      <h2 style="margin:0;color:#065f46;font-size:20px;font-weight:700;">
        Complaint Resolved!
      </h2>
      <p style="margin:8px 0 0;color:#047857;font-size:14px;">
        Your issue has been successfully addressed.
      </p>
    </div>
    ${infoTable(
      infoRow("Complaint ID", `<strong style="color:#4f46e5;">${complaint.complaintId}</strong>`) +
      infoRow("Title", complaint.title) +
      infoRow("Category", complaint.category) +
      infoRow("Status", statusBadge("resolved")) +
      infoRow("Resolved On", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })) +
      (note ? infoRow("Resolution Note", `<em>${note}</em>`) : "")
    )}
    <p style="margin:20px 0 0;color:#475569;font-size:14px;line-height:1.6;">
      Thank you for using <strong>${sender}</strong>. Your feedback helps us
      improve our services. If you experience this issue again or have further
      concerns, please submit a new complaint.
    </p>
    ${signOff(sender)}`;

  return sendMail(
    user.email,
    `Complaint Resolved – ${complaint.complaintId} | ${sender}`,
    layout(content, sender),
    "ComplaintResolved"
  );
};

const sendComplaintAssignedEmail = async (staffUser, complaint, senderName) => {
  const name = staffUser.name || "Staff";
  const sender = senderName || process.env.EMAIL_SENDER_NAME || "ComplaintSync";

  const content = `
    ${greeting(name)}
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      A new complaint has been <strong>assigned to you</strong>.
      Please review the details below and take appropriate action.
    </p>
    ${infoTable(
      infoRow("Complaint ID", `<strong style="color:#4f46e5;">${complaint.complaintId}</strong>`) +
      infoRow("Title", complaint.title) +
      infoRow("Description", complaint.description?.substring(0, 200) + (complaint.description?.length > 200 ? "..." : "")) +
      infoRow("Category", complaint.category) +
      infoRow("Priority", priorityBadge(complaint.priority)) +
      infoRow("Status", statusBadge(complaint.status)) +
      (complaint.location ? infoRow("Location", complaint.location) : "") +
      infoRow("Assigned On", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))
    )}
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;
                border-radius:4px;padding:12px 16px;margin:20px 0;">
      <p style="margin:0;color:#1e40af;font-size:13px;">
        📌 <strong>Action Required:</strong> Please log in to the
        ${sender} dashboard to review and process this complaint.
      </p>
    </div>
    ${signOff(sender)}`;

  return sendMail(
    staffUser.email,
    `New Complaint Assigned – ${complaint.complaintId} | ${sender}`,
    layout(content, sender),
    "ComplaintAssigned"
  );
};

const sendComplaintRejectedEmail = async (user, complaint, reason, senderName) => {
  const name = user.name || "User";
  const sender = senderName || process.env.EMAIL_SENDER_NAME || "ComplaintSync";

  const content = `
    ${greeting(name)}
    <div style="background:linear-gradient(135deg,#fee2e2,#fecaca);
                border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <div style="font-size:48px;margin-bottom:8px;">❌</div>
      <h2 style="margin:0;color:#991b1b;font-size:20px;font-weight:700;">
        Complaint Rejected
      </h2>
    </div>
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      After reviewing your complaint, we were unable to process it at this time.
    </p>
    ${infoTable(
      infoRow("Complaint ID", `<strong style="color:#4f46e5;">${complaint.complaintId}</strong>`) +
      infoRow("Title", complaint.title) +
      infoRow("Status", statusBadge("rejected")) +
      infoRow("Reason", reason || complaint.rejectionReason || "Does not meet the submission criteria.") +
      infoRow("Date", new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))
    )}
    <p style="margin:20px 0 0;color:#475569;font-size:14px;line-height:1.6;">
      If you believe this decision is incorrect or have additional information
      to provide, please submit a new complaint with more details.
    </p>
    ${signOff(sender)}`;

  return sendMail(
    user.email,
    `Complaint Rejected – ${complaint.complaintId} | ${sender}`,
    layout(content, sender),
    "ComplaintRejected"
  );
};

const sendWelcomeEmail = async (user, otp, expiryMinutes = 10, senderName) => {
  const name = user.name || "User";
  const sender = senderName || process.env.EMAIL_SENDER_NAME || "ComplaintSync";

  const content = `
    ${greeting(name)}
    <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
      Welcome to <strong>${sender}</strong>! We're glad you joined us.
      To activate your account, please verify your email address using
      the one-time code below.
    </p>
    <div style="background:linear-gradient(135deg,#f0f0ff,#e8e8ff);
                border:2px solid #6366f1;border-radius:12px;
                padding:28px;text-align:center;margin:24px 0;">
      <p style="margin:0 0 8px;color:#4f46e5;font-size:13px;
                font-weight:600;text-transform:uppercase;letter-spacing:1px;">
        Email Verification Code
      </p>
      <div style="font-size:42px;font-weight:800;color:#4f46e5;
                  letter-spacing:10px;font-family:monospace;margin:8px 0;">
        ${otp}
      </div>
      <p style="margin:8px 0 0;color:#6b7280;font-size:13px;">
        ⏱ Expires in <strong>${expiryMinutes} minutes</strong>
      </p>
    </div>
    ${infoTable(
      infoRow("Name", name) +
      infoRow("Email", user.email) +
      infoRow("Role", user.role || "user")
    )}
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;
                border-radius:4px;padding:12px 16px;margin:20px 0;">
      <p style="margin:0;color:#92400e;font-size:13px;">
        🔒 <strong>Security Notice:</strong> Never share this code with anyone.
      </p>
    </div>
    ${signOff(sender)}`;

  return sendMail(
    user.email,
    `Welcome to ${sender} – Verify Your Email`,
    layout(content, sender),
    "WelcomeWithOTP"
  );
};

module.exports = {
  sendMail,
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
};