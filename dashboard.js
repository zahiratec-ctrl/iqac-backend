// backend/routes/dashboard.js  — PostgreSQL version
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Helper: convert MySQL ? placeholders to PostgreSQL $1,$2,...
function pg(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  return db.query(pgSql, params);
}

router.get('/', async (req, res) => {
  try {
    const { role, department, empid } = req.user;

    const full   = ['iqac', 'principal'].includes(role);
    const dept   = (!full && department && department !== '—') ? department : null;
    const isFac  = role === 'faculty';

    const deptFilter = dept ? 'AND department = ?' : '';
    const deptParam  = dept ? [dept] : [];

    // ── FACULTY DASHBOARD ────────────────────────────────
    if (isFac) {
      const evRes  = await pg(
        `SELECT COUNT(*) AS cnt,
                SUM(CASE WHEN status='Approved' THEN 1 ELSE 0 END) AS approved
         FROM events WHERE submitted_by = ?`,
        [empid]
      );
      const evRows = evRes.rows[0];

      const attRes  = await pg(
        `SELECT COUNT(*) AS cnt FROM events_attended WHERE submitted_by = ?`,
        [empid]
      );
      const attRows = attRes.rows[0];

      const myEventsRes = await pg(
        `SELECT id, name, department, type, event_date, status,
                hod_remarks, iqac_remarks, principal_remarks,
                final_remarks, rejected_by
         FROM events WHERE submitted_by = ? ORDER BY created_at DESC`,
        [empid]
      );

      const myAttRes = await pg(
        `SELECT id, event_name, event_type, event_date, academic_year
         FROM events_attended WHERE submitted_by = ? ORDER BY created_at DESC`,
        [empid]
      );

      return res.json({
        role: 'faculty',
        stats: {
          events:   parseInt(evRows.cnt)      || 0,
          attended: parseInt(attRows.cnt)     || 0,
          approved: parseInt(evRows.approved) || 0
        },
        myEvents:   myEventsRes.rows,
        myAttended: myAttRes.rows
      });
    }

    // ── IQAC DEPT / HOD / IQAC / PRINCIPAL DASHBOARD ────
    const eventFilter = role === 'iqac_dept'
      ? `WHERE status='Approved' ${dept ? 'AND department=?' : ''}`
      : `WHERE 1=1 ${deptFilter}`;

    const eventParams = [...deptParam];

    const evStatsRes = await pg(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status='Approved'           THEN 1 ELSE 0 END) AS approved,
              SUM(CASE WHEN status LIKE 'Pending%'      THEN 1 ELSE 0 END) AS pending
       FROM events ${eventFilter}`,
      eventParams
    );
    const evStats = evStatsRes.rows[0];

    const facStatsRes = await pg(
      `SELECT COUNT(*) AS total FROM faculty WHERE 1=1 ${deptFilter}`,
      deptParam
    );
    const facStats = facStatsRes.rows[0];

    const attStatsRes = await pg(
      `SELECT COUNT(*) AS total FROM events_attended WHERE 1=1 ${deptFilter}`,
      deptParam
    );
    const attStats = attStatsRes.rows[0];

    const DEPTS       = ['CSE','ISE','ECE','AIML','ME','Humanities','Physics','Chemistry','Maths','IQAC'];
    const targetDepts = dept ? [dept] : DEPTS;

    const evByDeptRes = await pg(
      `SELECT department, COUNT(*) AS cnt FROM events WHERE 1=1 ${deptFilter} GROUP BY department`,
      deptParam
    );
    const facByDeptRes = await pg(
      `SELECT department, COUNT(*) AS cnt FROM faculty WHERE 1=1 ${deptFilter} GROUP BY department`,
      deptParam
    );
    const attByDeptRes = await pg(
      `SELECT department, COUNT(*) AS cnt FROM events_attended WHERE 1=1 ${deptFilter} GROUP BY department`,
      deptParam
    );
    const evByTypeRes = await pg(
      `SELECT type, COUNT(*) AS cnt FROM events WHERE 1=1 ${deptFilter} GROUP BY type`,
      deptParam
    );
    const evByStatusRes = await pg(
      `SELECT status, COUNT(*) AS cnt FROM events GROUP BY status`
    );
    const evDeptTypeRes = await pg(
      `SELECT department, type, COUNT(*) AS cnt
       FROM events WHERE 1=1 ${deptFilter}
       GROUP BY department, type`,
      deptParam
    );

    const evByDeptType = {};
    evDeptTypeRes.rows.forEach(r => {
      if (!evByDeptType[r.department]) evByDeptType[r.department] = {};
      evByDeptType[r.department][r.type] = r.cnt;
    });

    const toMap = rows =>
      Object.fromEntries(rows.map(r => [r.department || r.type || r.status, r.cnt]));

    res.json({
      role,
      stats: {
        events:   parseInt(evStats.total)    || 0,
        approved: parseInt(evStats.approved) || 0,
        pending:  parseInt(evStats.pending)  || 0,
        faculty:  parseInt(facStats.total)   || 0,
        attended: parseInt(attStats.total)   || 0
      },
      depts:      targetDepts,
      evByDept:   toMap(evByDeptRes.rows),
      facByDept:  toMap(facByDeptRes.rows),
      attByDept:  toMap(attByDeptRes.rows),
      evByType:   toMap(evByTypeRes.rows),
      evByStatus: toMap(evByStatusRes.rows),
      evByDeptType
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard', detail: err.message });
  }
});

module.exports = router;
