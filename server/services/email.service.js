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

const sendPasswordResetOTPEmail = async (user, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email credentials not configured. Skipping email.");
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from: `"ComplaintSync — MITM" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `${otp} is your ComplaintSync password reset code`,
    replyTo: process.env.EMAIL_USER,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "high",
    },
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        </head>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background:linear-gradient(135deg,#021135,#086ead);padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">ComplaintSync</h1>
                      <p style="margin:6px 0 0;color:#a5f3fc;font-size:13px;">MITM — Jayawanti Babu Foundation</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <p style="font-size:16px;color:#333;margin:0 0 8px;">Hello <strong>${user.name}</strong>,</p>
                      <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
                        You requested to reset your ComplaintSync account password. Use the verification code below. This code expires in <strong>10 minutes</strong>.
                      </p>
                      <div style="text-align:center;margin:32px 0;">
                        <div style="display:inline-block;background:#f0f9ff;border:2px solid #0ea0e9;border-radius:12px;padding:24px 48px;">
                          <p style="margin:0;font-size:12px;color:#0ea0e9;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Verification Code</p>
                          <p style="margin:12px 0 0;font-size:42px;font-weight:900;color:#021135;letter-spacing:12px;">${otp}</p>
                        </div>
                      </div>
                      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 12px;">
                        Enter this code on the ComplaintSync password reset page. Do not share this code with anyone.
                      </p>
                      <p style="font-size:13px;color:#999;margin:0;">
                        If you did not request this, you can safely ignore this email. Your password will not change.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#aaa;">
                        © ${new Date().getFullYear()} ComplaintSync — Metropolitan Institute of Technology & Management
                      </p>
                      <p style="margin:6px 0 0;font-size:11px;color:#ccc;">
                        This is an automated message. Please do not reply to this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
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

const sendPasswordResetSuccessEmail = async (user) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("Email credentials not configured. Skipping email.");
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from: `"ComplaintSync — MITM" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Your ComplaintSync password has been changed successfully",
    replyTo: process.env.EMAIL_USER,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "high",
    },
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        </head>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background:linear-gradient(135deg,#021135,#086ead);padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">ComplaintSync</h1>
                      <p style="margin:6px 0 0;color:#a5f3fc;font-size:13px;">MITM — Jayawanti Babu Foundation</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <div style="text-align:center;margin-bottom:28px;">
                        <div style="display:inline-block;background:#f0fdf4;border:2px solid #22c55e;border-radius:50%;width:64px;height:64px;line-height:64px;text-align:center;">
                          <span style="font-size:32px;">✓</span>
                        </div>
                      </div>
                      <p style="font-size:16px;color:#333;margin:0 0 12px;text-align:center;">
                        Hello <strong>${user.name}</strong>,
                      </p>
                      <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;text-align:center;">
                        Your ComplaintSync account password has been successfully changed. You can now log in with your new password.
                      </p>
                      <div style="text-align:center;margin:24px 0;">
                        <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/auth"
                           style="background:linear-gradient(to right,#0f78c8,#3805d1);color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:700;display:inline-block;">
                          Login to ComplaintSync
                        </a>
                      </div>
                      <div style="background:#fff8f0;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin-top:24px;">
                        <p style="font-size:13px;color:#c2410c;margin:0;line-height:1.6;">
                          <strong>⚠ Not you?</strong> If you did not make this change, contact your administrator immediately or request another password reset.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#aaa;">
                        © ${new Date().getFullYear()} ComplaintSync — Metropolitan Institute of Technology & Management
                      </p>
                      <p style="margin:6px 0 0;font-size:11px;color:#ccc;">
                        This is an automated message. Please do not reply to this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
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
module.exports = {
  sendStaffWelcomeEmail,
  sendPasswordResetOTPEmail,
  sendPasswordResetSuccessEmail,
};
