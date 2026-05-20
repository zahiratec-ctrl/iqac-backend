// backend/routes/auth.js
const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

// ── POST /api/auth/register ──────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { empid, email, role, department, password } = req.body;
    if (!empid || !email || !role || !password)
      return res.status(400).json({ error: 'empid, email, role and password are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const [existing] = await db.query(
      'SELECT id FROM users WHERE empid = ? OR email = ?', [empid, email]
    );
    if (existing.length)
      return res.status(409).json({ error: 'Employee ID or Email already registered' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.query(
      'INSERT INTO users (empid, email, role, department, password_hash) VALUES (?,?,?,?,?)',
      [empid, email, role, department || '—', hash]
    );
    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { empid, password } = req.body;
    if (!empid || !password)
      return res.status(400).json({ error: 'empid and password are required' });

    const [rows] = await db.query(
      'SELECT * FROM users WHERE empid = ?', [empid]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'No account found with this Employee ID' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ error: 'Incorrect password' });

    const token = jwt.sign(
      { id: user.id, empid: user.empid, role: user.role, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    res.json({
      token,
      user: { id: user.id, empid: user.empid, email: user.email, role: user.role, department: user.department }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ── POST /api/auth/forgot-password ──────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { empid, email } = req.body;
    if (!empid || !email)
      return res.status(400).json({ error: 'empid and email are required' });

    const [rows] = await db.query(
      'SELECT id FROM users WHERE empid = ? AND email = ?', [empid, email]
    );
    if (!rows.length)
      return res.status(404).json({ error: 'No account found with this Employee ID and Email' });

    // Delete any existing unused tokens for this user
    await db.query('DELETE FROM password_resets WHERE empid = ?', [empid]);

    const token   = uuidv4();
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    await db.query(
      'INSERT INTO password_resets (empid, token, expires_at) VALUES (?,?,?)',
      [empid, token, expires]
    );
    // In production: send token via email. For this demo we return it directly.
    res.json({ message: 'Verification successful', reset_token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/reset-password ───────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: 'token and password are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const [rows] = await db.query(
      'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > NOW()',
      [token]
    );
    if (!rows.length)
      return res.status(400).json({ error: 'Reset token is invalid or has expired' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.query('UPDATE users SET password_hash = ? WHERE empid = ?', [hash, rows[0].empid]);
    await db.query('UPDATE password_resets SET used = 1 WHERE token = ?', [token]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, empid, email, role, department, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
