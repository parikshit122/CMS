require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const nodemailer = require("nodemailer");

const test = async () => {
  console.log("Testing email configuration...");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "SET (hidden)" : "NOT SET");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    console.log("\n🔍 Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection OK\n");

    const recipientEmail = process.argv[2] || process.env.EMAIL_USER;

    console.log(`📧 Sending test email to: ${recipientEmail}`);
    const info = await transporter.sendMail({
      from:    `"ComplaintSync Test" <${process.env.EMAIL_USER}>`,
      to:      recipientEmail,
      subject: "Test Email from ComplaintSync",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2 style="color: #6366f1;">Test Email Successful!</h2>
          <p>If you received this email, your Gmail SMTP is working correctly.</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    console.log("\n✅ Email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
  } catch (err) {
    console.error("\n❌ Email failed:");
    console.error("Error:", err.message);
    console.error("\nCommon fixes:");
    console.error("1. Enable 2-Step Verification on Gmail");
    console.error("2. Generate new App Password: https://myaccount.google.com/apppasswords");
    console.error("3. Use App Password (16 chars) not your Gmail password");
    console.error("4. Check EMAIL_USER matches the Gmail account");
  }

  process.exit(0);
};

test();