// backend/routes/intelligence.js — PostgreSQL version
const express = require('express');
const db      = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function pg(sql, params = []) {
  let i = 0;
  return db.query(sql.replace(/\?/g, () => `$${++i}`), params);
}

const PROGRAM_INTAKE = {
  CSE: 360, ISE: 120, ECE: 180, AIML: 120, ME: 60,
  Humanities: 0, Physics: 0, Chemistry: 0, Maths: 0, IQAC: 0
};

const REQUIRED_NORMS = {
  CSE:  { faculty: 18, prof: 2, assoc: 4, phd_percent: 30 },
  ISE:  { faculty: 6,  prof: 1, assoc: 2, phd_percent: 30 },
  ECE:  { faculty: 12, prof: 1, assoc: 3, phd_percent: 30 },
  AIML: { faculty: 6,  prof: 1, assoc: 2, phd_percent: 30 },
  ME:   { faculty: 4,  prof: 1, assoc: 1, phd_percent: 30 },
  Humanities: { faculty: 0, prof: 0, assoc: 0, phd_percent: 30 },
  Physics:    { faculty: 0, prof: 0, assoc: 0, phd_percent: 30 },
  Chemistry:  { faculty: 0, prof: 0, assoc: 0, phd_percent: 30 },
  Maths:      { faculty: 0, prof: 0, assoc: 0, phd_percent: 30 },
  IQAC:       { faculty: 0, prof: 0, assoc: 0, phd_percent: 30 }
};

function requiredNormFor(dept) {
  return REQUIRED_NORMS[dept] || { faculty: 0, prof: 0, assoc: 0, phd_percent: 30 };
}

function positiveGap(required, existing) {
  return Math.max(0, safeNum(required) - safeNum(existing));
}

function computeComplianceScore(row) {
  const norms = requiredNormFor(row.department);
  let score = 0;

  if (!norms.faculty || row.total_faculty >= norms.faculty) score += 25;
  else if (norms.faculty) score += Math.round((row.total_faculty / norms.faculty) * 25);

  if (!norms.prof || row.prof_count >= norms.prof) score += 10;
  else if (norms.prof) score += Math.round((row.prof_count / norms.prof) * 10);

  if (!norms.assoc || row.assoc_count >= norms.assoc) score += 10;
  else if (norms.assoc) score += Math.round((row.assoc_count / norms.assoc) * 10);

  if (row.phd_percent >= norms.phd_percent) score += 15;
  else score += Math.round((row.phd_percent / norms.phd_percent) * 15);

  if (row.total_events >= 3) score += 10;
  else score += Math.round((row.total_events / 3) * 10);

  if (row.attended_count >= row.total_faculty && row.total_faculty > 0) score += 10;
  else if (row.total_faculty > 0) score += Math.round((row.attended_count / row.total_faculty) * 10);

  const nbaCount = (row.criterion_coverage?.nba || []).length;
  const naacCount = (row.criterion_coverage?.naac || []).length;
  score += Math.min(10, nbaCount * 2);
  score += Math.min(10, naacCount * 2);

  if (row.missing_docs === 0) score += 10;
  else score += Math.max(0, 10 - Math.min(10, row.missing_docs));

  return Math.max(0, Math.min(100, score));
}

function safeNum(v) { return Number(v || 0); }

function getFSR(intake, faculty) {
  if (!intake || !faculty) return 'NA';
  return `1:${Math.round(intake / faculty)}`;
}

