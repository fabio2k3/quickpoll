// Importamos las dependencias principales
const express = require('express'); // Framework para crear el servidor web
const path = require('path');       // Módulo de Node.js para trabajar con rutas de archivos
const fs = require('fs');           // Módulo de Node.js para manipular archivos y directorios

const app = express();
const PORT = process.env.PORT || 3000; // Puerto en el que escuchará el servidor (usa variable de entorno o 3000 por defecto)

// Middleware: registra cada petición en consola (muestra fecha, método y URL)
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next(); // pasa el control al siguiente middleware
});

// Middleware: sirve archivos estáticos desde la carpeta ./public (HTML, CSS, JS, imágenes)
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Middleware: permite que el servidor entienda peticiones con cuerpo en formato JSON
app.use(express.json());

// Crear la carpeta ./data si no existe (aquí guardaremos las encuestas más adelante)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Directorio de datos creado:', dataDir);
}

// Endpoint de prueba (healthcheck) para verificar que el servidor funciona
// Responde con un JSON indicando estado, nombre del servicio y la hora
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'quickpoll',
    timestamp: new Date().toISOString()
  });
});

// Middleware: respuesta genérica para cualquier ruta de la API que no exista
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint de la API no encontrado' });
});

// Ruta principal ("/"): devuelve el archivo index.html
// Nota: express.static ya lo hace, pero lo mantenemos por compatibilidad con SPAs
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'), err => {
    if (err) res.status(500).send('Index.html no encontrado');
  });
});

// Iniciar el servidor y dejarlo escuchando en el puerto definido
app.listen(PORT, () => {
  console.log(`Servidor QuickPoll escuchando en http://localhost:${PORT}`);
});
