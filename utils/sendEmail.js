const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_APP_PASSWORD,
  },
});


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