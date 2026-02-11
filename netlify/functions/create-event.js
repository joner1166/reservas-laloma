const { google } = require('googleapis');

exports.handler = async (event) => {
  // Solo permitimos peticiones POST desde tu web
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Método no permitido' }) 
    };
  }

  // 1. Cargamos tus credenciales desde las variables de entorno de Netlify
  const { 
    GOOGLE_CLIENT_ID, 
    GOOGLE_CLIENT_SECRET, 
    GOOGLE_CALENDAR_ID, 
    GOOGLE_REFRESH_TOKEN 
  } = process.env;

  // Configuramos el cliente de Google
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
  );

  // 2. IMPORTANTE: Usamos el Refresh Token para que funcione siempre en automático
  oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

  try {
    const data = JSON.parse(event.body);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 3. Definimos los detalles de la reserva
    const eventDetails = {
      summary: `Reserva: ${data.firstName} ${data.lastName}`,
      description: `Personas: ${data.guests} | Notas: ${data.notes || 'Sin notas'}`,
      start: {
        dateTime: data.startISO, // Asegúrate de enviar el formato ISO desde el frontend
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: data.endISO, 
        timeZone: 'America/Los_Angeles',
      },
    };

    // 4. Insertamos el evento en tu Google Calendar
    const response = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      resource: eventDetails,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: 'Reserva creada con éxito', 
        id: response.data.id 
      }),
    };
  } catch (error) {
    console.error('Error al crear evento:', error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: 'No se pudo crear la reserva', 
        details: error.message 
      }),
    };
  }
};