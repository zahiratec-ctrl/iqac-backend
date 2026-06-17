// backend/routes/dashboard.js  — PostgreSQL version
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function pg(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  return db.query(pgSql, params);
}

router.get('/', async (req, res) => {
  try {
    const { role, department, empid } = req.user;
    console.log('Dashboard hit — user:', { role, department, empid });

    const full  = ['iqac', 'principal'].includes(role);
    const dept  = (!full && department && department !== '—') ? department : null;
    const isFac = role === 'faculty';

    // ── FACULTY DASHBOARD ────────────────────────────────
    if (isFac) {
      const evRes  = await pg(
        `SELECT COUNT(*) AS cnt,
                SUM(CASE WHEN status='Approved' THEN 1 ELSE 0 END) AS approved
         FROM events WHERE submitted_by = $1`, [empid]);

      const attRes = await pg(
        `SELECT COUNT(*) AS cnt FROM events_attended WHERE submitted_by = $1`, [empid]);

      const myEventsRes = await pg(
        `SELECT id, name, department, type, event_date, status,
                hod_remarks, iqac_remarks, principal_remarks, final_remarks, rejected_by
         FROM events WHERE submitted_by = $1 ORDER BY created_at DESC`, [empid]);

      const myAttRes = await pg(
        `SELECT id, event_name, event_type, event_date, academic_year
         FROM events_attended WHERE submitted_by = $1 ORDER BY created_at DESC`, [empid]);

      return res.json({
        role: 'faculty',
        stats: {
          events:   parseInt(evRes.rows[0].cnt)      || 0,
          attended: parseInt(attRes.rows[0].cnt)     || 0,
          approved: parseInt(evRes.rows[0].approved) || 0
        },
        myEvents:   myEventsRes.rows,
        myAttended: myAttRes.rows
      });
    }

    // ── ALL OTHER ROLES ──────────────────────────────────
    // Build WHERE clause safely without 1=1
    const buildWhere = (base, extraDept) => {
      if (base && extraDept) return `WHERE ${base} AND department = $1`;
      if (base)              return `WHERE ${base}`;
      if (extraDept)         return `WHERE department = $1`;
      return '';
    };

    const isIqacDept = role === 'iqac_dept';
    const baseCondition = isIqacDept ? "status = 'Approved'" : '';
    const evWhere  = buildWhere(baseCondition, dept);
    const facWhere = dept ? 'WHERE department = $1' : '';
    const params   = dept ? [dept] : [];

    console.log('Dashboard query params:', { evWhere, facWhere, params, dept });

    const evStatsRes = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status='Approved'      THEN 1 ELSE 0 END) AS approved,
              SUM(CASE WHEN status LIKE 'Pending%' THEN 1 ELSE 0 END) AS pending
       FROM events ${evWhere}`, params);

    const facStatsRes = await db.query(
      `SELECT COUNT(*) AS total FROM faculty ${facWhere}`, params);

    const attStatsRes = await db.query(
      `SELECT COUNT(*) AS total FROM events_attended ${facWhere}`, params);

    const evByDeptRes = await db.query(
      `SELECT department, COUNT(*) AS cnt FROM events ${evWhere} GROUP BY department`, params);

    const facByDeptRes = await db.query(
      `SELECT department, COUNT(*) AS cnt FROM faculty ${facWhere} GROUP BY department`, params);

    const attByDeptRes = await db.query(
      `SELECT department, COUNT(*) AS cnt FROM events_attended ${facWhere} GROUP BY department`, params);

    const evByTypeRes = await db.query(
      `SELECT type, COUNT(*) AS cnt FROM events ${evWhere} GROUP BY type`, params);

    const evByStatusRes = await db.query(
      `SELECT status, COUNT(*) AS cnt FROM events GROUP BY status`);

    const evDeptTypeRes = await db.query(
      `SELECT department, type, COUNT(*) AS cnt FROM events ${evWhere} GROUP BY department, type`, params);

    const evByDeptType = {};
    evDeptTypeRes.rows.forEach(r => {
      if (!evByDeptType[r.department]) evByDeptType[r.department] = {};
      evByDeptType[r.department][r.type] = r.cnt;
    });

    const toMap = rows =>
      Object.fromEntries(rows.map(r => [r.department || r.type || r.status, r.cnt]));

    const DEPTS = ['CSE','ISE','ECE','AIML','ME','Humanities','Physics','Chemistry','Maths','IQAC'];

    res.json({
      role,
      stats: {
        events:   parseInt(evStatsRes.rows[0].total)    || 0,
        approved: parseInt(evStatsRes.rows[0].approved) || 0,
        pending:  parseInt(evStatsRes.rows[0].pending)  || 0,
        faculty:  parseInt(facStatsRes.rows[0].total)   || 0,
        attended: parseInt(attStatsRes.rows[0].total)   || 0
      },
      depts:      dept ? [dept] : DEPTS,
      evByDept:   toMap(evByDeptRes.rows),
      facByDept:  toMap(facByDeptRes.rows),
      attByDept:  toMap(attByDeptRes.rows),
      evByType:   toMap(evByTypeRes.rows),
      evByStatus: toMap(evByStatusRes.rows),
      evByDeptType
    });

  } catch (err) {
    console.error('Dashboard error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to load dashboard', detail: err.message });
  }
});

module.exports = router;
