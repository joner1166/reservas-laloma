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
        `We will send you 1 more message when your table is ready. Thank you for your patience!\n\n` +
        `Msg & data rates may apply. Reply STOP to opt-out.`;
      break;

    case "table_ready":
      messageBody =
        `Lindo Michoacan 🥂\n\n` +
        `Your table is ready, ${name}!\n\n` +
        `Please check in with the hostess within the next 10 minutes to hold your table.\n\n` +
        `We look forward to seeing you!\n\n` +
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