const { google } = require("googleapis");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed. Use POST." }),
    };
  }

  try {
    const {
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN,
      GOOGLE_CALENDAR_ID,
    } = process.env;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in env vars.",
        }),
      };
    }

    if (!GOOGLE_REFRESH_TOKEN) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error:
            "Missing GOOGLE_REFRESH_TOKEN. Run auth-callback once and save refresh_token in Netlify env vars.",
        }),
      };
    }

    if (!GOOGLE_CALENDAR_ID) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error:
            "Missing GOOGLE_CALENDAR_ID. Set it to your calendar email or calendar id.",
        }),
      };
    }

    // OAuth client usando refresh token (sin pedir login)
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: GOOGLE_REFRESH_TOKEN,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Body esperado desde tu app
    // {
    //   "title": "Reserva - Juan",
    //   "start": "2026-02-20T19:00:00-08:00",
    //   "end": "2026-02-20T20:00:00-08:00",
    //   "description": "Mesa para 2",
    //   "location": "Lindo Michoacan",
    //   "attendeeEmail": "cliente@email.com"
    // }
    const data = JSON.parse(event.body || "{}");

    const title = data.title || "Reserva";
    const start = data.start;
    const end = data.end;

    if (!start || !end) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing required fields: start, end (ISO string).",
        }),
      };
    }

    const eventResource = {
      summary: title,
      description: data.description || "",
      location: data.location || "",
      start: { dateTime: start },
      end: { dateTime: end },
    };

    // opcional: agregar invitado
    if (data.attendeeEmail) {
      eventResource.attendees = [{ email: data.attendeeEmail }];
    }

    const res = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: eventResource,
      sendUpdates: data.attendeeEmail ? "all" : "none",
    });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(
        {
          ok: true,
          eventId: res.data.id,
          htmlLink: res.data.htmlLink,
          summary: res.data.summary,
        },
        null,
        2
      ),
    };
  } catch (err) {
    console.error("create-event error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify(
        { error: "create_event_failed", message: err?.message || String(err) },
        null,
        2
      ),
    };
  }
};