function getNbaMappingByEventType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('vac'))        return ['NBA C1.2.4 Content beyond syllabus','NBA C2.1 Teaching-Learning enrichment'];
  if (t.includes('fdp'))        return ['NBA C5 Faculty Information','NBA C6 Faculty Contributions'];
  if (t.includes('guest'))      return ['NBA C2.8 Industry Institute Partnership','NBA C4.7 Professional Activities'];
  if (t.includes('hackathon'))  return ['NBA C2.7 Complex Engineering Problems & SDGs','NBA C4.7.2 Student Participation in Professional Events'];
  if (t.includes('project'))    return ['NBA C2.2 Quality of Capstone/Major Project','NBA C2.7 Complex Engineering Problems'];
  if (t.includes('symposium'))  return ['NBA C4.7 Professional Activities','NBA C4.7.1 Professional Bodies/Chapters/Clubs'];
  if (t.includes('conference')) return ['NBA C6 Faculty Contributions','NBA C4.7 Professional Activities'];
  if (t.includes('workshop'))   return ['NBA C2.1 Teaching-Learning Process','NBA C6 Faculty Contributions'];
  if (t.includes('industry'))   return ['NBA C2.8 Industry Institute Partnership'];
  return ['NBA C2 Teaching-Learning','NBA C6 Faculty Contributions'];
}

function getNaacMappingByEventType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('vac'))        return ['NAAC 1.3 Curriculum Enrichment','NAAC 2.3 Teaching-Learning Process'];
  if (t.includes('fdp'))        return ['NAAC 6.3 Faculty Empowerment Strategies'];
  if (t.includes('guest'))      return ['NAAC 2.3 Teaching-Learning Process','NAAC 3.5 Collaboration'];
  if (t.includes('hackathon'))  return ['NAAC 3.4 Extension/Innovation Activities','NAAC 5.3 Student Participation'];
  if (t.includes('project'))    return ['NAAC 2.3 Experiential Learning','NAAC 3.4 Research/Innovation'];
  if (t.includes('symposium'))  return ['NAAC 5.3 Student Participation','NAAC 3.4 Research/Academic Activities'];
  if (t.includes('conference')) return ['NAAC 3.4 Research Publications/Awards','NAAC 6.3 Faculty Development'];
  if (t.includes('workshop'))   return ['NAAC 2.3 Experiential Learning','NAAC 6.3 Faculty Development'];
  if (t.includes('industry'))   return ['NAAC 3.5 Collaboration','NAAC 2.3 Experiential Learning'];
  return ['NAAC 2 Teaching-Learning','NAAC 6 Governance and Faculty Development'];
}

function buildRecommendations(row) {
  const rec = [];
  if (row.total_faculty === 0) { rec.push('Faculty data is not available. Update faculty profiles for NBA Criterion 5 and NAAC 2.4/6.3 evidence.'); return rec; }
  if (row.intake > 0 && row.total_faculty > 0 && row.intake / row.total_faculty > 20)
    rec.push('Faculty strength appears low compared to sanctioned intake. Strengthen faculty count for NBA Criterion 5 Faculty Information.');
  if (row.prof_count   < 1) rec.push('Professor cadre is weak or missing. Strengthen senior cadre faculty evidence for NBA Criterion 5.');
  if (row.assoc_count  < 1) rec.push('Associate Professor cadre is weak. Improve cadre balance for department academic leadership.');
  if (row.phd_percent  < 30) rec.push('Ph.D faculty percentage is low. Encourage faculty qualification enhancement for NBA Criterion 5 and NAAC 2.4.');
  if (row.fdp_count    < 2) rec.push('Organise/attend more FDPs to support NBA Criterion 6 and NAAC 6.3 Faculty Empowerment.');
  if (row.guest_count  < 2) rec.push('Conduct more industry/academic guest lectures to support NBA 2.8 and NAAC 3.5 Collaboration.');
  if (row.hackathon_count < 1) rec.push('Plan hackathons/ideathons/project contests to support NBA 2.7, NBA 4.7.2 and NAAC 5.3.');
  if (row.project_count   < 1) rec.push('Organise project exhibitions/capstone showcases to support NBA 2.2 and NBA 2.7.');
  if (row.symposium_count < 1) rec.push('Conduct symposium/professional body events to support NBA 4.7 and NAAC 5.3.');
  if (row.attended_count  < row.total_faculty) rec.push('Faculty participation in conferences/FDPs/workshops is low. Encourage each faculty to upload at least one attended activity proof.');
  if (row.missing_docs > 0) rec.push(`${row.missing_docs} faculty profile(s) have missing documents. Complete appointment order, PAN, Aadhar and resume uploads.`);
  if (!rec.length) rec.push('Department shows good evidence coverage. Continue uploading brochures, reports, photos and certificates for audit readiness.');
  return rec;
}

