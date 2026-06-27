// backend/routes/accreditations.js — Supabase Storage version
const express = require('express');
const db = require('../db');
const upload = require('../middleware/upload');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { uploadBuffer, downloadToResponse, deleteFile } = require('../utils/supabaseStorage');

const router = express.Router();
router.use(authMiddleware);

function pg(sql, params = []) {
  let i = 0;
  return db.query(sql.replace(/\?/g, () => `$${++i}`), params);
}

// IMPORTANT: download route must come BEFORE /:category
// GET /api/accreditations/download/:id
router.get('/download/:id',
  requireRole('iqac','principal'),
  async (req, res) => {
    try {
      const result = await pg('SELECT * FROM accreditation_files WHERE id = ?', [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'File record not found' });

      const file = result.rows[0];
      return downloadToResponse(file.file_name, res, file.title || 'accreditation-file');
    } catch (err) {
      console.error('Accreditation download error:', err);
      res.status(500).json({ error: 'Failed to download accreditation file' });
    }
  }
);

// GET /api/accreditations/:category
router.get('/:category',
  requireRole('iqac','principal'),
  async (req, res) => {
    try {
      const category = String(req.params.category || '').toUpperCase();
      if (!['NBA','NAAC','NIRF'].includes(category))
        return res.status(400).json({ error: 'Invalid accreditation category' });

      const result = await pg(
        'SELECT * FROM accreditation_files WHERE category = ? ORDER BY uploaded_at DESC',
        [category]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Accreditation fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch accreditation files' });
    }
  }
);

// POST /api/accreditations/:category/upload
router.post('/:category/upload',
  requireRole('iqac','principal'),
  upload.single('file'),
  async (req, res) => {
    try {
      const category = String(req.params.category || '').toUpperCase();
      const title = req.body.title;

      if (!['NBA','NAAC','NIRF'].includes(category))
        return res.status(400).json({ error: 'Invalid accreditation category' });

      if (!title || !req.file)
        return res.status(400).json({ error: 'Title and file are required' });

      const stored = await uploadBuffer('accreditations', req.file);

      await pg(
        `INSERT INTO accreditation_files (category, title, file_name, uploaded_by)
         VALUES (?,?,?,?)`,
        [category, title, stored.path, req.user.empid || '—']
      );

      res.status(201).json({ message: 'Accreditation file uploaded successfully' });
    } catch (err) {
      console.error('Accreditation upload error:', err);
      res.status(500).json({ error: 'Failed to upload accreditation file' });
    }
  }
);

// DELETE /api/accreditations/:id
router.delete('/:id',
  requireRole('iqac','principal'),
  async (req, res) => {
    try {
      const result = await pg('SELECT * FROM accreditation_files WHERE id = ?', [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'File record not found' });

      const file = result.rows[0];
      await deleteFile(file.file_name);

      await pg('DELETE FROM accreditation_files WHERE id = ?', [req.params.id]);
      res.json({ message: 'Accreditation file deleted successfully' });
    } catch (err) {
      console.error('Accreditation delete error:', err);
      res.status(500).json({ error: 'Failed to delete accreditation file' });
    }
  }
);

module.exports = router;
