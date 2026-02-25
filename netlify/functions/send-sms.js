const twilio = require("twilio");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { type = "confirm", phone, firstName, dateLabel, timeLabel, guests, cancel_token } = payload;

  if (!phone) return { statusCode: 400, body: "Phone required" };

  const name = (firstName || "").trim() || "there";

  // ✅ Link robusto a function real (recomendado)
  const manageLink = cancel_token
    ? `https://reservas-demo.netlify.app/.netlify/functions/cancel?token=${encodeURIComponent(cancel_token)}`
    : null;

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  let messageBody = "";

  switch (type) {
    case "waitlist":
      messageBody =
        `Lindo Michoacan 🕒\n\n` +
        `Hi ${name}, you've been added to our waitlist.\n\n` +
        `👥 Party: ${guests ?? ""}\n\n` +
        `We will text you as soon as your table is ready. Thank you for your patience!\n\n` +
        `Reply STOP to opt-out.`;
      break;

    case "table_ready":
      messageBody =
        `Lindo Michoacan 🥂\n\n` +
        `Great news ${name}, your table is ready! Please head to the host stand to be seated.\n\n` +
        `⚠️ Note: We will hold your table for 10 minutes. See you shortly!\n\n` +
        `Reply STOP to opt-out.`;
      break;

    case "confirm":
    default:
      messageBody =
        `Lindo Michoacan 🥂\n\n` +
        `Reservation Confirmed!\n\n` +
        `Hi ${name}, we look forward to hosting you.\n\n` +
        `📅 ${dateLabel || ""}\n` +
        `⏰ ${timeLabel || ""}\n` +
        `👥 ${guests ?? ""} guests\n\n` +
        `${manageLink ? `Manage or Cancel: ${manageLink}\n\n` : ""}` +
        `Reply STOP to opt-out.`;
      break;
  }

  try {
    await client.messages.create({
      body: messageBody,
      from: process.env.TWILIO_FROM_NUMBER,
      to: phone,
    });
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("Twilio Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};