function buildCriterionCoverage(row) {
  const nba = [], naac = [];
  if (row.total_faculty > 0)                                                   { nba.push('NBA C5 Faculty Information'); naac.push('NAAC 2.4 Teacher Profile and Quality'); }
  if (row.fdp_count > 0 || row.attended_count > 0)                            { nba.push('NBA C6 Faculty Contributions'); naac.push('NAAC 6.3 Faculty Empowerment Strategies'); }
  if (row.vac_count > 0)                                                       { nba.push('NBA C1.2.4 Content beyond syllabus'); naac.push('NAAC 1.3 Curriculum Enrichment'); }
  if (row.guest_count > 0)                                                     { nba.push('NBA C2.8 Industry Institute Partnership'); naac.push('NAAC 3.5 Collaboration'); }
  if (row.project_count > 0)                                                   { nba.push('NBA C2.2 Capstone/Major Project Quality'); naac.push('NAAC 2.3 Experiential Learning'); }
  if (row.hackathon_count > 0)                                                 { nba.push('NBA C2.7 Complex Engineering Problems and SDGs'); nba.push('NBA C4.7.2 Student Participation in Professional Events'); naac.push('NAAC 5.3 Student Participation and Activities'); }
  if (row.symposium_count > 0)                                                 { nba.push('NBA C4.7 Professional Activities'); naac.push('NAAC 3.4 Research/Academic Activities'); }
  return { nba: [...new Set(nba)], naac: [...new Set(naac)] };
}

