const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

const sendStaffWelcomeEmail = async (staff, plainPassword) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
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
    return { success: false, error: err.message };
  }
};

const sendPasswordResetOTPEmail = async (
  user,
  otp,
  expiryMinutes = 10,
  senderName = "ComplaintSync — MITM",
) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { success: false, skipped: true };
  }

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
                      <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">${senderName}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <p style="font-size:16px;color:#333;margin:0 0 8px;">Hello <strong>${user.name}</strong>,</p>
                      <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
                        You requested to reset your password. Use the verification code below. This code expires in <strong>${expiryMinutes} minute${expiryMinutes !== 1 ? "s" : ""}</strong>.
                      </p>
                      <div style="text-align:center;margin:32px 0;">
                        <div style="display:inline-block;background:#f0f9ff;border:2px solid #0ea0e9;border-radius:12px;padding:24px 48px;">
                          <p style="margin:0;font-size:12px;color:#0ea0e9;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Verification Code</p>
                          <p style="margin:12px 0 0;font-size:42px;font-weight:900;color:#021135;letter-spacing:12px;">${otp}</p>
                        </div>
                      </div>
                      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 12px;">
                        Enter this code on the password reset page. Do not share this code with anyone.
                      </p>
                      <p style="font-size:13px;color:#999;margin:0;">
                        If you did not request this, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
                      <p style="margin:0;font-size:12px;color:#aaa;">
                        © ${new Date().getFullYear()} ${senderName}
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
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const sendPasswordResetSuccessEmail = async (
  user,
  senderName = "ComplaintSync — MITM",
) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Your password has been changed successfully`,
    replyTo: process.env.EMAIL_USER,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
                  <tr>
                    <td style="background:linear-gradient(135deg,#021135,#086ead);padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:24px;">${senderName}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;text-align:center;">
                      <div style="display:inline-block;background:#f0fdf4;border:2px solid #22c55e;border-radius:50%;width:64px;height:64px;line-height:64px;margin-bottom:20px;">
                        <span style="font-size:32px;">✓</span>
                      </div>
                      <p style="font-size:16px;color:#333;margin:0 0 12px;">Hello <strong>${user.name}</strong>,</p>
                      <p style="font-size:15px;color:#555;line-height:1.6;">
                        Your password has been successfully changed. You can now log in with your new password.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
                      <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} ${senderName}</p>
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
    return { success: false, error: err.message };
  }
};

const sendEmailVerificationOTP = async (
  user,
  otp,
  expiryMinutes = 10,
  senderName = "ComplaintSync",
) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Your verification code is ${otp}`,
    replyTo: process.env.EMAIL_USER,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
      Importance: "high",
      "X-Mailer": "ComplaintSync Mailer",
      "List-Unsubscribe": `<mailto:${process.env.EMAIL_USER}?subject=unsubscribe>`,
      Precedence: "bulk",
    },
    text: `
      Hello ${user.name},
      Your verification code is: ${otp}
      This code expires in ${expiryMinutes} minutes.
      If you did not request this, ignore this email.
      © ${new Date().getFullYear()} ${senderName}
    `,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Verify your email</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background:linear-gradient(135deg,#021135,#086ead);padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">${senderName}</h1>
                      <p style="margin:8px 0 0;color:#c9e0ff;font-size:14px;">Email Verification</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <p style="font-size:16px;color:#333;margin:0 0 8px;">
                        Hello <strong>${user.name}</strong>,
                      </p>
                      <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
                        Please use the verification code below to complete your registration.
                        This code expires in <strong>${expiryMinutes} minutes</strong>.
                      </p>
                      <div style="text-align:center;margin:32px 0;">
                        <div style="display:inline-block;background:#f0f9ff;border:2px solid #0ea0e9;border-radius:12px;padding:24px 48px;">
                          <p style="margin:0;font-size:12px;color:#0ea0e9;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
                            Verification Code
                          </p>
                          <p style="margin:12px 0 0;font-size:42px;font-weight:900;color:#021135;letter-spacing:12px;">
                            ${otp}
                          </p>
                        </div>
                      </div>
                      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 12px;">
                        Do not share this code with anyone.
                      </p>
                      <p style="font-size:13px;color:#999;margin:0;">
                        If you did not create an account, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
                      <p style="margin:0 0 4px;font-size:12px;color:#aaa;">
                        © ${new Date().getFullYear()} ${senderName}. All rights reserved.
                      </p>
                      <p style="margin:0;font-size:11px;color:#ccc;">
                        This is an automated message. Please do not reply directly.
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
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const sendEmailVerifiedSuccessEmail = async (
  user,
  senderName = "ComplaintSync",
) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Welcome to ${senderName}! Your email is verified ✅`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
                  <tr>
                    <td style="background:linear-gradient(135deg,#10b981,#059669);padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:24px;">${senderName}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;text-align:center;">
                      <div style="display:inline-block;background:#f0fdf4;border:2px solid #22c55e;border-radius:50%;width:80px;height:80px;line-height:80px;margin-bottom:20px;">
                        <span style="font-size:40px;">✓</span>
                      </div>
                      <h2 style="margin:0 0 12px;color:#333;font-size:22px;">Welcome, ${user.name}!</h2>
                      <p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 24px;">
                        Your email has been successfully verified. You can now access all features of ${senderName}.
                      </p>
                      <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/auth"
                         style="display:inline-block;background:linear-gradient(135deg,#0ea0e9,#0f78c8);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">
                        Login to Your Account
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
                      <p style="margin:0;font-size:12px;color:#aaa;">© ${new Date().getFullYear()} ${senderName}</p>
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
    return { success: false, error: err.message };
  }
};

const sendComplaintAssignedEmail = async (
  student,
  complaint,
  staff,
  senderName = "ComplaintSync"
) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from:    `"${senderName}" <${process.env.EMAIL_USER}>`,
    to:      student.email,
    subject: `Your complaint has been assigned — ${complaint.complaintId || complaint._id}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f4f4f4;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0"
                style="background:#fff;border-radius:8px;overflow:hidden;
                       box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#021135,#086ead);
                             padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:22px;">
                      ${senderName}
                    </h1>
                    <p style="margin:8px 0 0;color:#c9e0ff;font-size:13px;">
                      Complaint Update
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="font-size:16px;color:#333;margin:0 0 8px;">
                      Hello <strong>${student.name}</strong>,
                    </p>
                    <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
                      Your complaint has been reviewed and assigned to a
                      staff member who will handle it shortly.
                    </p>

                    <!-- Complaint details box -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;
                                border-radius:8px;padding:20px;margin-bottom:24px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:6px 0;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Complaint ID
                            </span><br/>
                            <span style="font-size:14px;color:#0f172a;font-weight:600;">
                              ${complaint.complaintId || complaint._id}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-top:1px solid #e2e8f0;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Title
                            </span><br/>
                            <span style="font-size:14px;color:#0f172a;">
                              ${complaint.title}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-top:1px solid #e2e8f0;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Assigned To
                            </span><br/>
                            <span style="font-size:14px;color:#0f172a;">
                              ${staff.name}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-top:1px solid #e2e8f0;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Category
                            </span><br/>
                            <span style="font-size:14px;color:#0f172a;
                                         text-transform:capitalize;">
                              ${complaint.category}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-top:1px solid #e2e8f0;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Priority
                            </span><br/>
                            <span style="font-size:14px;font-weight:700;
                              color:${
                                complaint.priority === "urgent" ? "#dc2626" :
                                complaint.priority === "high"   ? "#ea580c" :
                                complaint.priority === "medium" ? "#ca8a04" :
                                                                  "#16a34a"
                              };">
                              ${(complaint.priority || "medium").toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <p style="font-size:14px;color:#555;line-height:1.6;">
                      You will receive another email when your complaint is resolved.
                      You can also track its progress by logging into your account.
                    </p>

                    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/complaints"
                       style="display:inline-block;background:#6366f1;color:#fff;
                              padding:12px 28px;border-radius:8px;
                              text-decoration:none;font-weight:600;margin-top:16px;">
                      Track My Complaint
                    </a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f9f9f9;padding:20px 40px;
                             border-top:1px solid #eee;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#aaa;">
                      © ${new Date().getFullYear()} ${senderName}. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const sendComplaintResolvedEmail = async (
  student,
  complaint,
  staff,
  senderName = "ComplaintSync"
) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from:    `"${senderName}" <${process.env.EMAIL_USER}>`,
    to:      student.email,
    subject: `✅ Complaint Resolved — ${complaint.complaintId || complaint._id}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f4f4f4;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0"
                style="background:#fff;border-radius:8px;overflow:hidden;
                       box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                <!-- Header — green for resolved -->
                <tr>
                  <td style="background:linear-gradient(135deg,#059669,#10b981);
                             padding:32px 40px;text-align:center;">
                    <div style="display:inline-block;background:rgba(255,255,255,0.2);
                                border-radius:50%;width:56px;height:56px;
                                line-height:56px;margin-bottom:12px;">
                      <span style="font-size:28px;">✓</span>
                    </div>
                    <h1 style="margin:0;color:#fff;font-size:22px;">
                      Complaint Resolved
                    </h1>
                    <p style="margin:8px 0 0;color:#d1fae5;font-size:13px;">
                      ${senderName}
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="font-size:16px;color:#333;margin:0 0 8px;">
                      Hello <strong>${student.name}</strong>,
                    </p>
                    <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
                      Great news! Your complaint has been resolved by
                      <strong>${staff.name}</strong>.
                    </p>

                    <!-- Complaint details -->
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;
                                border-radius:8px;padding:20px;margin-bottom:24px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:6px 0;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Complaint ID
                            </span><br/>
                            <span style="font-size:14px;color:#0f172a;font-weight:600;">
                              ${complaint.complaintId || complaint._id}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-top:1px solid #bbf7d0;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Title
                            </span><br/>
                            <span style="font-size:14px;color:#0f172a;">
                              ${complaint.title}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-top:1px solid #bbf7d0;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Resolved By
                            </span><br/>
                            <span style="font-size:14px;color:#0f172a;">
                              ${staff.name}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-top:1px solid #bbf7d0;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Resolved On
                            </span><br/>
                            <span style="font-size:14px;color:#0f172a;">
                              ${new Date().toLocaleDateString("en-IN", {
                                day:   "2-digit",
                                month: "long",
                                year:  "numeric",
                              })}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <p style="font-size:14px;color:#555;line-height:1.6;">
                      If you feel the issue has not been fully addressed,
                      you can submit a new complaint from your dashboard.
                    </p>

                    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/complaints"
                       style="display:inline-block;background:#10b981;color:#fff;
                              padding:12px 28px;border-radius:8px;
                              text-decoration:none;font-weight:600;margin-top:16px;">
                      View My Complaints
                    </a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f9f9f9;padding:20px 40px;
                             border-top:1px solid #eee;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#aaa;">
                      © ${new Date().getFullYear()} ${senderName}. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const sendComplaintRejectedEmail = async (
  student,
  complaint,
  rejectedBy,
  senderName = "ComplaintSync"
) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { success: false, skipped: true };
  }

  const mailOptions = {
    from:    `"${senderName}" <${process.env.EMAIL_USER}>`,
    to:      student.email,
    subject: `Complaint Update — ${complaint.complaintId || complaint._id}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f4f4f4;padding:40px 0;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0"
                style="background:#fff;border-radius:8px;overflow:hidden;
                       box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                <!-- Header — red/orange for rejected -->
                <tr>
                  <td style="background:linear-gradient(135deg,#991b1b,#ef4444);
                             padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:22px;">
                      Complaint Update
                    </h1>
                    <p style="margin:8px 0 0;color:#fecaca;font-size:13px;">
                      ${senderName}
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="font-size:16px;color:#333;margin:0 0 8px;">
                      Hello <strong>${student.name}</strong>,
                    </p>
                    <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
                      After careful review, your complaint could not be
                      processed at this time.
                    </p>

                    <!-- Complaint details -->
                    <div style="background:#fef2f2;border:1px solid #fecaca;
                                border-radius:8px;padding:20px;margin-bottom:20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:6px 0;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Complaint ID
                            </span><br/>
                            <span style="font-size:14px;color:#0f172a;font-weight:600;">
                              ${complaint.complaintId || complaint._id}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-top:1px solid #fecaca;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Title
                            </span><br/>
                            <span style="font-size:14px;color:#0f172a;">
                              ${complaint.title}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;border-top:1px solid #fecaca;">
                            <span style="font-size:12px;color:#94a3b8;
                                         text-transform:uppercase;
                                         letter-spacing:0.05em;font-weight:700;">
                              Reviewed By
                            </span><br/>
                            <span style="font-size:14px;color:#0f172a;">
                              ${rejectedBy.name}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Rejection reason box -->
                    ${complaint.rejectionReason ? `
                    <div style="background:#fff7ed;border-left:4px solid #f59e0b;
                                border-radius:0 8px 8px 0;padding:16px 20px;
                                margin-bottom:24px;">
                      <p style="margin:0 0 6px;font-size:12px;color:#92400e;
                                 font-weight:700;text-transform:uppercase;
                                 letter-spacing:0.05em;">
                        Reason for Rejection
                      </p>
                      <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.6;">
                        ${complaint.rejectionReason}
                      </p>
                    </div>
                    ` : ""}

                    <p style="font-size:14px;color:#555;line-height:1.6;">
                      If you believe this decision was made in error or the
                      issue persists, you are welcome to submit a new complaint
                      with additional details.
                    </p>

                    <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/submit"
                       style="display:inline-block;background:#6366f1;color:#fff;
                              padding:12px 28px;border-radius:8px;
                              text-decoration:none;font-weight:600;margin-top:16px;">
                      Submit New Complaint
                    </a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f9f9f9;padding:20px 40px;
                             border-top:1px solid #eee;text-align:center;">
                    <p style="margin:0;font-size:12px;color:#aaa;">
                      © ${new Date().getFullYear()} ${senderName}. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
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