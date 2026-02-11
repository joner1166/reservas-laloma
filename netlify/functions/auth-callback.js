const { google } = require("googleapis");

exports.handler = async (event) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "https://reservas-demo.netlify.app/.netlify/functions/auth-callback"
  );

  const code = event.queryStringParameters.code;

  if (!code) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar"],
      prompt: "consent",
    });

    return {
      statusCode: 302,
      headers: {
        Location: authUrl,
      },
    };
  }

  const { tokens } = await oauth2Client.getToken(code);

  return {
    statusCode: 200,
    body: JSON.stringify(tokens, null, 2),
  };
};
