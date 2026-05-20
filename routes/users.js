// backend/routes/users.js
const express = require('express');
const db      = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('iqac','principal'));

// ── GET /api/users ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, empid, email, role, department, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── DELETE /api/users/:id ────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ error: 'You cannot delete your own account' });
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ── GET /api/dashboard ───────────────────────────────────
// Summary stats for dashboard
router.get('/', async (req, res) => {
  res.json({ message: 'users ok' });
});

module.exports = router;
