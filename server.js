const express = require('express');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;

// Logger simple
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

// SERVIR ESTÁTICOS DESDE LA CARPETA "interface"
const interfaceDir = path.join(__dirname, 'interface');
app.use(express.static(interfaceDir));

// Parseo JSON para body
app.use(express.json());

// Directorio y archivo de datos
const dataDir = path.join(__dirname, 'data');
const pollsFile = path.join(dataDir, 'polls.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Directorio de datos creado:', dataDir);
}
if (!fs.existsSync(pollsFile)) {
  fs.writeFileSync(pollsFile, '[]', 'utf8');
  console.log('Archivo polls.json inicial creado en:', pollsFile);
}

// --- Helpers para leer/escribir polls.json ---
function readPolls() {
  try {
    const raw = fs.readFileSync(pollsFile, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error leyendo polls.json:', err);
    return [];
  }
}

function writePolls(polls) {
  try {
    // Escritura simple (suficiente para prototipo). Para más concurrencia, usar DB o write temp+rename.
    fs.writeFileSync(pollsFile, JSON.stringify(polls, null, 2), 'utf8');
  } catch (err) {
    console.error('Error escribiendo polls.json:', err);
  }
}

// --- Endpoints ---

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'quickpoll', timestamp: new Date().toISOString() });
});

// GET /api/polls -> devuelve todas las encuestas
app.get('/api/polls', (req, res) => {
  const polls = readPolls();
  res.json(polls);
});

// POST /api/polls -> crear una nueva encuesta
// Body esperado: { title: "Mi pregunta", options: ["A", "B", "C"] }
app.post('/api/polls', (req, res) => {
  const { title, options } = req.body;
  if (!title || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Se requiere title y al menos 2 options' });
  }

  const polls = readPolls();

  // construir objeto poll
  const newPoll = {
    id: nanoid(8),
    title: String(title).trim(),
    options: options.map(opt => ({
      id: nanoid(8),
      name: String(opt).trim(),
      votes: 0
    })),
    createdAt: new Date().toISOString()
  };

  polls.unshift(newPoll); // poner al inicio
  writePolls(polls);

  res.status(201).json(newPoll);
});

// POST /api/polls/:id/vote -> votar
// Body aceptado: { optionId: "..."} o { optionIndex: 1 }
app.post('/api/polls/:id/vote', (req, res) => {
  const pollId = req.params.id;
  const { optionId, optionIndex } = req.body;

  const polls = readPolls();
  const poll = polls.find(p => p.id === pollId);
  if (!poll) return res.status(404).json({ error: 'Encuesta no encontrada' });

  // encontrar opción por id o por índice
  let opt;
  if (optionId) {
    opt = poll.options.find(o => o.id === optionId);
  } else if (typeof optionIndex === 'number') {
    opt = poll.options[optionIndex];
  }

  if (!opt) {
    return res.status(400).json({ error: 'Opción inválida' });
  }

  // incrementar votos
  opt.votes = (opt.votes || 0) + 1;

  // guardar
  writePolls(polls);

  // devolver encuesta actualizada
  res.json(poll);
});

// Respuesta genérica para rutas /api no definidas
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint de la API no encontrado' });
});

// Ruta raíz -> servir index.html (fallback)
app.get('/', (req, res) => {
  res.sendFile(path.join(interfaceDir, 'index.html'), err => {
    if (err) res.status(500).send('index.html no encontrado');
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor QuickPoll escuchando en http://localhost:${PORT}`);
});
