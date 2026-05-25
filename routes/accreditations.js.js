// backend/routes/accreditations.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const upload = require('../middleware/upload');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const allowedRoles = ['iqac', 'principal'];

// GET /api/accreditations/:category
router.get('/:category',
  requireRole('iqac', 'principal'),
  async (req, res) => {
    try {
      const category = String(req.params.category || '').toUpperCase();

      if (!['NBA', 'NAAC', 'NIRF'].includes(category)) {
        return res.status(400).json({ error: 'Invalid accreditation category' });
      }

      const [rows] = await db.query(
        'SELECT * FROM accreditation_files WHERE category = ? ORDER BY uploaded_at DESC',
        [category]
      );

      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch accreditation files' });
    }
  }
);

// POST /api/accreditations/:category/upload
router.post('/:category/upload',
  requireRole('iqac', 'principal'),
  upload.single('file'),
  async (req, res) => {
    try {
      const category = String(req.params.category || '').toUpperCase();
      const title = req.body.title;

      if (!['NBA', 'NAAC', 'NIRF'].includes(category)) {
        return res.status(400).json({ error: 'Invalid accreditation category' });
      }

      if (!title || !req.file) {
        return res.status(400).json({ error: 'Title and file are required' });
      }

      await db.query(
        `INSERT INTO accreditation_files
         (category, title, file_name, uploaded_by)
         VALUES (?, ?, ?, ?)`,
        [category, title, req.file.filename, req.user.empid || req.user.id || '—']
      );

      res.status(201).json({ message: 'Accreditation file uploaded successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to upload accreditation file' });
    }
  }
);

// GET /api/accreditations/download/:id
router.get('/download/:id',
  requireRole('iqac', 'principal'),
  async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT * FROM accreditation_files WHERE id = ?',
        [req.params.id]
      );

      if (!rows.length) {
        return res.status(404).json({ error: 'File record not found' });
      }

      const file = rows[0];
      const filePath = path.join(process.env.UPLOAD_DIR || './uploads', file.file_name);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on server' });
      }

      res.download(filePath, file.file_name);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to download accreditation file' });
    }
  }
);

// DELETE /api/accreditations/:id
router.delete('/:id',
  requireRole('iqac', 'principal'),
  async (req, res) => {
    try {
      const [rows] = await db.query(
        'SELECT * FROM accreditation_files WHERE id = ?',
        [req.params.id]
      );

      if (!rows.length) {
        return res.status(404).json({ error: 'File record not found' });
      }

      const file = rows[0];
      const filePath = path.join(process.env.UPLOAD_DIR || './uploads', file.file_name);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await db.query('DELETE FROM accreditation_files WHERE id = ?', [req.params.id]);

      res.json({ message: 'Accreditation file deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete accreditation file' });
    }
  }
);

module.exports = router;