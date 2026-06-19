// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// ── CORS CONFIGURATION ───────────────────────────────────
const envOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  ...envOrigins,
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');

    if (
      allowedOrigins.includes(normalizedOrigin) ||
      normalizedOrigin.endsWith('.vercel.app')
    ) {
      return callback(null, true);
    }

    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── BODY PARSERS ─────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── UPLOADS / DOWNLOADS ──────────────────────────────────
// IMPORTANT FOR RENDER:
// Add a Render Persistent Disk mounted at /var/data
// and set env variable UPLOAD_DIR=/var/data/uploads
//
// If you do not add a Persistent Disk, uploaded files will disappear after redeploy.
const persistentUploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const localUploadDir = path.join(__dirname, 'uploads');

function ensureUploadStorage() {
  fs.mkdirSync(persistentUploadDir, { recursive: true });

  // Many route files write to backend/uploads.
  // This symlink makes those routes write into the persistent disk automatically.
  try {
    if (persistentUploadDir !== localUploadDir) {
      if (fs.existsSync(localUploadDir)) {
        const stat = fs.lstatSync(localUploadDir);
        if (!stat.isSymbolicLink()) {
          fs.mkdirSync(localUploadDir, { recursive: true });
        }
      } else {
        fs.symlinkSync(persistentUploadDir, localUploadDir, 'dir');
        console.log(`Uploads symlink created: ${localUploadDir} -> ${persistentUploadDir}`);
      }
    } else {
      fs.mkdirSync(localUploadDir, { recursive: true });
    }
  } catch (err) {
    console.warn('Upload symlink warning:', err.message);
    fs.mkdirSync(localUploadDir, { recursive: true });
  }

  // Standard subfolders used by different modules
  ['formats', 'faculty', 'attended', 'events', 'accreditations'].forEach(folder => {
    try { fs.mkdirSync(path.join(localUploadDir, folder), { recursive: true }); } catch {}
    try { fs.mkdirSync(path.join(persistentUploadDir, folder), { recursive: true }); } catch {}
  });
}

ensureUploadStorage();

// Serve uploaded files publicly when the app stores /uploads/... paths
app.use('/uploads', express.static(localUploadDir));
app.use('/uploads', express.static(persistentUploadDir));

// Safe fallback download endpoint for stored paths.
// Example: /api/file?path=/uploads/formats/a.pdf
app.get('/api/file', (req, res) => {
  try {
    let requested = String(req.query.path || '').trim();

    if (!requested) {
      return res.status(400).json({ error: 'File path is required' });
    }

    requested = requested.replace(/\\/g, '/');

    let candidate;

    if (requested.startsWith('/uploads/')) {
      candidate = path.join(localUploadDir, requested.replace('/uploads/', ''));
    } else if (requested.startsWith('uploads/')) {
      candidate = path.join(localUploadDir, requested.replace('uploads/', ''));
    } else if (path.isAbsolute(requested)) {
      candidate = requested;
    } else {
      candidate = path.join(localUploadDir, requested);
    }

    const normalized = path.normalize(candidate);

    // Safety: only allow files inside localUploadDir or persistentUploadDir
    const allowedA = path.normalize(localUploadDir);
    const allowedB = path.normalize(persistentUploadDir);

    if (!normalized.startsWith(allowedA) && !normalized.startsWith(allowedB)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(normalized)) {
      return res.status(404).json({
        error: 'File not found on server. If this file was uploaded before the last Render redeploy, it may have been lost because no Persistent Disk was attached.'
      });
    }

    return res.download(normalized);

  } catch (err) {
    console.error('File download error:', err);
    return res.status(500).json({ error: 'Unable to download file' });
  }
});

// ── API ROUTES ───────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/attended', require('./routes/attended'));
app.use('/api/faculty', require('./routes/faculty'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/accreditations', require('./routes/accreditations'));
app.use('/api/intelligence', require('./routes/intelligence'));
app.use('/api/formats', require('./routes/formats'));

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
console.log('SERVER RESTORED — CORS + PERSISTENT UPLOAD FIX APPLIED');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`IQAC Portal running on port ${PORT}`);
  console.log(`Upload directory: ${persistentUploadDir}`);
});
