// backend/routes/events.js — Supabase Storage version
const express = require('express');
const upload = require('../middleware/upload');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { uploadBuffer, downloadToResponse, deleteFile } = require('../utils/supabaseStorage');

const router = express.Router();
router.use(authMiddleware);

function pg(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  return db.query(pgSql, params);
}

function buildWhereClause(user, extraWhere = '') {
  const conditions = [];
  const params = [];

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

  if (extraWhere) conditions.push(extraWhere);
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  return { where, params };
}

router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let extra = '';
    const extraParams = [];

    if (status) {
      extra += (extra ? ' AND ' : '') + 'status = ?';
      extraParams.push(status);
    }
    if (search) {
      const like = `%${search}%`;
      extra += (extra ? ' AND ' : '') + '(name ILIKE ? OR department ILIKE ? OR coordinator ILIKE ?)';
      extraParams.push(like, like, like);
    }

    const { where, params } = buildWhereClause(req.user, extra);
    const result = await pg(
      `SELECT * FROM events ${where} ORDER BY created_at DESC`,
      [...params, ...extraParams]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pg('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

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

    let brochure = '—';
    let budget_file = '—';

    if (req.files?.brochure?.[0]) {
      const stored = await uploadBuffer('events', req.files.brochure[0]);
      brochure = stored.path;
    }

    if (req.files?.budget_file?.[0]) {
      const stored = await uploadBuffer('events', req.files.budget_file[0]);
      budget_file = stored.path;
    }

    const initialStatus = department === 'IQAC' ? 'Pending Principal' : 'Pending HOD';
    const approvalMessage = department === 'IQAC'
      ? 'Event submitted directly for Principal approval'
      : 'Event submitted for HOD approval';

    const result = await pg(
      `INSERT INTO events
        (name, department, type, beneficiary, participants, event_date, academic_year,
         coordinator, remarks, brochure_file, budget_file, budget_total, budget_rows,
         status, submitted_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       RETURNING id`,
      [name, department, type, beneficiary, parseInt(participants) || 0,
       event_date || null, academic_year, coordinator, remarks || '',
       brochure, budget_file, parseFloat(budget_total) || 0,
       budget_rows || '[]', initialStatus, req.user.empid]
    );

    res.status(201).json({ id: result.rows[0].id, message: approvalMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.patch('/:id/approve', async (req, res) => {
  try {
    const { remarks } = req.body;
    const result = await pg('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });

    const ev = result.rows[0];
    const role = req.user.role;
    const dept = req.user.department;

    const flow = { 'Pending HOD': 'Pending IQAC', 'Pending IQAC': 'Pending Principal', 'Pending Principal': 'Approved' };
    const allowed = { 'Pending HOD': 'hod', 'Pending IQAC': 'iqac', 'Pending Principal': 'principal' };

    if (allowed[ev.status] !== role)
      return res.status(403).json({ error: `Only ${allowed[ev.status]} can approve at this stage` });

    if (['hod','iqac'].includes(role) && dept !== '—' && ev.department !== dept)
      return res.status(403).json({ error: 'You can only approve events from your department' });

    const remarkColumn = role === 'hod' ? 'hod_remarks' : role === 'iqac' ? 'iqac_remarks' : 'principal_remarks';
    const nextStatus = flow[ev.status] || 'Approved';
    const finalRemarks = `${role.toUpperCase()} approved: ${remarks || 'No remarks'}`;

    await pg(
      `UPDATE events SET status = ?, ${remarkColumn} = ?, final_remarks = ? WHERE id = ?`,
      [nextStatus, remarks || '', finalRemarks, ev.id]
    );

    res.json({ message: `Event moved to: ${nextStatus}`, status: nextStatus, remarks: finalRemarks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve event' });
  }
});

router.patch('/:id/reject', async (req, res) => {
  try {
    const { remarks } = req.body;
    const result = await pg('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });

    const ev = result.rows[0];
    const role = req.user.role;
    const dept = req.user.department;

    const allowed = { 'Pending HOD': 'hod', 'Pending IQAC': 'iqac', 'Pending Principal': 'principal' };

    if (allowed[ev.status] !== role)
      return res.status(403).json({ error: `Only ${allowed[ev.status]} can reject at this stage` });

    if (['hod','iqac'].includes(role) && dept !== '—' && ev.department !== dept)
      return res.status(403).json({ error: 'You can only reject events from your department' });

    const remarkColumn = role === 'hod' ? 'hod_remarks' : role === 'iqac' ? 'iqac_remarks' : 'principal_remarks';
    const finalRemarks = `${role.toUpperCase()} rejected: ${remarks || 'No remarks'}`;

    await pg(
      `UPDATE events SET status = 'Rejected', ${remarkColumn} = ?, rejected_by = ?, final_remarks = ? WHERE id = ?`,
      [remarks || '', role, finalRemarks, ev.id]
    );

    res.json({ message: 'Event rejected', status: 'Rejected', remarks: finalRemarks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject event' });
  }
});

router.get('/:id/docs/:type', async (req, res) => {
  try {
    const { id, type } = req.params;
    const result = await pg('SELECT brochure_file, budget_file, name FROM events WHERE id = ?', [id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });

    const row = result.rows[0];
    const filePath = type === 'brochure' ? row.brochure_file : type === 'budget' ? row.budget_file : null;

    if (!filePath || filePath === '—') return res.status(404).json({ error: 'Document not uploaded' });

    return downloadToResponse(filePath, res, `${row.name || 'event'}-${type}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to view document' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pg('SELECT brochure_file, budget_file FROM events WHERE id = ?', [req.params.id]);
    if (result.rows.length) {
      await deleteFile(result.rows[0].brochure_file);
      await deleteFile(result.rows[0].budget_file);
    }
    await pg('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
