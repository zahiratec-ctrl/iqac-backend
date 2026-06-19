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

const upload = multer({ storage });

function iqacOnly(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (!['iqac', 'iqac_coordinator', 'iqac coordinator'].includes(role)) {
    return res.status(403).json({ error: 'Only IQAC Coordinator can perform this action' });
  }
  next();
}

// GET /api/formats/categories
// IMPORTANT: this route must be before /:id/download
router.get('/categories', authMiddleware, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT category
      FROM iqac_format_categories
      ORDER BY category ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Format categories fetch error:', err);
    res.status(500).json({ error: 'Unable to fetch format categories' });
  }
});

// DELETE /api/formats/categories/:category
// Deletes dropdown category and all uploaded formats under it.
router.delete('/categories/:category', authMiddleware, iqacOnly, async (req, res) => {
  const client = await pool.connect();

  try {
    const category = decodeURIComponent(req.params.category || '').trim();
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    await client.query('BEGIN');

    const files = await client.query(
      'SELECT file_path FROM iqac_formats WHERE category = $1',
      [category]
    );

    await client.query('DELETE FROM iqac_formats WHERE category = $1', [category]);
    await client.query('DELETE FROM iqac_format_categories WHERE category = $1', [category]);

    await client.query('COMMIT');

    // Remove physical files after DB commit
    for (const f of files.rows) {
      if (f.file_path && fs.existsSync(f.file_path)) {
        try { fs.unlinkSync(f.file_path); } catch (_e) {}
      }
    }

    res.json({ message: 'Category and related formats deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Format category delete error:', err);
    res.status(500).json({ error: 'Unable to delete category' });
  } finally {
    client.release();
  }
});

// GET /api/formats
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, category, title, original_name, filename, file_path, mime_type,
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
      return res.status(400).json({ error: 'Category and title are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Format file is required' });
    }

    // Ensure new category becomes available in dropdown
    await pool.query(`
      INSERT INTO iqac_format_categories (category, created_by)
      VALUES ($1,$2)
      ON CONFLICT (category) DO NOTHING
    `, [
      category.trim(),
      req.user.empid || req.user.email || 'iqac'
    ]);

    const result = await pool.query(`
      INSERT INTO iqac_formats
      (category, title, original_name, filename, file_path, mime_type, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
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
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM iqac_formats WHERE id = $1',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    if (!file.file_path || !fs.existsSync(file.file_path)) {
      return res.status(404).json({ error: 'File missing on server' });
    }

    res.download(file.file_path, file.original_name || file.filename || 'format');
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

    if (!found.rows.length) {
      return res.status(404).json({ error: 'Format not found' });
    }

    await pool.query('DELETE FROM iqac_formats WHERE id = $1', [req.params.id]);

    const filePath = found.rows[0].file_path;
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_e) {}
    }

    res.json({ message: 'Format deleted successfully' });
  } catch (err) {
    console.error('Format delete error:', err);
    res.status(500).json({ error: 'Unable to delete format' });
  }
});

module.exports = router;
