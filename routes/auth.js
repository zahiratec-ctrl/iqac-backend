// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Helper: normalize role values from frontend/backend
function normRole(role) {
  return String(role || '').trim().toLowerCase();
}

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

    const cleanRole = normRole(role);

    // Allow same empid+email with a DIFFERENT role
    const existing = await pool.query(
      'SELECT id FROM users WHERE empid = $1 AND email = $2 AND role = $3',
      [empid, email, cleanRole]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'This Employee ID is already registered with the same role. Choose a different role to add another account.'
      });
    }

    const hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users
      (empid, email, role, department, password_hash)
      VALUES ($1,$2,$3,$4,$5)`,
      [empid, email, cleanRole, department || '-', hash]
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
  const { empid, password, role } = req.body;

  try {
    if (!empid || !password || !role) {
      return res.status(400).json({ error: 'Employee ID, role and password are required' });
    }

    const cleanRole = normRole(role);

    const result = await pool.query(
      'SELECT * FROM users WHERE empid = $1 AND role = $2',
      [empid, cleanRole]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid Employee ID, role or password' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Employee ID, role or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        empid: user.empid,
        email: user.email,
        role: user.role,
        department: user.department
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        empid: user.empid,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT empid, email, role, department FROM users WHERE empid = $1 AND role = $2 LIMIT 1',
      [req.user.empid, req.user.role]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Auth check error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { empid, email } = req.body;

    if (!empid || !email) {
      return res.status(400).json({ error: 'Employee ID and email are required' });
    }

    const result = await pool.query(
      'SELECT empid, email FROM users WHERE empid = $1 AND email = $2 LIMIT 1',
      [empid, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee ID and email not found' });
    }

    // Frontend expects reset_token.
    const resetToken = jwt.sign(
      { empid, email, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      message: 'Identity verified',
      reset_token: resetToken
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, empid, password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    let resetEmpid = empid;

    // Current frontend sends token + password.
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.purpose !== 'password_reset') {
          return res.status(400).json({ error: 'Invalid reset token' });
        }
        resetEmpid = decoded.empid;
      } catch (_err) {
        return res.status(401).json({ error: 'Reset link expired. Please verify identity again.' });
      }
    }

    if (!resetEmpid) {
      return res.status(400).json({ error: 'Employee ID or reset token required' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Update all role accounts under same Employee ID.
    // This avoids different passwords for IQAC/Faculty/HOD accounts of same employee.
    const updated = await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE empid = $2
       RETURNING id`,
      [hashedPassword, resetEmpid]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Employee ID not found' });
    }

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({
      error: 'Password reset failed'
    });
  }
});

module.exports = router;
