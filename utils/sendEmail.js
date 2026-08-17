const nodemailer = require("nodemailer");


// ==========================================================
// GMAIL TRANSPORTER
// ==========================================================

const transporter = nodemailer.createTransport({

  service: "gmail",

  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_APP_PASSWORD,
  },

  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 15000,

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
    throw new Error(
      "Recipient email is required"
    );
  }


  return transporter.sendMail({

    from:
      `"LR Handlooms" <${process.env.MAIL_USER}>`,

    to,

    subject,

    html,

  });

};


module.exports = sendEmail;