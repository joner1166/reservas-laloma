const { google } = require('googleapis');

exports.handler = async (event) => {
  // Solo permitimos peticiones POST
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Método no permitido' }) 
    };
  }

  // 1. Cargamos credenciales desde las variables de entorno de Netlify
  const { 
    GOOGLE_CLIENT_ID, 
    GOOGLE_CLIENT_SECRET, 
    GOOGLE_CALENDAR_ID, 
    GOOGLE_REFRESH_TOKEN 
  } = process.env;

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
  );

  // 2. Usar Refresh Token para mantener la sesión activa
  oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

  try {
    const data = JSON.parse(event.body);
    // Extraemos la reserva del objeto enviado desde el frontend
    const res = data.reservation; 

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 3. Definimos los detalles con los nuevos nombres de campos (firstName, lastName)
    const eventDetails = {
      summary: `🍴 Reserva: ${res.firstName} ${res.lastName}`,
      description: `
        Pax: ${res.guests}
        Tel: ${res.phone}
        Email: ${res.email || 'N/A'}
        Celebración: ${res.celebration || 'None'}
        Dieta: ${res.dietary || 'None'}
        Notas: ${res.notes || 'Sin notas'}
        Fuente: ${res.source || 'online'}
      `.replace(/  +/g, ''), // Limpia espacios extra
      start: {
        dateTime: res.startISO, // Viene calculado desde el App.jsx
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: res.endISO, 
        timeZone: 'America/Los_Angeles',
      },
    };

    // 4. Insertamos el evento
    const response = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      resource: eventDetails,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: 'Reserva creada en Google Calendar', 
        id: response.data.id 
      }),
    };
  } catch (error) {
    console.error('Error al crear evento:', error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: 'No se pudo crear el evento en el calendario', 
        details: error.message 
      }),
    };
  }
};