async function buildDepartmentRow(dept) {
  const facRes = await pg(`
    SELECT
      COUNT(*) AS total_faculty,
      SUM(CASE WHEN designation='Professor' THEN 1 ELSE 0 END) AS prof_count,
      SUM(CASE WHEN designation='Associate Professor' THEN 1 ELSE 0 END) AS assoc_count,
      SUM(CASE WHEN designation='Assistant Professor' THEN 1 ELSE 0 END) AS asst_count,
      SUM(CASE WHEN qualification IN ('Ph.D','PhD','Ph.D.') THEN 1 ELSE 0 END) AS phd_count,
      AVG(teaching_exp) AS avg_teaching_exp,
      SUM(CASE WHEN doc_appt IN ('—','') OR doc_appt IS NULL
                 OR doc_pan IN ('—','') OR doc_pan IS NULL
                 OR doc_aadhar IN ('—','') OR doc_aadhar IS NULL
                 OR doc_resume IN ('—','') OR doc_resume IS NULL
               THEN 1 ELSE 0 END) AS missing_docs
    FROM faculty WHERE department = ?`, [dept]);
  const fac = facRes.rows[0];

  const evRes = await pg(`
    SELECT
      COUNT(*) AS total_events,
      SUM(CASE WHEN type='VAC'           THEN 1 ELSE 0 END) AS vac_count,
      SUM(CASE WHEN type='FDP'           THEN 1 ELSE 0 END) AS fdp_count,
      SUM(CASE WHEN type='Guest Lecture' THEN 1 ELSE 0 END) AS guest_count,
      SUM(CASE WHEN type='Hackathon'     THEN 1 ELSE 0 END) AS hackathon_count,
      SUM(CASE WHEN type='Project Expo'  THEN 1 ELSE 0 END) AS project_count,
      SUM(CASE WHEN type='Symposium'     THEN 1 ELSE 0 END) AS symposium_count
    FROM events WHERE department = ?`, [dept]);
  const events = evRes.rows[0];

  const attRes = await pg(`
    SELECT
      COUNT(*) AS attended_count,
      SUM(CASE WHEN event_type ILIKE '%fdp%' OR event_type ILIKE '%workshop%' THEN 1 ELSE 0 END) AS faculty_fdp_workshop_count,
      SUM(CASE WHEN event_type ILIKE '%conference%' THEN 1 ELSE 0 END) AS conference_count,
      SUM(CASE WHEN event_type ILIKE '%seminar%'    THEN 1 ELSE 0 END) AS seminar_count,
      SUM(CASE WHEN event_type ILIKE '%industry%'   THEN 1 ELSE 0 END) AS industry_count
    FROM events_attended WHERE department = ?`, [dept]);
  const att = attRes.rows[0];

  const totalFaculty = safeNum(fac.total_faculty);
  const phdCount     = safeNum(fac.phd_count);
  const intake       = PROGRAM_INTAKE[dept] || 0;

  const row = {
    department:    dept,
    intake,
    fsr:           getFSR(intake, totalFaculty),
    total_faculty: totalFaculty,
    prof_count:    safeNum(fac.prof_count),
    assoc_count:   safeNum(fac.assoc_count),
    asst_count:    safeNum(fac.asst_count),
    phd_count:     phdCount,
    phd_percent:   totalFaculty ? Math.round((phdCount / totalFaculty) * 100) : 0,
    avg_teaching_exp: Math.round(safeNum(fac.avg_teaching_exp)),
    missing_docs:  safeNum(fac.missing_docs),
    total_events:  safeNum(events.total_events),
    vac_count:     safeNum(events.vac_count),
    fdp_count:     safeNum(events.fdp_count),
    guest_count:   safeNum(events.guest_count),
    hackathon_count:   safeNum(events.hackathon_count),
    project_count:     safeNum(events.project_count),
    symposium_count:   safeNum(events.symposium_count),
    attended_count:    safeNum(att.attended_count),
    faculty_fdp_workshop_count: safeNum(att.faculty_fdp_workshop_count),
    conference_count:  safeNum(att.conference_count),
    seminar_count:     safeNum(att.seminar_count),
    industry_count:    safeNum(att.industry_count)
  };

  row.criterion_coverage = buildCriterionCoverage(row);
  row.recommendations    = buildRecommendations(row);
  row.strengths  = [];
  row.weaknesses = [];

  if (row.total_faculty > 0) row.strengths.push('Faculty strength data available for NBA Criterion 5.'); else row.weaknesses.push('Faculty data missing.');
  if (row.phd_percent >= 30) row.strengths.push('Good Ph.D faculty percentage.'); else row.weaknesses.push('Ph.D faculty percentage needs improvement.');
  if (row.fdp_count > 0 || row.faculty_fdp_workshop_count > 0) row.strengths.push('Faculty development evidence available for NBA C6 and NAAC 6.3.'); else row.weaknesses.push('Faculty development evidence is weak.');
  if (row.guest_count > 0 || row.industry_count > 0) row.strengths.push('Industry/guest lecture evidence supports NBA 2.8 and NAAC 3.5.'); else row.weaknesses.push('Industry interaction evidence needs improvement.');
  if (row.hackathon_count > 0 || row.project_count > 0 || row.symposium_count > 0) row.strengths.push('Student/professional activity evidence available for NBA 4.7 and NAAC 5.3.'); else row.weaknesses.push('Student professional activity evidence is low.');

  let score = 0;
  if (row.total_faculty > 0) score += 20;
  if (row.phd_percent >= 30) score += 15;
  if (row.prof_count   > 0)  score += 10;
  if (row.assoc_count  > 0)  score += 10;
  if (row.fdp_count > 0 || row.faculty_fdp_workshop_count > 0) score += 15;
  if (row.guest_count > 0 || row.industry_count > 0) score += 10;
  if (row.hackathon_count > 0 || row.project_count > 0 || row.symposium_count > 0) score += 10;
  if (row.attended_count >= row.total_faculty && row.total_faculty > 0) score += 10;
  row.quality_score = score;


  const norms = requiredNormFor(row.department);
  row.required_faculty = norms.faculty;
  row.faculty_shortfall = positiveGap(norms.faculty, row.total_faculty);
  row.required_prof_count = norms.prof;
  row.prof_shortfall = positiveGap(norms.prof, row.prof_count);
  row.required_assoc_count = norms.assoc;
  row.assoc_shortfall = positiveGap(norms.assoc, row.assoc_count);
  row.required_phd_percent = norms.phd_percent;
  row.phd_gap = positiveGap(norms.phd_percent, row.phd_percent);
  row.compliance_score = computeComplianceScore(row);
  row.quality_score = row.compliance_score;

  return row;
}

