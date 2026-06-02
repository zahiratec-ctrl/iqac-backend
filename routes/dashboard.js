// backend/routes/dashboard.js
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { role, department, empid } = req.user;

    const full = ['iqac', 'principal'].includes(role);
    const dept = (!full && department && department !== '—') ? department : null;
    const isFac = role === 'faculty';

    const deptFilter = dept ? 'AND department = ?' : '';
    const deptParam = dept ? [dept] : [];

    // FACULTY DASHBOARD
    if (isFac) {
      const [[evRows]] = await db.query(
        'SELECT COUNT(*) AS cnt, SUM(status="Approved") AS approved FROM events WHERE submitted_by = ?',
        [empid]
      );

      const [[attRows]] = await db.query(
        'SELECT COUNT(*) AS cnt FROM events_attended WHERE submitted_by = ?',
        [empid]
      );

      const [myEvents] = await db.query(
        `SELECT 
          id,
          name,
          department,
          type,
          event_date,
          status,
          hod_remarks,
          iqac_remarks,
          principal_remarks,
          final_remarks,
          rejected_by
        FROM events
        WHERE submitted_by = ?
        ORDER BY created_at DESC`,
        [empid]
      );

      const [myAtt] = await db.query(
        `SELECT 
          id,
          event_name,
          event_type,
          event_date,
          academic_year
        FROM events_attended
        WHERE submitted_by = ?
        ORDER BY created_at DESC`,
        [empid]
      );

      return res.json({
        role: 'faculty',
        stats: {
          events: evRows.cnt || 0,
          attended: attRows.cnt || 0,
          approved: evRows.approved || 0
        },
        myEvents,
        myAttended: myAtt
      });
    }

    // IQAC DEPT / HOD / IQAC / PRINCIPAL DASHBOARD
    const eventFilter = role === 'iqac_dept'
      ? `WHERE status='Approved' ${dept ? 'AND department=?' : ''}`
      : `WHERE 1=1 ${deptFilter}`;

    const eventParams = [...deptParam];

    const [[evStats]] = await db.query(
      `SELECT 
        COUNT(*) AS total,
        SUM(status='Approved') AS approved,
        SUM(status LIKE 'Pending%') AS pending
       FROM events ${eventFilter}`,
      eventParams
    );

    const [[facStats]] = await db.query(
      `SELECT COUNT(*) AS total FROM faculty WHERE 1=1 ${deptFilter}`,
      deptParam
    );

    const [[attStats]] = await db.query(
      `SELECT COUNT(*) AS total FROM events_attended WHERE 1=1 ${deptFilter}`,
      deptParam
    );

    const DEPTS = ['CSE','ISE','ECE','AIML','ME','Humanities','Physics','Chemistry','Maths','IQAC'];
    const targetDepts = dept ? [dept] : DEPTS;

    const [evByDept] = await db.query(
      `SELECT department, COUNT(*) AS cnt FROM events WHERE 1=1 ${deptFilter} GROUP BY department`,
      deptParam
    );

    const [facByDept] = await db.query(
      `SELECT department, COUNT(*) AS cnt FROM faculty WHERE 1=1 ${deptFilter} GROUP BY department`,
      deptParam
    );

    const [attByDept] = await db.query(
      `SELECT department, COUNT(*) AS cnt FROM events_attended WHERE 1=1 ${deptFilter} GROUP BY department`,
      deptParam
    );

    const [evByType] = await db.query(
      `SELECT type, COUNT(*) AS cnt FROM events WHERE 1=1 ${deptFilter} GROUP BY type`,
      deptParam
    );

    const [evByStatus] = await db.query(
      `SELECT status, COUNT(*) AS cnt FROM events GROUP BY status`
    );

    const [evDeptTypeRows] = await db.query(
      `SELECT department, type, COUNT(*) AS cnt
       FROM events
       WHERE 1=1 ${deptFilter}
       GROUP BY department, type`,
      deptParam
    );

    const evByDeptType = {};

    evDeptTypeRows.forEach(r => {
      if (!evByDeptType[r.department]) {
        evByDeptType[r.department] = {};
      }
      evByDeptType[r.department][r.type] = r.cnt;
    });

    const toMap = rows =>
      Object.fromEntries(rows.map(r => [r.department || r.type || r.status, r.cnt]));

    res.json({
      role,
      stats: {
        events: evStats.total || 0,
        approved: evStats.approved || 0,
        pending: evStats.pending || 0,
        faculty: facStats.total || 0,
        attended: attStats.total || 0
      },
      depts: targetDepts,
      evByDept: toMap(evByDept),
      facByDept: toMap(facByDept),
      attByDept: toMap(attByDept),
      evByType: toMap(evByType),
      evByStatus: toMap(evByStatus),
      evByDeptType
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;