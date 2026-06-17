// backend/routes/formats.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'formats');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx',
      '.ppt', '.pptx', '.zip'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only PDF, Word, Excel, PPT and ZIP files are allowed'));
    }
    cb(null, true);
  }
});

function iqacOnly(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (!['iqac','iqac_coordinator','iqac coordinator'].includes(role)) {
    return res.status(403).json({ error: 'Only IQAC Coordinator can perform this action' });
  }
  next();
}

// Optional auth for direct download links with ?token=
function downloadAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const token = bearer || req.query.token;

  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// GET /api/formats
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, category, title, original_name, filename, mime_type,
             uploaded_by, created_at
      FROM iqac_formats
      ORDER BY category ASC, created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Formats fetch error:', err);
    res.status(500).json({ error: 'Unable to fetch formats' });
  }
});

// POST /api/formats
router.post('/', authMiddleware, iqacOnly, upload.single('formatFile'), async (req, res) => {
  try {
    const { category, title } = req.body;

    if (!category || !title) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Category and title are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Format file is required' });
    }

    const result = await pool.query(`
      INSERT INTO iqac_formats
        (category, title, original_name, filename, file_path, mime_type, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id, category, title, original_name, filename, mime_type, uploaded_by, created_at
    `, [
      category.trim(),
      title.trim(),
      req.file.originalname,
      req.file.filename,
      req.file.path,
      req.file.mimetype,
      req.user.empid || req.user.email || 'iqac'
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Format upload error:', err);
    res.status(500).json({ error: 'Unable to upload format' });
  }
});

// GET /api/formats/:id/download
router.get('/:id/download', downloadAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM iqac_formats WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Format not found' });
    }

    const file = result.rows[0];

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ error: 'File missing on server' });
    }

    res.download(file.file_path, file.original_name);
  } catch (err) {
    console.error('Format download error:', err);
    res.status(500).json({ error: 'Unable to download format' });
  }
});

// DELETE /api/formats/:id
router.delete('/:id', authMiddleware, iqacOnly, async (req, res) => {
  try {
    const found = await pool.query(
      'SELECT file_path FROM iqac_formats WHERE id = $1',
      [req.params.id]
    );

    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'Format not found' });
    }

    await pool.query('DELETE FROM iqac_formats WHERE id = $1', [req.params.id]);

    const filePath = found.rows[0].file_path;
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'Format deleted successfully' });
  } catch (err) {
    console.error('Format delete error:', err);
    res.status(500).json({ error: 'Unable to delete format' });
  }
});

module.exports = router;
