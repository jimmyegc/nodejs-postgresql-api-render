import express from 'express';
import pg from 'pg';
import axios from 'axios'
import cors from 'cors'
import 'dotenv/config'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// Crear una nueva aplicación Express
const app = express();

// Habilitar CORS
app.use(cors());

// Middleware para analizar JSON
app.use(express.json());

// Middleware para analizar datos codificados como application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Conectar a la base de datos
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

// Definir un puerto para nuestro servidor
const port = 3000 || process.env.PORT;

// Definir una ruta de prueba
app.get('/', (req, res) => {
  res.send('¡Hola Mundo!');
});

app.get('/ping', async (req, res) => {
  const result = await pool.query('SELECT NOW()')
  return res.json(result.rows[0])
});

app.post('/report-error', async (req, res) => {
  const { error, additionalInfo } = req.body;
  console.log("body", req.body);

  if (!error || !additionalInfo) {
    return res.status(400).json({ message: 'El objeto de error es obligatorio y debe contener un mensaje.' });
  }

  // Construir el mensaje para Slack
  const message = {
    text: `:warning: *Error reportado desde el cliente* :warning:`,
    attachments: [
      {
        color: 'danger',
        title: error.name || 'Error',
        text: error.message || 'Se produjo un error',
        fields: [
          {
            title: 'Información Adicional',
            value: additionalInfo || 'No disponible',
            short: false,
          },
          {
            title: 'Stack Trace',
            value: error.stack || 'No disponible',
            short: false,
          },
        ],
        footer: 'Sistema de Reporte de Errores',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    // Enviar el mensaje a Slack
    await axios.post(SLACK_WEBHOOK_URL, message);
    console.log('Error enviado a Slack correctamente.');
    res.status(200).json({ message: 'Error reportado a Slack.' });
  } catch (slackError) {
    console.error('Error al enviar mensaje a Slack:', slackError.message);
    res.status(500).json({ message: 'Error al reportar a Slack.' });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});