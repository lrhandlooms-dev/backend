// ==========================================================
// RESEND EMAIL API
// ==========================================================

const sendEmail = async ({
  to,
  subject,
  html,
}) => {

  if (!to) {
    throw new Error("Recipient email is required");
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  // Support both single email and multiple emails
  const recipients = Array.isArray(to) ? to : [to];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",

    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      from: "LR Handlooms <orders@lrhandlooms.in>",
      to: recipients,
      subject,
      html,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || "Resend email sending failed"
    );
  }

  console.log(
    `Email sent successfully to ${recipients.join(", ")} | ID: ${data.id}`
  );

  return data;
};

module.exports = sendEmail;