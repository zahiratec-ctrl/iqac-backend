// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // Your database connection file
const { authMiddleware } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { empid, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE empid = $1', [empid]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid Employee ID or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Employee ID or password' });
    }

    const token = jwt.sign(
      { id: user.id, empid: user.empid, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { empid: user.empid, email: user.email, role: user.role, department: user.department }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT empid, email, role, department FROM users WHERE empid = $1', [req.user.empid]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Auth check error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; // <--- The crucial export statement Express needs!
