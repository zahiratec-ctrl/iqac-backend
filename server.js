// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// ── CORS CONFIGURATION (UPDATED FOR VERCEL) ─────────────────
// Read allowed origins from environment variable (comma-separated)
const envOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

// Define all allowed origins
const allowedOrigins = [
  ...envOrigins,                // <-- Your Vercel URL will go here
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

const corsOptions = {
  origin: function(origin, callback) {
  if (!origin) return callback(null, true);

  const normalizedOrigin = origin.replace(/\/$/, '');

  if (allowedOrigins.includes(normalizedOrigin)) {
    return callback(null, true);
  }

  callback(new Error(`CORS blocked: ${origin}`));
},
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS middleware globally
app.use(cors(corsOptions));
// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// ── BODY PARSERS ─────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── UPLOADS ──────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

// ── API ROUTES ───────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/attended', require('./routes/attended'));
app.use('/api/faculty', require('./routes/faculty'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/accreditations', require('./routes/accreditations'));
app.use('/api/intelligence', require('./routes/intelligence'));

// ── HEALTH CHECKS ────────────────────────────────────────
app.get('/', (_req, res) => {
  res.send('IQAC Backend Running Successfully');
});

app.get('/api', (_req, res) => {
  res.json({ message: 'IQAC API Working' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── OPTIONAL PUBLIC FRONTEND ─────────────────────────────
const publicDir = path.join(__dirname, 'public');

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// ── ERROR HANDLER ────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Error:', err.message);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }

  if (String(err.message || '').startsWith('CORS blocked')) {
    return res.status(403).json({ error: err.message });
  }

  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── START SERVER ─────────────────────────────────────────
console.log('SERVER RESTORED — CORS FIX APPLIED');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`IQAC Portal running on port ${PORT}`);
});