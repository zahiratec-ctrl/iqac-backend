// backend/routes/events.js
const express  = require('express');
const upload   = require('../middleware/upload');
const db       = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ── Scope helper: which events can this user see? ────────
function buildWhereClause(user, extraWhere = '') {
  const conditions = [];
  const params     = [];

  if (user.role === 'iqac_dept') {
    conditions.push("status = 'Approved'");
    if (user.department && user.department !== '—') {
      conditions.push('department = ?');
      params.push(user.department);
    }
  } else if (['hod','iqac'].includes(user.role) && user.department && user.department !== '—') {
    conditions.push('department = ?');
    params.push(user.department);
  } else if (user.role === 'faculty') {
    conditions.push('submitted_by = ?');
    params.push(user.empid);
  }
  // principal / accounts → all events

  if (extraWhere) conditions.push(extraWhere);
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  return { where, params };
}

// ── GET /api/events ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let extra = '';
    const extraParams = [];
    if (status) { extra += (extra ? ' AND ' : '') + 'status = ?'; extraParams.push(status); }
    if (search) {
      const like = `%${search}%`;
      extra += (extra ? ' AND ' : '') + '(name LIKE ? OR department LIKE ? OR coordinator LIKE ?)';
      extraParams.push(like, like, like);
    }
    const { where, params } = buildWhereClause(req.user, extra);
    const [rows] = await db.query(`SELECT * FROM events ${where} ORDER BY created_at DESC`, [...params, ...extraParams]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ── GET /api/events/:id ──────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// ── POST /api/events ─────────────────────────────────────
router.post('/', upload.fields([
  { name: 'brochure', maxCount: 1 },
  { name: 'budget_file', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      name, department, type, beneficiary, participants,
      event_date, academic_year, coordinator, remarks,
      budget_total, budget_rows
    } = req.body;

    if (!name || !department || !type)
      return res.status(400).json({ error: 'name, department and type are required' });

    const brochure    = req.files?.brochure?.[0]?.filename    || '—';
    const budget_file = req.files?.budget_file?.[0]?.filename || '—';
    const initialStatus =
    department === 'IQAC' ? 'Pending Principal' : 'Pending HOD';

     const approvalMessage =
    department === 'IQAC'
    ? 'Event submitted directly for Principal approval'
    : 'Event submitted for HOD approval';

    const [result] = await db.query(`
      INSERT INTO events
        (name, department, type, beneficiary, participants, event_date, academic_year,
         coordinator, remarks, brochure_file, budget_file, budget_total, budget_rows,
         status, submitted_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [name, department, type, beneficiary, parseInt(participants)||0,
       event_date||null, academic_year, coordinator, remarks||'',
       brochure, budget_file, parseFloat(budget_total)||0,
       budget_rows || '[]', initialStatus, req.user.empid]
    );
    res.status(201).json({ id: result.insertId, message: approvalMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/// ── PATCH /api/events/:id/approve ────────────────────────
router.patch('/:id/approve', async (req, res) => {
  try {
    const { remarks } = req.body;

    const [rows] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Event not found' });

    const ev   = rows[0];
    const role = req.user.role;
    const dept = req.user.department;

    const flow = {
      'Pending HOD': 'Pending IQAC',
      'Pending IQAC': 'Pending Principal',
      'Pending Principal': 'Approved'
    };

    const allowed = {
      'Pending HOD': 'hod',
      'Pending IQAC': 'iqac',
      'Pending Principal': 'principal'
    };

    if (allowed[ev.status] !== role) {
      return res.status(403).json({
        error: `Only ${allowed[ev.status]} can approve at this stage`
      });
    }

    if (['hod','iqac'].includes(role) && dept !== '—' && ev.department !== dept) {
      return res.status(403).json({
        error: 'You can only approve events from your department'
      });
    }

    let remarkColumn = '';

    if (role === 'hod') remarkColumn = 'hod_remarks';
    if (role === 'iqac') remarkColumn = 'iqac_remarks';
    if (role === 'principal') remarkColumn = 'principal_remarks';

    const nextStatus = flow[ev.status] || 'Approved';

    const finalRemarks =
      `${role.toUpperCase()} approved: ${remarks || 'No remarks'}`;

    await db.query(
      `UPDATE events
       SET status = ?,
           ${remarkColumn} = ?,
           final_remarks = ?
       WHERE id = ?`,
      [nextStatus, remarks || '', finalRemarks, ev.id]
    );

    res.json({
      message: `Event moved to: ${nextStatus}`,
      status: nextStatus,
      remarks: finalRemarks
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve event' });
  }
});

// ── PATCH /api/events/:id/reject ─────────────────────────
router.patch('/:id/reject', async (req, res) => {
  try {
    const { remarks } = req.body;

    const [rows] = await db.query('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Event not found' });

    const ev   = rows[0];
    const role = req.user.role;
    const dept = req.user.department;

    const allowed = {
      'Pending HOD': 'hod',
      'Pending IQAC': 'iqac',
      'Pending Principal': 'principal'
    };

    if (allowed[ev.status] !== role) {
      return res.status(403).json({
        error: `Only ${allowed[ev.status]} can reject at this stage`
      });
    }

    if (['hod','iqac'].includes(role) && dept !== '—' && ev.department !== dept) {
      return res.status(403).json({
        error: 'You can only reject events from your department'
      });
    }

    let remarkColumn = '';

    if (role === 'hod') remarkColumn = 'hod_remarks';
    if (role === 'iqac') remarkColumn = 'iqac_remarks';
    if (role === 'principal') remarkColumn = 'principal_remarks';

    const finalRemarks =
      `${role.toUpperCase()} rejected: ${remarks || 'No remarks'}`;

    await db.query(
      `UPDATE events
       SET status = 'Rejected',
           ${remarkColumn} = ?,
           rejected_by = ?,
           final_remarks = ?
       WHERE id = ?`,
      [remarks || '', role, finalRemarks, ev.id]
    );

    res.json({
      message: 'Event rejected',
      status: 'Rejected',
      remarks: finalRemarks
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject event' });
  }
});
module.exports = router;
