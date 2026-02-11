const { google } = require('googleapis');

exports.handler = async (event) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "https://reservations-demo1.netlify.app/.netlify/functions/auth-callback"
  );

  const { code } = event.queryStringParameters;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    // Este token es lo que permite que la app funcione siempre
    return {
      statusCode: 200,
      body: `Autorización exitosa. Copia este Refresh Token y guárdalo en Netlify: ${tokens.refresh_token}`
    };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
};