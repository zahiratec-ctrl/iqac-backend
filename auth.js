// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // Your database connection file
const { authMiddleware } = require('../middleware/auth');
// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { empid, email, role, department, password } = req.body;

    if (!empid || !email || !role || !password) {
      return res.status(400).json({
        error: 'empid, email, role and password are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters'
      });
    }

    // Check existing user
    const existing = await pool.query(
      'SELECT id FROM users WHERE empid = $1 OR email = $2',
      [empid, email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Employee ID or Email already registered'
      });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 12);

    // Insert user
    await pool.query(
      `INSERT INTO users
      (empid, email, role, department, password_hash)
      VALUES ($1,$2,$3,$4,$5)`,
      [empid, email, role, department || '-', hash]
    );

    res.status(201).json({
      message: 'Account created successfully'
    });

  } catch (err) {
    console.error('Registration Error:', err);

    res.status(500).json({
      error: 'Server error during registration'
    });
  }
});
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
      { id: user.id, empid: user.empid, role: user.role, department: user.department },
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