// GET /api/intelligence/department-report
router.get('/department-report', async (req, res) => {
  try {
    let role       = String(req.user?.role || '').trim().toLowerCase();
    let department = String(req.user?.department || '').trim();

    if ((!department || department === '—') && req.query.department)
      department = String(req.query.department).trim();

    let departments = [];

    if (department && department !== '—' && !['iqac','principal'].includes(role)) {
      departments = [{ department }];
    } else if (['iqac','principal'].includes(role)) {
      const result = await pg(`
        SELECT DISTINCT department FROM faculty WHERE department IS NOT NULL AND department <> '—'
        UNION
        SELECT DISTINCT department FROM events WHERE department IS NOT NULL AND department <> '—'
        UNION
        SELECT DISTINCT department FROM events_attended WHERE department IS NOT NULL AND department <> '—'
      `);
      departments = result.rows;
    } else if (department) {
      departments = [{ department }];
    } else {
      return res.status(403).json({ error: 'Access denied: department not found in login token', user: req.user });
    }

    const report = [];
    for (const d of departments) {
      const dept = d.department;
      if (!dept || dept === '—') continue;
      report.push(await buildDepartmentRow(dept));
    }

    res.json(report);
  } catch (err) {
    console.error('Intelligence department-report error:', err);
    res.status(500).json({ error: 'Failed to generate intelligence report', details: err.message });
  }
});

// GET /api/intelligence/my-contribution
router.get('/my-contribution', async (req, res) => {
  try {
    let { empid, role, department } = req.user;
    role = String(role || '').trim().toLowerCase();

    if (role !== 'faculty')
      return res.status(403).json({ error: 'Only faculty can access personal contribution.' });

    const evRes  = await pg(`SELECT id, name, type, department, event_date, status FROM events WHERE submitted_by = ? ORDER BY event_date DESC, id DESC`, [empid]);
    const attRes = await pg(`SELECT id, event_name, event_type, department, event_date, academic_year FROM events_attended WHERE submitted_by = ? ORDER BY event_date DESC, id DESC`, [empid]);
    const facRes = await pg(`SELECT name, department, designation, qualification, teaching_exp, research_exp, industry_exp, doc_appt, doc_pan, doc_aadhar, doc_resume FROM faculty WHERE empid = ? LIMIT 1`, [empid]);

    const fac = facRes.rows[0] || null;

    const organizedMapped = evRes.rows.map(e => ({
      title: e.name, type: e.type, department: e.department, date: e.event_date, status: e.status,
      nba: getNbaMappingByEventType(e.type), naac: getNaacMappingByEventType(e.type)
    }));

    const attendedMapped = attRes.rows.map(a => ({
      title: a.event_name, type: a.event_type, department: a.department, date: a.event_date, academic_year: a.academic_year,
      nba: getNbaMappingByEventType(a.event_type), naac: getNaacMappingByEventType(a.event_type)
    }));

    const missingDocs = [];
    if (fac) {
      if (!fac.doc_appt   || fac.doc_appt   === '—') missingDocs.push('Appointment Order');
      if (!fac.doc_pan    || fac.doc_pan    === '—') missingDocs.push('PAN');
      if (!fac.doc_aadhar || fac.doc_aadhar === '—') missingDocs.push('Aadhar');
      if (!fac.doc_resume || fac.doc_resume === '—') missingDocs.push('Resume/CV');
    }

    const suggestions = [];
    const attendedTypes  = attRes.rows.map(a => String(a.event_type||'').toLowerCase()).join(' ');
    const organizedTypes = evRes.rows.map(e => String(e.type||'').toLowerCase()).join(' ');

    if (!organizedTypes.includes('guest'))      suggestions.push('Organize a guest lecture or industry expert talk to contribute to NBA 2.8 and NAAC 3.5.');
    if (!organizedTypes.includes('project'))    suggestions.push('Coordinate a project expo/capstone showcase to contribute to NBA 2.2 and NBA 2.7.');
    if (!organizedTypes.includes('hackathon'))  suggestions.push('Coordinate hackathon/ideathon activities to contribute to NBA 4.7.2 and NAAC 5.3.');
    if (!attendedTypes.includes('conference'))  suggestions.push('Attend conferences/seminars to strengthen NBA C6 and NAAC 3.4/6.3 evidence.');
    if (!attendedTypes.includes('fdp') && !attendedTypes.includes('workshop'))
      suggestions.push('Attend FDPs/workshops to support NBA C6 and NAAC 6.3 Faculty Empowerment.');
    if (missingDocs.length > 0) suggestions.push(`Upload missing faculty documents: ${missingDocs.join(', ')}.`);

    res.json({
      faculty: fac || { department, designation: '', qualification: '' },
      summary: { organized_count: evRes.rows.length, attended_count: attRes.rows.length, missing_documents: missingDocs.length },
      organized: organizedMapped,
      attended: attendedMapped,
      missing_documents: missingDocs,
      suggestions
    });
  } catch (err) {
    console.error('My contribution error:', err);
    res.status(500).json({ error: 'Failed to generate faculty contribution report', details: err.message });
  }
});


// ══ QUANTITATIVE INTELLIGENCE REPORT WORKFLOW ══

// GET /api/intelligence/faculty-contribution
router.get('/faculty-contribution', async (req, res) => {
  try {
    let role = String(req.user?.role || '').trim().toLowerCase();
    let department = String(req.user?.department || '').trim();

    if (!['hod','iqac_dept'].includes(role)) {
      return res.status(403).json({ error: 'Only HOD / IQAC department coordinator can view faculty contribution matrix.' });
    }

    if (!department || department === '—') {
      return res.status(400).json({ error: 'Department not found in login token.' });
    }

    const facRes = await pg(`
      SELECT empid, name, email, department, designation, qualification, teaching_exp,
             doc_appt, doc_pan, doc_aadhar, doc_resume
      FROM faculty
      WHERE department = ?
      ORDER BY name ASC, empid ASC
    `, [department]);

    const rows = [];

    for (const f of facRes.rows) {
      const empid = f.empid;

      const evRes = await pg(`
        SELECT type, COUNT(*) AS cnt
        FROM events
        WHERE submitted_by = ?
        GROUP BY type
      `, [empid]);

      const attRes = await pg(`
        SELECT event_type, COUNT(*) AS cnt
        FROM events_attended
        WHERE submitted_by = ?
        GROUP BY event_type
      `, [empid]);

      let organized_count = 0;
      let attended_count = 0;
      const nbaSet = new Set();
      const naacSet = new Set();

      evRes.rows.forEach(e => {
        organized_count += safeNum(e.cnt);
        getNbaMappingByEventType(e.type).forEach(x => nbaSet.add(x));
        getNaacMappingByEventType(e.type).forEach(x => naacSet.add(x));
      });

      attRes.rows.forEach(a => {
        attended_count += safeNum(a.cnt);
        getNbaMappingByEventType(a.event_type).forEach(x => nbaSet.add(x));
        getNaacMappingByEventType(a.event_type).forEach(x => naacSet.add(x));
      });

      let missing_docs = 0;
      ['doc_appt','doc_pan','doc_aadhar','doc_resume'].forEach(k => {
        if (!f[k] || f[k] === '—' || f[k] === '') missing_docs++;
      });

      let score = 0;
      if (organized_count > 0) score += 30;
      if (attended_count > 0) score += 30;
      if (String(f.qualification || '').toLowerCase().includes('ph')) score += 15;
      if (missing_docs === 0) score += 15;
      if (nbaSet.size >= 2 && naacSet.size >= 2) score += 10;

      rows.push({
        empid: f.empid,
        name: f.name,
        email: f.email,
        department: f.department,
        designation: f.designation,
        qualification: f.qualification,
        organized_count,
        attended_count,
        missing_docs,
        nba: Array.from(nbaSet),
        naac: Array.from(naacSet),
        contribution_score: score
      });
    }

    res.json(rows);
  } catch (err) {
    console.error('Faculty contribution intelligence error:', err);
    res.status(500).json({ error: 'Failed to generate faculty contribution matrix', details: err.message });
  }
});

// POST /api/intelligence/reports
router.post('/reports', async (req, res) => {
  try {
    let role = String(req.user?.role || '').trim().toLowerCase();

    if (!['iqac','principal','hod','iqac_dept'].includes(role)) {
      return res.status(403).json({ error: 'Only IQAC, Principal and HOD roles can save reports.' });
    }

    const {
      report_type,
      scope,
      department,
      remarks,
      summary_json,
      visible_to
    } = req.body || {};

    if (!remarks) {
      return res.status(400).json({ error: 'Remarks are required.' });
    }

    const result = await db.query(`
      INSERT INTO intelligence_reports
        (report_type, scope, department, generated_by, remarks, summary_json, visible_to)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [
      report_type || 'Intelligence Report',
      scope || 'institution',
      department || req.user.department || null,
      req.user.empid || req.user.email || role,
      remarks,
      summary_json || {},
      visible_to || (['hod','iqac_dept'].includes(role) ? 'faculty' : 'hod')
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Save intelligence report error:', err);
    res.status(500).json({ error: 'Failed to save intelligence report', details: err.message });
  }
});

// GET /api/intelligence/reports
router.get('/reports', async (req, res) => {
  try {
    let role = String(req.user?.role || '').trim().toLowerCase();
    let department = String(req.user?.department || '').trim();

    const visible_to = String(req.query.visible_to || '').trim();
    const qDept = String(req.query.department || '').trim();

    let sql = `SELECT id, report_type, scope, department, generated_by, remarks, visible_to, created_at
               FROM intelligence_reports WHERE 1=1`;
    const params = [];

    if (visible_to) {
      params.push(visible_to);
      sql += ` AND visible_to = $${params.length}`;
    }

    if (['hod','iqac_dept','faculty'].includes(role)) {
      const dept = qDept || department;
      if (dept && dept !== '—') {
        params.push(dept);
        sql += ` AND (department = $${params.length} OR department IS NULL OR department = '')`;
      }
    }

    sql += ` ORDER BY created_at DESC LIMIT 20`;

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch intelligence reports error:', err);
    res.status(500).json({ error: 'Failed to fetch intelligence reports', details: err.message });
  }
});


// POST /api/intelligence/faculty-remark
// HOD / IQAC department coordinator sends a remark to one faculty only.
router.post('/faculty-remark', async (req, res) => {
  try {
    const role = String(req.user?.role || '').trim().toLowerCase();
    if (!['hod','iqac_dept'].includes(role)) {
      return res.status(403).json({ error: 'Only HOD / IQAC department coordinator can send faculty remarks.' });
    }

    const empid = String(req.body?.empid || '').trim();
    const remark = String(req.body?.remark || '').trim();

    if (!empid || !remark) {
      return res.status(400).json({ error: 'Faculty Employee ID and remark are required.' });
    }

    const department = String(req.user?.department || '').trim();

    const fRes = await pg(
      `SELECT empid, name, department FROM faculty WHERE empid = ? LIMIT 1`,
      [empid]
    );

    if (!fRes.rows.length) {
      return res.status(404).json({ error: 'Faculty profile not found.' });
    }

    const faculty = fRes.rows[0];

    if (department && department !== '—' && faculty.department !== department) {
      return res.status(403).json({ error: 'You can send remarks only to faculty in your department.' });
    }

    const result = await db.query(`
      INSERT INTO faculty_remarks
        (empid, faculty_name, department, remark, remark_by)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `, [
      faculty.empid,
      faculty.name || faculty.empid,
      faculty.department || department,
      remark,
      req.user.empid || req.user.email || role
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Faculty remark error:', err);
    res.status(500).json({ error: 'Failed to save faculty remark', details: err.message });
  }
});

// GET /api/intelligence/my-faculty-remarks
// Faculty sees only remarks addressed to them.
router.get('/my-faculty-remarks', async (req, res) => {
  try {
    const role = String(req.user?.role || '').trim().toLowerCase();
    if (role !== 'faculty') {
      return res.status(403).json({ error: 'Only faculty can view personal remarks.' });
    }

    const result = await db.query(`
      SELECT id, empid, faculty_name, department, remark, remark_by, created_at
      FROM faculty_remarks
      WHERE empid = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.empid]);

    res.json(result.rows);
  } catch (err) {
    console.error('Fetch faculty remarks error:', err);
    res.status(500).json({ error: 'Failed to fetch faculty remarks', details: err.message });
  }
});

// GET /api/intelligence/faculty-remarks
// HOD can see remarks sent to their department faculty.
router.get('/faculty-remarks', async (req, res) => {
  try {
    const role = String(req.user?.role || '').trim().toLowerCase();
    if (!['hod','iqac_dept'].includes(role)) {
      return res.status(403).json({ error: 'Only HOD / IQAC department coordinator can view faculty remarks.' });
    }

    const department = String(req.user?.department || '').trim();
    const result = await db.query(`
      SELECT id, empid, faculty_name, department, remark, remark_by, created_at
      FROM faculty_remarks
      WHERE department = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [department]);

    res.json(result.rows);
  } catch (err) {
    console.error('Fetch department faculty remarks error:', err);
    res.status(500).json({ error: 'Failed to fetch faculty remarks', details: err.message });
  }
});

// POST /api/intelligence/department-remark
// IQAC / Principal sends a remark to one department only.
router.post('/department-remark', async (req, res) => {
  try {
    const role = String(req.user?.role || '').trim().toLowerCase();
    if (!['iqac','principal'].includes(role)) {
      return res.status(403).json({ error: 'Only IQAC Coordinator / Principal can send department remarks.' });
    }

    const department = String(req.body?.department || '').trim();
    const remark = String(req.body?.remark || '').trim();

    if (!department || !remark) {
      return res.status(400).json({ error: 'Department and remark are required.' });
    }

    const result = await db.query(`
      INSERT INTO department_remarks
        (department, remark, remark_by)
      VALUES ($1,$2,$3)
      RETURNING *
    `, [
      department,
      remark,
      req.user.empid || req.user.email || role
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Department remark error:', err);
    res.status(500).json({ error: 'Failed to save department remark', details: err.message });
  }
});

// GET /api/intelligence/department-remarks
// HOD/faculty see their department remarks; IQAC/Principal can filter by department.
router.get('/department-remarks', async (req, res) => {
  try {
    const role = String(req.user?.role || '').trim().toLowerCase();
    let department = String(req.query.department || req.user?.department || '').trim();

    let sql = `
      SELECT id, department, remark, remark_by, created_at
      FROM department_remarks
      WHERE 1=1
    `;
    const params = [];

    if (!['iqac','principal'].includes(role)) {
      if (!department || department === '—') {
        return res.status(400).json({ error: 'Department not found.' });
      }
      params.push(department);
      sql += ` AND department = $${params.length}`;
    } else if (department && department !== 'All') {
      params.push(department);
      sql += ` AND department = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch department remarks error:', err);
    res.status(500).json({ error: 'Failed to fetch department remarks', details: err.message });
  }
});

module.exports = router;
