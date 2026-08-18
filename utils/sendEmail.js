const nodemailer = require("nodemailer");

// ==========================================================
// GMAIL SMTP TRANSPORTER
// ==========================================================

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,

  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_APP_PASSWORD,
  },

  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

// ==========================================================
// SEND EMAIL
// ==========================================================

const sendEmail = async ({
  to,
  subject,
  html,
}) => {

  if (!to) {
    throw new Error("Recipient email is required");
  }

  return transporter.sendMail({
    from: `"LR Handlooms" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;