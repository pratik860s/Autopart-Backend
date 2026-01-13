const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_Hostname,
  port: process.env.SMTP_Port,
  secure: false,
  auth: {
    user: process.env.SMTP_Username,
    pass: process.env.SMTP_Password,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendVerificationEmail = async (email, token) => {
  const link = `${process.env.BACKEND_BASE_URL}/api/auth/verify-email/${token}`;

  let mailOptions = {
    from: process.env.FROM_EMAIL,
    to: email,
    subject: "Verify your sparesgetways account",
    // html: `<p>Click <a href="${link}">here</a> to verify your email.</p>`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
        <h2 style="color: #2d3748;">Welcome to SparesGetways!</h2>
        <p style="font-size: 16px; color: #333;">
          Thank you for registering with us.<br>
          Please verify your email address to activate your account and start using our services.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}" style="background: #007bff; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 5px; font-size: 18px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Or copy and paste this link into your browser:<br>
          <a href="${link}" style="color: #007bff;">${link}</a>
        </p>
        <hr style="margin: 32px 0;">
        <p style="font-size: 12px; color: #999;">
          If you did not create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  let attempts = 3;
  while (attempts > 0) {
    try {
      let info = await transporter.sendMail(mailOptions);
      console.log("Verification email sent: %s", info.messageId);
      break;
    } catch (error) {
      attempts--;
      console.error(
        `Verification email failed. Attempts left: ${attempts}`,
        error
      );
      if (attempts === 0) {
        throw new Error(
          "Failed to send verification email after multiple attempts."
        );
      }
    }
  }
};

module.exports = { sendVerificationEmail, transporter };
