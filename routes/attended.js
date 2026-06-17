// backend/routes/attended.js — PostgreSQL version
const express = require('express');
const upload  = require('../middleware/upload');
const db      = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function pg(sql, params = []) {
  let i = 0;
  return db.query(sql.replace(/\?/g, () => `$${++i}`), params);
}

// GET /api/attended
router.get('/', async (req, res) => {
  try {
    const conditions = [], params = [];
    const { role, department, empid } = req.user;

    if (role === 'faculty') {
      conditions.push('submitted_by = ?'); params.push(empid);
    } else if (['hod','iqac','iqac_dept'].includes(role) && department && department !== '—') {
      conditions.push('department = ?'); params.push(department);
    }

    const where  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await pg(`SELECT * FROM events_attended ${where} ORDER BY created_at DESC`, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// POST /api/attended
router.post('/', upload.single('proof'), async (req, res) => {
  try {
    const { faculty_name, department, event_name, event_type, event_date, academic_year } = req.body;

    if (!faculty_name || !department || !event_name)
      return res.status(400).json({ error: 'faculty_name, department and event_name are required' });

    const proof  = req.file?.filename || '—';
    const result = await pg(`
      INSERT INTO events_attended
        (faculty_name, department, event_name, event_type, event_date, academic_year, proof_file, submitted_by)
      VALUES (?,?,?,?,?,?,?,?)
      RETURNING id`,
      [faculty_name, department, event_name, event_type||'', event_date||null,
       academic_year||'', proof, req.user.empid]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'Record saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save record' });
  }
});

// DELETE /api/attended/:id
router.delete('/:id', async (req, res) => {
  try {
    await pg('DELETE FROM events_attended WHERE id = ?', [req.params.id]);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

module.exports = router;
