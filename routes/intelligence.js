// backend/routes/intelligence.js
const express = require('express');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const ORG_EVENT_TYPES = ['VAC','FDP','Hackathon','Guest Lecture','Celebration','Project Expo','Symposium'];

function scoreValue(value, target) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

function getRecommendations(row) {
  const rec = [];

  if (row.vac_count < 2) rec.push('Increase Value Added Courses to strengthen curriculum enrichment.');
  if (row.fdp_count < 2) rec.push('Organise more FDPs for faculty development evidence.');
  if (row.guest_count < 2) rec.push('Conduct more guest lectures with industry/academic experts.');
  if (row.hackathon_count < 1) rec.push('Plan hackathons or innovation-based student activities.');
  if (row.project_count < 1) rec.push('Organise project exhibitions to improve outcome-based evidence.');
  if (row.phd_percent < 30) rec.push('Improve Ph.D faculty percentage for academic and research strength.');
  if (row.prof_count < 1) rec.push('Add/strengthen senior cadre faculty at Professor level.');

  if (!rec.length) rec.push('Department shows good readiness. Continue documentation and evidence strengthening.');

  return rec;
}

router.get('/department-report',
  requireRole('iqac','principal'),
  async (req, res) => {
    try {
      const [departments] = await db.query(`
        SELECT DISTINCT department FROM faculty
        UNION
        SELECT DISTINCT department FROM events
        UNION
        SELECT DISTINCT department FROM events_attended
      `);

      const report = [];

      for (const d of departments) {
        const dept = d.department;
        if (!dept || dept === '—') continue;

        const [[fac]] = await db.query(`
          SELECT
            COUNT(*) AS total_faculty,
            SUM(CASE WHEN designation='Professor' THEN 1 ELSE 0 END) AS prof_count,
            SUM(CASE WHEN designation='Associate Professor' THEN 1 ELSE 0 END) AS assoc_count,
            SUM(CASE WHEN designation='Assistant Professor' THEN 1 ELSE 0 END) AS asst_count,
            SUM(CASE WHEN qualification='Ph.D' THEN 1 ELSE 0 END) AS phd_count,
            AVG(teaching_exp) AS avg_teaching_exp,
            SUM(CASE WHEN doc_appt='—' OR doc_pan='—' OR doc_aadhar='—' OR doc_resume='—' THEN 1 ELSE 0 END) AS missing_docs
          FROM faculty
          WHERE department = ?
        `, [dept]);

        const [[events]] = await db.query(`
          SELECT
            COUNT(*) AS total_events,
            SUM(CASE WHEN type='VAC' THEN 1 ELSE 0 END) AS vac_count,
            SUM(CASE WHEN type='FDP' THEN 1 ELSE 0 END) AS fdp_count,
            SUM(CASE WHEN type='Guest Lecture' THEN 1 ELSE 0 END) AS guest_count,
            SUM(CASE WHEN type='Hackathon' THEN 1 ELSE 0 END) AS hackathon_count,
            SUM(CASE WHEN type='Project Expo' THEN 1 ELSE 0 END) AS project_count,
            SUM(CASE WHEN type='Symposium' THEN 1 ELSE 0 END) AS symposium_count
          FROM events
          WHERE department = ?
        `, [dept]);

        const [[att]] = await db.query(`
          SELECT COUNT(*) AS attended_count
          FROM events_attended
          WHERE department = ?
        `, [dept]);

        const totalFaculty = fac.total_faculty || 0;
        const phdPercent = totalFaculty ? Math.round((fac.phd_count || 0) / totalFaculty * 100) : 0;

        const row = {
          department: dept,
          total_faculty: totalFaculty,
          prof_count: fac.prof_count || 0,
          assoc_count: fac.assoc_count || 0,
          asst_count: fac.asst_count || 0,
          phd_count: fac.phd_count || 0,
          phd_percent: phdPercent,
          avg_teaching_exp: Math.round(fac.avg_teaching_exp || 0),
          missing_docs: fac.missing_docs || 0,

          total_events: events.total_events || 0,
          vac_count: events.vac_count || 0,
          fdp_count: events.fdp_count || 0,
          guest_count: events.guest_count || 0,
          hackathon_count: events.hackathon_count || 0,
          project_count: events.project_count || 0,
          symposium_count: events.symposium_count || 0,
          attended_count: att.attended_count || 0
        };

        const eventScore =
          scoreValue(row.total_events, 10) * 0.25 +
          scoreValue(row.vac_count, 2) * 0.15 +
          scoreValue(row.fdp_count, 2) * 0.15 +
          scoreValue(row.guest_count, 2) * 0.15 +
          scoreValue(row.attended_count, totalFaculty * 2 || 1) * 0.10 +
          scoreValue(row.phd_percent, 30) * 0.10 +
          scoreValue(row.prof_count, 1) * 0.10;

        row.quality_score = Math.round(eventScore);
        row.recommendations = getRecommendations(row);

        row.strengths = [];
        row.weaknesses = [];

        if (row.total_events >= 10) row.strengths.push('Good number of department-level activities organised.');
        else row.weaknesses.push('Low number of organised events.');

        if (row.fdp_count >= 2) row.strengths.push('FDP activities are available for faculty development evidence.');
        else row.weaknesses.push('FDP count needs improvement.');

        if (row.guest_count >= 2) row.strengths.push('Guest lecture activity supports industry/academic exposure.');
        else row.weaknesses.push('Guest lecture evidence is weak.');

        if (row.phd_percent >= 30) row.strengths.push('Good Ph.D faculty percentage.');
        else row.weaknesses.push('Ph.D faculty percentage needs improvement.');

        if (row.missing_docs > 0) row.weaknesses.push(`${row.missing_docs} faculty profiles have missing documents.`);

        report.push(row);
      }

      res.json(report);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate intelligence report' });
    }
  }
);

module.exports = router;