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

    return {
      statusCode: 302,
      headers: {
        Location: `https://reservas-demo.netlify.app/cancelled-success?name=${encodeURIComponent(name)}`,
      },
      body: "",
    };
  } catch (err) {
    console.error("Cancel error:", err);
    return { statusCode: 500, body: err.message };
  }
};