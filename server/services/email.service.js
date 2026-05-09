const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendStaffWelcomeEmail = async (staff, plainPassword) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email credentials not configured. Skipping email.");
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from: `"ComplaintSync Admin" <${process.env.EMAIL_USER}>`,
    to: staff.email,
    subject: "Welcome to ComplaintSync — Your Staff Account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #6366f1;">Welcome, ${staff.name}!</h2>
        <p>An account has been created for you on <strong>ComplaintSync</strong>.</p>
        <p>You have been added as a <strong>${staff.category || "Staff"}</strong> member.</p>

        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Email:</strong> ${staff.email}</p>
          <p style="margin: 4px 0;"><strong>Password:</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px;">${plainPassword}</code></p>
        </div>

        <p style="color: #ef4444;"><strong>Important:</strong> Please change your password after first login.</p>

        <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/auth"
           style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Login Now
        </a>

        <p style="margin-top: 24px; color: #8a94a6; font-size: 13px;">
          If you have any questions, contact your admin.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    console.error("Email send error:", err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendStaffWelcomeEmail };