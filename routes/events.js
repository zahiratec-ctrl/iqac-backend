// backend/routes/events.js — Supabase Storage + closed-loop edit/reply version
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

function roleOf(req) {
  return String(req.user?.role || '').toLowerCase();
}

function canEditEvent(req, ev) {
  const role = roleOf(req);

  if (['iqac', 'principal'].includes(role)) return true;

  if (
    ['hod', 'iqac_dept'].includes(role) &&
    req.user.department &&
    req.user.department === ev.department
  ) return true;

  return String(ev.submitted_by || '') === String(req.user.empid || '');
}

async function addThread(recordId, req, action, message, toRole = null) {
  if (!message && !action) return;

  try {
    await pg(
      `INSERT INTO iqac_remark_threads
        (record_type, record_id, action, message, from_role, to_role, created_by, created_by_empid)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        'event',
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
    console.warn('Event thread insert warning:', err.message);
  }
}

/*
FLOW VISIBILITY:
Faculty   → only own events
HOD       → all events of own department
IQAC      → all departments
Principal → all departments
*/
function buildWhereClause(user, extraWhere = '') {
  const conditions = [];
  const params = [];

  const role = String(user.role || '').toLowerCase();

  if (role === 'faculty') {
    conditions.push('submitted_by = ?');
    params.push(user.empid);
  }

  else if (role === 'hod' || role === 'iqac_dept') {
    if (user.department && user.department !== '—' && user.department !== '-') {
      conditions.push('department = ?');
      params.push(user.department);
    }
  }

  // IQAC Coordinator and Principal must see all departments.
  // No department filter for iqac or principal.

  if (extraWhere) {
    conditions.push(extraWhere);
  }

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
    console.error('Events fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pg('SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const ev = result.rows[0];
    const role = roleOf(req);

    if (role === 'faculty' && String(ev.submitted_by) !== String(req.user.empid)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (
      (role === 'hod' || role === 'iqac_dept') &&
      req.user.department &&
      req.user.department !== ev.department
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json(ev);
  } catch (err) {
    console.error('Event fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

router.get('/:id/thread', async (req, res) => {
  try {
    const evRes = await pg('SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!evRes.rows.length) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const ev = evRes.rows[0];

    if (!canEditEvent(req, ev) && roleOf(req) === 'faculty') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await pg(
      `SELECT * FROM iqac_remark_threads
       WHERE record_type = 'event' AND record_id = ?
       ORDER BY created_at ASC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Event thread fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch remark thread' });
  }
});

router.post(
  '/',
  upload.fields([
    { name: 'brochure', maxCount: 1 },
    { name: 'budget_file', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const {
        name,
        department,
        type,
        beneficiary,
        participants,
        event_date,
        academic_year,
        coordinator,
        remarks,
        budget_total,
        budget_rows
      } = req.body;

      if (!name || !department || !type) {
        return res.status(400).json({
          error: 'name, department and type are required'
        });
      }

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

      const initialStatus = department === 'IQAC'
        ? 'Pending Principal'
        : 'Pending HOD';

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
        [
          name,
          department,
          type,
          beneficiary,
          parseInt(participants) || 0,
          event_date || null,
          academic_year,
          coordinator,
          remarks || '',
          brochure,
          budget_file,
          parseFloat(budget_total) || 0,
          budget_rows || '[]',
          initialStatus,
          req.user.empid
        ]
      );

      await addThread(
        result.rows[0].id,
        req,
        'Submitted',
        'Event requisition submitted for approval.',
        department === 'IQAC' ? 'principal' : 'hod'
      );

      res.status(201).json({
        id: result.rows[0].id,
        message: approvalMessage
      });
    } catch (err) {
      console.error('Event create error:', err);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }
);

// PUT /api/events/:id — edit data and/or re-upload documents
router.put(
  '/:id',
  upload.fields([
    { name: 'brochure', maxCount: 1 },
    { name: 'budget_file', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const oldRes = await pg('SELECT * FROM events WHERE id = ?', [req.params.id]);

      if (!oldRes.rows.length) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const old = oldRes.rows[0];

      if (!canEditEvent(req, old)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const {
        name,
        department,
        type,
        beneficiary,
        participants,
        event_date,
        academic_year,
        coordinator,
        remarks,
        budget_total,
        budget_rows,
        faculty_reply
      } = req.body;

      let brochure = old.brochure_file || '—';
      let budget_file = old.budget_file || '—';

      if (req.files?.brochure?.[0]) {
        const stored = await uploadBuffer('events', req.files.brochure[0]);
        await deleteFile(old.brochure_file);
        brochure = stored.path;
      }

      if (req.files?.budget_file?.[0]) {
        const stored = await uploadBuffer('events', req.files.budget_file[0]);
        await deleteFile(old.budget_file);
        budget_file = stored.path;
      }

      const submittedByOwner =
        String(old.submitted_by || '') === String(req.user.empid || '');

      let nextStatus = old.status;

      if (
        submittedByOwner &&
        ['Rejected', 'Faculty Replied', 'Resubmitted'].includes(String(old.status))
      ) {
        nextStatus = (department || old.department) === 'IQAC'
          ? 'Pending Principal'
          : 'Pending HOD';
      }

      await pg(
        `UPDATE events SET
          name = ?, department = ?, type = ?, beneficiary = ?, participants = ?,
          event_date = ?, academic_year = ?, coordinator = ?, remarks = ?,
          brochure_file = ?, budget_file = ?, budget_total = ?, budget_rows = ?,
          status = ?
         WHERE id = ?`,
        [
          name || old.name,
          department || old.department,
          type || old.type,
          beneficiary || old.beneficiary,
          parseInt(participants) || old.participants || 0,
          event_date || old.event_date,
          academic_year || old.academic_year,
          coordinator || old.coordinator,
          remarks ?? old.remarks ?? '',
          brochure,
          budget_file,
          parseFloat(budget_total) || old.budget_total || 0,
          budget_rows || old.budget_rows || '[]',
          nextStatus,
          old.id
        ]
      );

      await addThread(
        old.id,
        req,
        'Edited/Reuploaded',
        faculty_reply || 'Event data/documents updated and resubmitted.',
        'reviewer'
      );

      res.json({
        message: 'Event updated successfully',
        status: nextStatus
      });
    } catch (err) {
      console.error('Event update error:', err);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }
);

// POST /api/events/:id/reply — faculty reply to remarks
router.post('/:id/reply', async (req, res) => {
  try {
    const { message } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Reply message is required' });
    }

    const result = await pg('SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const ev = result.rows[0];
    const role = roleOf(req);
    const isOwner = String(ev.submitted_by || '') === String(req.user.empid || '');

    if (!isOwner && !['hod', 'iqac', 'principal'].includes(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    let nextStatus = ev.status;

    if (isOwner) {
      nextStatus = ev.department === 'IQAC'
        ? 'Pending Principal'
        : 'Pending HOD';

      await pg(
        `UPDATE events SET status = ?, final_remarks = ? WHERE id = ?`,
        [nextStatus, `Faculty replied/resubmitted: ${message}`, ev.id]
      );
    }

    await addThread(
      ev.id,
      req,
      isOwner ? 'Faculty Reply / Resubmission' : 'Reviewer Remark',
      message,
      isOwner ? 'reviewer' : 'faculty'
    );

    res.json({
      message: 'Reply saved successfully',
      status: nextStatus
    });
  } catch (err) {
    console.error('Event reply error:', err);
    res.status(500).json({ error: 'Failed to save reply' });
  }
});

router.patch('/:id/approve', async (req, res) => {
  try {
    const { remarks } = req.body;

    const result = await pg('SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const ev = result.rows[0];
    const role = roleOf(req);
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

    // Only HOD is department restricted.
    // IQAC and Principal must approve all departments.
    if (
      role === 'hod' &&
      dept &&
      dept !== '—' &&
      dept !== '-' &&
      ev.department !== dept
    ) {
      return res.status(403).json({
        error: 'You can only approve events from your department'
      });
    }

    const remarkColumn =
      role === 'hod'
        ? 'hod_remarks'
        : role === 'iqac'
          ? 'iqac_remarks'
          : 'principal_remarks';

    const nextStatus = flow[ev.status] || 'Approved';
    const finalRemarks = `${role.toUpperCase()} approved: ${remarks || 'No remarks'}`;

    await pg(
      `UPDATE events SET status = ?, ${remarkColumn} = ?, final_remarks = ? WHERE id = ?`,
      [nextStatus, remarks || '', finalRemarks, ev.id]
    );

    if (remarks) {
      await addThread(ev.id, req, 'Approval Remark', remarks, 'faculty');
    }

    res.json({
      message: `Event moved to: ${nextStatus}`,
      status: nextStatus,
      remarks: finalRemarks
    });
  } catch (err) {
    console.error('Event approve error:', err);
    res.status(500).json({ error: 'Failed to approve event' });
  }
});

router.patch('/:id/reject', async (req, res) => {
  try {
    const { remarks } = req.body;

    const result = await pg('SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const ev = result.rows[0];
    const role = roleOf(req);
    const dept = req.user.department;

    const allowed = {
      'Pending HOD': 'hod',
      'Pending IQAC': 'iqac',
      'Pending Principal': 'principal'
    };

    if (allowed[ev.status] !== role) {
      return res.status(403).json({
        error: `Only ${allowed[ev.status]} can return/reject at this stage`
      });
    }

    // Only HOD is department restricted.
    // IQAC and Principal must return/reject all departments.
    if (
      role === 'hod' &&
      dept &&
      dept !== '—' &&
      dept !== '-' &&
      ev.department !== dept
    ) {
      return res.status(403).json({
        error: 'You can only return/reject events from your department'
      });
    }

    const remarkColumn =
      role === 'hod'
        ? 'hod_remarks'
        : role === 'iqac'
          ? 'iqac_remarks'
          : 'principal_remarks';

    const finalRemarks = `${role.toUpperCase()} returned/rejected: ${remarks || 'No remarks'}`;

    await pg(
      `UPDATE events SET status = 'Rejected', ${remarkColumn} = ?, rejected_by = ?, final_remarks = ? WHERE id = ?`,
      [remarks || '', role, finalRemarks, ev.id]
    );

    await addThread(
      ev.id,
      req,
      'Returned with Remarks',
      remarks || 'Returned for correction.',
      'faculty'
    );

    res.json({
      message: 'Event returned/rejected',
      status: 'Rejected',
      remarks: finalRemarks
    });
  } catch (err) {
    console.error('Event reject error:', err);
    res.status(500).json({ error: 'Failed to reject event' });
  }
});

router.get('/:id/docs/:type', async (req, res) => {
  try {
    const { id, type } = req.params;

    const result = await pg(
      'SELECT brochure_file, budget_file, name FROM events WHERE id = ?',
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const row = result.rows[0];

    const filePath =
      type === 'brochure'
        ? row.brochure_file
        : type === 'budget'
          ? row.budget_file
          : null;

    if (!filePath || filePath === '—') {
      return res.status(404).json({ error: 'Document not uploaded' });
    }

    return downloadToResponse(
      filePath,
      res,
      `${row.name || 'event'}-${type}`
    );
  } catch (err) {
    console.error('Event document download error:', err);
    res.status(500).json({ error: 'Unable to view document' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pg('SELECT * FROM events WHERE id = ?', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const ev = result.rows[0];

    if (!canEditEvent(req, ev)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await deleteFile(ev.brochure_file);
    await deleteFile(ev.budget_file);

    await pg('DELETE FROM events WHERE id = ?', [req.params.id]);

    await pg(
      `DELETE FROM iqac_remark_threads WHERE record_type = 'event' AND record_id = ?`,
      [req.params.id]
    );

    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Event delete error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;