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

const sendEmail = async ({ to, subject, html }) => {
  try {
    let mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html,
    };

    let attempts = 3;
    while (attempts > 0) {
      try {
        let info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        return info;
      } catch (error) {
        attempts--;
        console.error(`Email failed. Attempts left: ${attempts}`, error);
        if (attempts === 0) {
          throw new Error("Failed to send email after multiple attempts.");
        }
      }
    }
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = { sendEmail, transporter };
