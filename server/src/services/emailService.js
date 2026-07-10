// E:\CMS\server\src\services\emailService.js
const axios = require('axios');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendEmail = async ({ to, subject, htmlContent }) => {
  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: {
          name: process.env.EMAIL_SENDER_NAME || 'ComplaintSync',
          email: process.env.EMAIL_FROM,
        },
        to: [{ email: to }],
        subject,
        htmlContent,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
      }
    );

    console.log(`[Email] Sent to ${to} | Subject: "${subject}" | MessageId: ${response.data.messageId}`);
    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    console.error('[Email] Failed:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

// ── Email Templates ────────────────────────────────────────────────────────────

const emailTemplates = {

  // Sent to citizen after submitting a complaint
  complaintSubmitted: ({ complaintId, title, citizenName }) => ({
    subject: `Complaint Received – #${complaintId}`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px">
        <h2 style="color:#1a73e8">Complaint Received</h2>
        <p>Dear <strong>${citizenName}</strong>,</p>
        <p>Your complaint has been successfully submitted. Here are the details:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;width:40%">Complaint ID</td><td style="padding:8px">#${complaintId}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Title</td><td style="padding:8px">${title}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Status</td><td style="padding:8px"><span style="color:#f59e0b;font-weight:bold">Pending</span></td></tr>
        </table>
        <p>We will review your complaint and keep you updated on its progress.</p>
        <p style="color:#666;font-size:13px">— The ComplaintSync Team</p>
      </div>
    `,
  }),

  // Sent to citizen when complaint status changes
  statusUpdate: ({ complaintId, title, citizenName, oldStatus, newStatus, agentNote }) => ({
    subject: `Complaint #${complaintId} Status Updated – ${newStatus}`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px">
        <h2 style="color:#1a73e8">Complaint Status Updated</h2>
        <p>Dear <strong>${citizenName}</strong>,</p>
        <p>Your complaint status has been updated:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;width:40%">Complaint ID</td><td style="padding:8px">#${complaintId}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Title</td><td style="padding:8px">${title}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Previous Status</td><td style="padding:8px">${oldStatus}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">New Status</td><td style="padding:8px"><strong style="color:#1a73e8">${newStatus}</strong></td></tr>
          ${agentNote ? `<tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Agent Note</td><td style="padding:8px">${agentNote}</td></tr>` : ''}
        </table>
        <p style="color:#666;font-size:13px">— The ComplaintSync Team</p>
      </div>
    `,
  }),

  // Sent to agent when a complaint is assigned to them
  complaintAssigned: ({ complaintId, title, agentName, priority, category }) => ({
    subject: `New Complaint Assigned to You – #${complaintId}`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px">
        <h2 style="color:#1a73e8">New Complaint Assigned</h2>
        <p>Dear <strong>${agentName}</strong>,</p>
        <p>A new complaint has been assigned to you:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;width:40%">Complaint ID</td><td style="padding:8px">#${complaintId}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Title</td><td style="padding:8px">${title}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Category</td><td style="padding:8px">${category}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Priority</td><td style="padding:8px"><strong style="color:#ef4444">${priority}</strong></td></tr>
        </table>
        <p>Please log in to the dashboard to review and process this complaint.</p>
        <p style="color:#666;font-size:13px">— The ComplaintSync Team</p>
      </div>
    `,
  }),

  // Sent to citizen when complaint is resolved
  complaintResolved: ({ complaintId, title, citizenName, resolution }) => ({
    subject: `Complaint #${complaintId} Has Been Resolved`,
    htmlContent: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px">
        <h2 style="color:#16a34a">Complaint Resolved ✓</h2>
        <p>Dear <strong>${citizenName}</strong>,</p>
        <p>We are pleased to inform you that your complaint has been resolved:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;width:40%">Complaint ID</td><td style="padding:8px">#${complaintId}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Title</td><td style="padding:8px">${title}</td></tr>
          <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Resolution</td><td style="padding:8px">${resolution || 'Issue has been addressed.'}</td></tr>
        </table>
        <p>Thank you for using ComplaintSync. If you have further concerns, feel free to submit a new complaint.</p>
        <p style="color:#666;font-size:13px">— The ComplaintSync Team</p>
      </div>
    `,
  }),
};

// ── Convenience senders ────────────────────────────────────────────────────────

const sendComplaintSubmittedEmail = (to, data) => {
  const { subject, htmlContent } = emailTemplates.complaintSubmitted(data);
  return sendEmail({ to, subject, htmlContent });
};

const sendStatusUpdateEmail = (to, data) => {
  const { subject, htmlContent } = emailTemplates.statusUpdate(data);
  return sendEmail({ to, subject, htmlContent });
};

const sendComplaintAssignedEmail = (to, data) => {
  const { subject, htmlContent } = emailTemplates.complaintAssigned(data);
  return sendEmail({ to, subject, htmlContent });
};

const sendComplaintResolvedEmail = (to, data) => {
  const { subject, htmlContent } = emailTemplates.complaintResolved(data);
  return sendEmail({ to, subject, htmlContent });
};

module.exports = {
  sendEmail,
  sendComplaintSubmittedEmail,
  sendStatusUpdateEmail,
  sendComplaintAssignedEmail,
  sendComplaintResolvedEmail,
};