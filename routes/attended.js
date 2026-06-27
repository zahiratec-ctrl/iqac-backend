// backend/routes/attended.js — Supabase Storage + closed-loop edit/reply version
const express = require('express');
const upload = require('../middleware/upload');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { uploadBuffer, downloadToResponse, deleteFile } = require('../utils/supabaseStorage');

const router = express.Router();
router.use(authMiddleware);

function pg(sql, params = []) {
  let i = 0;
  return db.query(sql.replace(/\?/g, () => `$${++i}`), params);
}

function roleOf(req) {
  return String(req.user?.role || '').toLowerCase();
}

function canEditAttended(req, row) {
  const role = roleOf(req);

  if (['iqac', 'principal'].includes(role)) return true;

  if (
    ['hod', 'iqac_dept'].includes(role) &&
    req.user.department &&
    req.user.department === row.department
  ) return true;

  return String(row.submitted_by || '') === String(req.user.empid || '');
}

async function addThread(recordId, req, action, message, toRole = null) {
  if (!message && !action) return;

  try {
    await pg(
      `INSERT INTO iqac_remark_threads
        (record_type, record_id, action, message, from_role, to_role, created_by, created_by_empid)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        'attended',
        recordId,
        action || '',
        message || '',
        roleOf(req),
        toRole || '',
        req.user.email || req.user.empid || '',
        req.user.empid || ''
      ]
    );
  } catch (err) {
    console.warn('Attended thread insert warning:', err.message);
  }
}

// GET /api/attended
router.get('/', async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    const role = roleOf(req);
    const department = req.user.department;
    const empid = req.user.empid;

    if (role === 'faculty') {
      conditions.push('submitted_by = ?');
      params.push(empid);
    }

    else if (role === 'hod' || role === 'iqac_dept') {
      if (department && department !== '—' && department !== '-') {
        conditions.push('department = ?');
        params.push(department);
      }
    }

    // IQAC Coordinator and Principal see ALL departments.
    // No department filter for iqac or principal.

    const where = conditions.length
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const result = await pg(
      `SELECT *
       FROM events_attended
       ${where}
       ORDER BY created_at DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Attended fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// GET /api/attended/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pg(
      'SELECT * FROM events_attended WHERE id = ?',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const row = result.rows[0];

    if (!canEditAttended(req, row)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json(row);
  } catch (err) {
    console.error('Attended fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// GET /api/attended/:id/thread
router.get('/:id/thread', async (req, res) => {
  try {
    const record = await pg(
      'SELECT * FROM events_attended WHERE id = ?',
      [req.params.id]
    );

    if (!record.rows.length) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (!canEditAttended(req, record.rows[0])) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await pg(
      `SELECT *
       FROM iqac_remark_threads
       WHERE record_type = 'attended'
       AND record_id = ?
       ORDER BY created_at ASC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Attended thread fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch remark thread' });
  }
});

// POST /api/attended
router.post('/', upload.single('proof'), async (req, res) => {
  try {
    const {
      faculty_name,
      department,
      event_name,
      event_type,
      event_date,
      academic_year
    } = req.body;

    if (!faculty_name || !department || !event_name) {
      return res.status(400).json({
        error: 'faculty_name, department and event_name are required'
      });
    }

    let proof = '—';

    if (req.file) {
      const stored = await uploadBuffer('attended', req.file);
      proof = stored.path;
    }

    const result = await pg(
      `INSERT INTO events_attended
        (faculty_name, department, event_name, event_type, event_date,
         academic_year, proof_file, submitted_by, status)
       VALUES (?,?,?,?,?,?,?,?,?)
       RETURNING id`,
      [
        faculty_name,
        department,
        event_name,
        event_type || '',
        event_date || null,
        academic_year || '',
        proof,
        req.user.empid,
        'Submitted'
      ]
    );

    await addThread(
      result.rows[0].id,
      req,
      'Submitted',
      'Events-attended record submitted.',
      'hod'
    );

    res.status(201).json({
      id: result.rows[0].id,
      message: 'Record saved'
    });
  } catch (err) {
    console.error('Attended save error:', err);
    res.status(500).json({ error: 'Failed to save record' });
  }
});

// PUT /api/attended/:id — edit data and/or re-upload proof
router.put('/:id', upload.single('proof'), async (req, res) => {
  try {
    const oldRes = await pg(
      'SELECT * FROM events_attended WHERE id = ?',
      [req.params.id]
    );

    if (!oldRes.rows.length) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const old = oldRes.rows[0];

    if (!canEditAttended(req, old)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const {
      faculty_name,
      department,
      event_name,
      event_type,
      event_date,
      academic_year,
      faculty_reply
    } = req.body;

    let proof = old.proof_file || '—';

    if (req.file) {
      const stored = await uploadBuffer('attended', req.file);
      await deleteFile(old.proof_file);
      proof = stored.path;
    }

    await pg(
      `UPDATE events_attended SET
        faculty_name = ?,
        department = ?,
        event_name = ?,
        event_type = ?,
        event_date = ?,
        academic_year = ?,
        proof_file = ?,
        status = ?
       WHERE id = ?`,
      [
        faculty_name || old.faculty_name,
        department || old.department,
        event_name || old.event_name,
        event_type || old.event_type,
        event_date || old.event_date,
        academic_year || old.academic_year,
        proof,
        'Resubmitted',
        old.id
      ]
    );

    await addThread(
      old.id,
      req,
      'Edited/Reuploaded',
      faculty_reply || 'Events-attended data/proof updated and resubmitted.',
      'reviewer'
    );

    res.json({ message: 'Record updated successfully' });
  } catch (err) {
    console.error('Attended update error:', err);
    res.status(500).json({ error: 'Failed to update record' });
  }
});

// POST /api/attended/:id/reply — faculty/reviewer closed-loop reply
router.post('/:id/reply', async (req, res) => {
  try {
    const { message } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Reply message is required' });
    }

    const result = await pg(
      'SELECT * FROM events_attended WHERE id = ?',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const row = result.rows[0];

    if (!canEditAttended(req, row)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const isOwner =
      String(row.submitted_by || '') === String(req.user.empid || '');

    const status = isOwner ? 'Faculty Replied' : 'Remark Given';

    await pg(
      `UPDATE events_attended SET status = ? WHERE id = ?`,
      [status, row.id]
    );

    await addThread(
      row.id,
      req,
      isOwner ? 'Faculty Reply' : 'Reviewer Remark',
      message,
      isOwner ? 'reviewer' : 'faculty'
    );

    res.json({
      message: 'Reply saved successfully',
      status
    });
  } catch (err) {
    console.error('Attended reply error:', err);
    res.status(500).json({ error: 'Failed to save reply' });
  }
});

// GET /api/attended/:id/proof
router.get('/:id/proof', async (req, res) => {
  try {
    const result = await pg(
      'SELECT * FROM events_attended WHERE id = ?',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const row = result.rows[0];

    if (!canEditAttended(req, row)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    return downloadToResponse(
      row.proof_file,
      res,
      row.event_name || 'proof'
    );
  } catch (err) {
    console.error('Attended proof download error:', err);
    res.status(500).json({ error: 'Unable to download proof' });
  }
});

// DELETE /api/attended/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pg(
      'SELECT * FROM events_attended WHERE id = ?',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (!canEditAttended(req, result.rows[0])) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await deleteFile(result.rows[0].proof_file);

    await pg(
      'DELETE FROM events_attended WHERE id = ?',
      [req.params.id]
    );

    await pg(
      `DELETE FROM iqac_remark_threads
       WHERE record_type = 'attended'
       AND record_id = ?`,
      [req.params.id]
    );

    res.json({ message: 'Record deleted' });
  } catch (err) {
    console.error('Attended delete error:', err);
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

module.exports = router;
