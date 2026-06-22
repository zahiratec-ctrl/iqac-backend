// backend/routes/dashboard.js — PostgreSQL version
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function toInt(v) {
  return parseInt(v || 0, 10) || 0;
}

router.get('/', async (req, res) => {
  try {
    const role = String(req.user.role || '').toLowerCase();
    const department = req.user.department || '';
    const empid = req.user.empid || '';

    console.log('Dashboard hit — user:', { role, department, empid });

    const fullAccess = ['iqac', 'principal'].includes(role);
    const deptScope = (!fullAccess && department && department !== '—' && department !== '-')
      ? department
      : null;

    // FACULTY DASHBOARD
    if (role === 'faculty') {
      const evRes = await db.query(
        `SELECT 
           COUNT(*) AS cnt,
           SUM(CASE WHEN status::text = 'Approved' THEN 1 ELSE 0 END) AS approved,
           SUM(CASE WHEN status::text LIKE 'Pending%' THEN 1 ELSE 0 END) AS pending
         FROM events 
         WHERE submitted_by = $1`,
        [empid]
      );

      const attRes = await db.query(
        `SELECT COUNT(*) AS cnt 
         FROM events_attended 
         WHERE submitted_by = $1`,
        [empid]
      );

      const facRes = await db.query(
        `SELECT COUNT(*) AS cnt 
         FROM faculty 
         WHERE empid = $1`,
        [empid]
      );

      const myEventsRes = await db.query(
        `SELECT id, name, department, type, event_date, status,
                hod_remarks, iqac_remarks, principal_remarks, final_remarks, rejected_by
         FROM events 
         WHERE submitted_by = $1 
         ORDER BY created_at DESC`,
        [empid]
      );

      const myAttRes = await db.query(
        `SELECT id, event_name, event_type, event_date, academic_year
         FROM events_attended 
         WHERE submitted_by = $1 
         ORDER BY created_at DESC`,
        [empid]
      );

      return res.json({
        role,
        department,
        stats: {
          events: toInt(evRes.rows[0]?.cnt),
          approved: toInt(evRes.rows[0]?.approved),
          pending: toInt(evRes.rows[0]?.pending),
          faculty: toInt(facRes.rows[0]?.cnt),
          attended: toInt(attRes.rows[0]?.cnt)
        },
        total_events: toInt(evRes.rows[0]?.cnt),
        approved_events: toInt(evRes.rows[0]?.approved),
        pending_approvals: toInt(evRes.rows[0]?.pending),
        faculty_profiles: toInt(facRes.rows[0]?.cnt),
        events_attended: toInt(attRes.rows[0]?.cnt),
        myEvents: myEventsRes.rows,
        myAttended: myAttRes.rows,
        depts: [],
        departments: [],
        evByDept: {},
        facByDept: {},
        attByDept: {},
        evByType: {},
        evByStatus: {},
        evByDeptType: {}
      });
    }

    // HOD / IQAC_DEPT / IQAC / PRINCIPAL DASHBOARD
    const isIqacDept = role === 'iqac_dept';

    const params = [];
    const eventConds = [];
    const facultyConds = [];
    const attendedConds = [];

    if (deptScope) {
      params.push(deptScope);
      eventConds.push(`department = $${params.length}`);
      facultyConds.push(`department = $${params.length}`);
      attendedConds.push(`department = $${params.length}`);
    }

    if (isIqacDept) {
      eventConds.push(`status::text = 'Approved'`);
    }

    const evWhere = eventConds.length ? `WHERE ${eventConds.join(' AND ')}` : '';
    const facWhere = facultyConds.length ? `WHERE ${facultyConds.join(' AND ')}` : '';
    const attWhere = attendedConds.length ? `WHERE ${attendedConds.join(' AND ')}` : '';

    const evStatsRes = await db.query(
      `SELECT 
         COUNT(*) AS total,
         SUM(CASE WHEN status::text = 'Approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status::text LIKE 'Pending%' THEN 1 ELSE 0 END) AS pending
       FROM events ${evWhere}`,
      params
    );

    const facStatsRes = await db.query(
      `SELECT COUNT(*) AS total FROM faculty ${facWhere}`,
      params
    );

    const attStatsRes = await db.query(
      `SELECT COUNT(*) AS total FROM events_attended ${attWhere}`,
      params
    );

    const evByDeptRes = await db.query(
      `SELECT department, COUNT(*) AS cnt 
       FROM events ${evWhere} 
       GROUP BY department`,
      params
    );

    const facByDeptRes = await db.query(
      `SELECT department, COUNT(*) AS cnt 
       FROM faculty ${facWhere} 
       GROUP BY department`,
      params
    );

    const attByDeptRes = await db.query(
      `SELECT department, COUNT(*) AS cnt 
       FROM events_attended ${attWhere} 
       GROUP BY department`,
      params
    );

    const evByTypeRes = await db.query(
      `SELECT COALESCE(type, 'Other') AS type, COUNT(*) AS cnt 
       FROM events ${evWhere} 
       GROUP BY COALESCE(type, 'Other')`,
      params
    );

    const evByStatusRes = await db.query(
      `SELECT COALESCE(status::text, 'Unknown') AS status, COUNT(*) AS cnt 
       FROM events ${evWhere} 
       GROUP BY COALESCE(status::text, 'Unknown')`,
      params
    );

    const evDeptTypeRes = await db.query(
      `SELECT department, COALESCE(type, 'Other') AS type, COUNT(*) AS cnt 
       FROM events ${evWhere} 
       GROUP BY department, COALESCE(type, 'Other')`,
      params
    );

    const toMap = (rows, keyName) =>
      Object.fromEntries(rows.map(r => [r[keyName] || 'Unknown', toInt(r.cnt)]));

    const evByDeptType = {};
    evDeptTypeRes.rows.forEach(r => {
      const dept = r.department || 'Unknown';
      const type = r.type || 'Other';
      if (!evByDeptType[dept]) evByDeptType[dept] = {};
      evByDeptType[dept][type] = toInt(r.cnt);
    });

    const DEFAULT_DEPTS = ['CSE', 'ISE', 'ECE', 'AIML', 'ME', 'Humanities', 'Physics', 'Chemistry', 'Maths', 'IQAC'];

    const departments = DEFAULT_DEPTS.map(dept => ({
      department: dept,
      faculty: toInt(facByDeptRes.rows.find(r => r.department === dept)?.cnt),
      events: toInt(evByDeptRes.rows.find(r => r.department === dept)?.cnt),
      attended: toInt(attByDeptRes.rows.find(r => r.department === dept)?.cnt)
    }));

    const filteredDepartments = deptScope
      ? departments.filter(d => d.department === deptScope)
      : departments;

    res.json({
      role,
      department,
      stats: {
        events: toInt(evStatsRes.rows[0]?.total),
        approved: toInt(evStatsRes.rows[0]?.approved),
        pending: toInt(evStatsRes.rows[0]?.pending),
        faculty: toInt(facStatsRes.rows[0]?.total),
        attended: toInt(attStatsRes.rows[0]?.total)
      },
      total_events: toInt(evStatsRes.rows[0]?.total),
      approved_events: toInt(evStatsRes.rows[0]?.approved),
      pending_approvals: toInt(evStatsRes.rows[0]?.pending),
      faculty_profiles: toInt(facStatsRes.rows[0]?.total),
      events_attended: toInt(attStatsRes.rows[0]?.total),
      depts: deptScope ? [deptScope] : DEFAULT_DEPTS,
      departments: filteredDepartments,
      evByDept: toMap(evByDeptRes.rows, 'department'),
      facByDept: toMap(facByDeptRes.rows, 'department'),
      attByDept: toMap(attByDeptRes.rows, 'department'),
      evByType: toMap(evByTypeRes.rows, 'type'),
      evByStatus: toMap(evByStatusRes.rows, 'status'),
      evByDeptType
    });

  } catch (err) {
    console.error('Dashboard error:', err.message, err.stack);
    res.status(500).json({
      error: 'Failed to load dashboard',
      detail: err.message
    });
  }
});

module.exports = router;
