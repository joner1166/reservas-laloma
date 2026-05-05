const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  const token = event.queryStringParameters?.token;
  if (!token) return { statusCode: 400, body: "Missing token" };

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data, error } = await supabase
      .from("reservations")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("cancel_token", token)
      .is("cancelled_at", null)
      .select("firstName");

    if (error) throw error;
    if (!data || data.length === 0) {
      return { statusCode: 404, body: "Invalid token or already cancelled." };
    }

    const name = (data[0]?.firstName || "").trim();
    const displayName = name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reservation Cancelled – Lindo Michoacan</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.7; text-align: center; }
    .icon { font-size: 3rem; margin-bottom: 16px; }
    h1 { font-size: 1.6rem; border-bottom: 2px solid #b91c1c; padding-bottom: 8px; display: inline-block; }
    p { font-size: 1rem; color: #444; margin-top: 20px; }
    .back-link { display: inline-block; margin-top: 32px; padding: 12px 28px; background: #b91c1c; color: #fff; text-decoration: none; border-radius: 8px; font-size: 0.95rem; }
    .back-link:hover { background: #991b1b; }
    footer { margin-top: 48px; font-size: 0.82rem; color: #666; border-top: 1px solid #ddd; padding-top: 12px; }
    footer a { color: #b91c1c; }
  </style>
</head>
<body>
  <div class="icon">✅</div>
  <h1>Reservation Cancelled</h1>
  <p>${displayName ? `Your reservation has been successfully cancelled, ${displayName}.` : "Your reservation has been successfully cancelled."}</p>
  <p style="font-size:0.88rem;color:#666;">If you change your mind, we'd love to have you — make a new reservation below.</p>
  <a href="https://reservas-demo.netlify.app/" class="back-link">Make a new reservation</a>
  <footer>
    &copy; 2025 Lindo Michoacan Restaurant. All rights reserved. |
    <a href="https://reservas-demo.netlify.app/privacy.html">Privacy Policy</a> |
    <a href="https://reservas-demo.netlify.app/terms.html">Terms &amp; Conditions</a>
  </footer>
</body>
</html>`,
    };
  } catch (err) {
    console.error("Cancel error:", err);
    return { statusCode: 500, body: err.message };
  }
};