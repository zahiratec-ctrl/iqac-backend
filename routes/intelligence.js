// backend/routes/intelligence.js — AICTE/NBA norms + year-wise intake + event gap intelligence
const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function pg(sql, params = []) {
  let i = 0;
  return db.query(sql.replace(/\?/g, () => `$${++i}`), params);
}

function safeNum(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function ceilDiv(a, b) {
  if (!b) return 0;
  return Math.ceil(safeNum(a) / safeNum(b));
}

function positiveGap(required, existing) {
  return Math.max(0, safeNum(required) - safeNum(existing));
}

function roleOf(req) {
  return String(req.user?.role || '').trim().toLowerCase();
}

const CORE_DEPTS = ['CSE', 'ISE', 'ECE', 'AIML', 'ME'];
const BASIC_DEPTS = ['Maths', 'Physics', 'Chemistry', 'Humanities'];

// Fallback only. Database table department_intake will override this.
// For CSE example: 1st year 360, 2nd year 300, 3rd year 300, 4th year 180.
const FALLBACK_YEARWISE_INTAKE = {
  CSE:  { y1: 360, y2: 300, y3: 300, y4: 180 },
  ISE:  { y1: 120, y2: 120, y3: 120, y4: 120 },
  ECE:  { y1: 180, y2: 180, y3: 180, y4: 180 },
  AIML: { y1: 120, y2: 120, y3: 120, y4: 120 },
  ME:   { y1: 60,  y2: 60,  y3: 60,  y4: 60  },
  Maths:      { y1: 0, y2: 0, y3: 0, y4: 0 },
  Physics:    { y1: 0, y2: 0, y3: 0, y4: 0 },
  Chemistry:  { y1: 0, y2: 0, y3: 0, y4: 0 },
  Humanities: { y1: 0, y2: 0, y3: 0, y4: 0 },
  IQAC:       { y1: 0, y2: 0, y3: 0, y4: 0 }
};

// Conservative configurable defaults.
// Core dept SFR: use 20:1 as stronger NBA target, also return 25:1 reference.
const NORMS = {
  core_sfr_nba_strict: 20,
  core_sfr_nba_minimum: 25,
  basic_science_sfr: 20,
  phd_percent: 30,
  professor_ratio: 10,   // 1 Professor for 10 required faculty
  associate_ratio: 4,    // 1 Associate Professor for 4 required faculty
  min_events_organized: 6,
  min_faculty_attended_per_faculty: 1,
  minimum_criterion_events: {
    vac: 1,
    fdp: 2,
    guest: 2,
    workshop: 2,
    industry: 1,
    hackathon: 1,
    project: 1,
    symposium: 1,
    conference: 1
  }
};

function normalizeDept(dept) {
  const d = String(dept || '').trim();
  if (!d) return '';
  const upper = d.toUpperCase();
  if (upper === 'MATH' || upper === 'MATHEMATICS') return 'Maths';
  if (upper === 'HUMANITIES' || upper === 'HUMANITY' || upper === 'HSS') return 'Humanities';
  if (upper === 'PHYSICS') return 'Physics';
  if (upper === 'CHEMISTRY') return 'Chemistry';
  if (upper === 'AI&ML' || upper === 'AI-ML' || upper === 'AIML') return 'AIML';
  return upper;
}

async function ensureDepartmentIntakeTable() {
  // Safe auto-create. If table already exists, nothing changes.
  await db.query(`
    CREATE TABLE IF NOT EXISTS department_intake (
      id SERIAL PRIMARY KEY,
      department VARCHAR(50) UNIQUE NOT NULL,
      year1_intake INTEGER NOT NULL DEFAULT 0,
      year2_intake INTEGER NOT NULL DEFAULT 0,
      year3_intake INTEGER NOT NULL DEFAULT 0,
      year4_intake INTEGER NOT NULL DEFAULT 0,
      approved_intake INTEGER NOT NULL DEFAULT 0,
      program_years INTEGER NOT NULL DEFAULT 4,
      is_core BOOLEAN NOT NULL DEFAULT true,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Backward compatibility: if user created older table with only approved_intake.
  await db.query(`ALTER TABLE department_intake ADD COLUMN IF NOT EXISTS year1_intake INTEGER NOT NULL DEFAULT 0`);
  await db.query(`ALTER TABLE department_intake ADD COLUMN IF NOT EXISTS year2_intake INTEGER NOT NULL DEFAULT 0`);
  await db.query(`ALTER TABLE department_intake ADD COLUMN IF NOT EXISTS year3_intake INTEGER NOT NULL DEFAULT 0`);
  await db.query(`ALTER TABLE department_intake ADD COLUMN IF NOT EXISTS year4_intake INTEGER NOT NULL DEFAULT 0`);
  await db.query(`ALTER TABLE department_intake ADD COLUMN IF NOT EXISTS approved_intake INTEGER NOT NULL DEFAULT 0`);
  await db.query(`ALTER TABLE department_intake ADD COLUMN IF NOT EXISTS program_years INTEGER NOT NULL DEFAULT 4`);
  await db.query(`ALTER TABLE department_intake ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT true`);

  const fallbackRows = Object.entries(FALLBACK_YEARWISE_INTAKE).map(([department, v]) => ({
    department,
    y1: v.y1 || 0,
    y2: v.y2 || 0,
    y3: v.y3 || 0,
    y4: v.y4 || 0,
    is_core: CORE_DEPTS.includes(department)
  }));

  for (const r of fallbackRows) {
    await db.query(`
      INSERT INTO department_intake
        (department, year1_intake, year2_intake, year3_intake, year4_intake, approved_intake, program_years, is_core)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (department) DO NOTHING
    `, [r.department, r.y1, r.y2, r.y3, r.y4, r.y1, r.is_core ? 4 : 1, r.is_core]);
  }
}


async function ensureIntelligenceSupportTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS intelligence_reports (
      id SERIAL PRIMARY KEY,
      report_type VARCHAR(100),
      scope VARCHAR(100),
      department VARCHAR(100),
      generated_by VARCHAR(100),
      remarks TEXT,
      summary_json JSONB DEFAULT '{}'::jsonb,
      visible_to VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS faculty_remarks (
      id SERIAL PRIMARY KEY,
      empid VARCHAR(100),
      faculty_name VARCHAR(255),
      department VARCHAR(100),
      remark TEXT,
      remark_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS department_remarks (
      id SERIAL PRIMARY KEY,
      department VARCHAR(100),
      remark TEXT,
      remark_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function getIntakeRows() {
  try {
    await ensureDepartmentIntakeTable();
    const result = await db.query(`
      SELECT department, year1_intake, year2_intake, year3_intake, year4_intake,
             approved_intake, program_years, is_core
      FROM department_intake
    `);

    const map = {};
    for (const r of result.rows) {
      const dept = normalizeDept(r.department);
      const y1 = safeNum(r.year1_intake) || safeNum(r.approved_intake);
      const y2 = safeNum(r.year2_intake);
      const y3 = safeNum(r.year3_intake);
      const y4 = safeNum(r.year4_intake);
      map[dept] = {
        department: dept,
        y1, y2, y3, y4,
        total_strength: y1 + y2 + y3 + y4,
        approved_intake: safeNum(r.approved_intake) || y1,
        program_years: safeNum(r.program_years) || 4,
        is_core: !!r.is_core
      };
    }
    return map;
  } catch (err) {
    console.warn('department_intake read warning:', err.message);
    const map = {};
    for (const [dept, v] of Object.entries(FALLBACK_YEARWISE_INTAKE)) {
      map[dept] = {
        department: dept,
        y1: v.y1 || 0,
        y2: v.y2 || 0,
        y3: v.y3 || 0,
        y4: v.y4 || 0,
        total_strength: (v.y1 || 0) + (v.y2 || 0) + (v.y3 || 0) + (v.y4 || 0),
        approved_intake: v.y1 || 0,
        program_years: CORE_DEPTS.includes(dept) ? 4 : 1,
        is_core: CORE_DEPTS.includes(dept)
      };
    }
    return map;
  }
}

function getNbaMappingByEventType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('vac') || t.includes('value')) return ['NBA C1.2.4 Content beyond syllabus', 'NBA C2.1 Teaching-Learning enrichment'];
  if (t.includes('fdp') || t.includes('faculty development')) return ['NBA C5 Faculty Information', 'NBA C6 Faculty Contributions'];
  if (t.includes('guest')) return ['NBA C2.8 Industry Institute Partnership', 'NBA C4.7 Professional Activities'];
  if (t.includes('workshop')) return ['NBA C2.1 Teaching-Learning Process', 'NBA C6 Faculty Contributions'];
  if (t.includes('industry') || t.includes('industrial') || t.includes('visit')) return ['NBA C2.8 Industry Institute Partnership'];
  if (t.includes('hackathon') || t.includes('ideathon')) return ['NBA C2.7 Complex Engineering Problems & SDGs', 'NBA C4.7.2 Student Participation in Professional Events'];
  if (t.includes('project') || t.includes('expo')) return ['NBA C2.2 Quality of Capstone/Major Project', 'NBA C2.7 Complex Engineering Problems'];
  if (t.includes('symposium') || t.includes('technical fest')) return ['NBA C4.7 Professional Activities', 'NBA C4.7.1 Professional Bodies/Chapters/Clubs'];
  if (t.includes('conference') || t.includes('seminar')) return ['NBA C6 Faculty Contributions', 'NBA C4.7 Professional Activities'];
  if (t.includes('research') || t.includes('patent') || t.includes('publication')) return ['NBA C6 Faculty Contributions', 'NBA C3.4 Research and Publications'];
  return ['NBA C2 Teaching-Learning', 'NBA C6 Faculty Contributions'];
}

function getNaacMappingByEventType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('vac') || t.includes('value')) return ['NAAC 1.3 Curriculum Enrichment', 'NAAC 2.3 Teaching-Learning Process'];
  if (t.includes('fdp') || t.includes('faculty development')) return ['NAAC 6.3 Faculty Empowerment Strategies'];
  if (t.includes('guest')) return ['NAAC 2.3 Teaching-Learning Process', 'NAAC 3.5 Collaboration'];
  if (t.includes('workshop')) return ['NAAC 2.3 Experiential Learning', 'NAAC 6.3 Faculty Development'];
  if (t.includes('industry') || t.includes('industrial') || t.includes('visit')) return ['NAAC 3.5 Collaboration', 'NAAC 2.3 Experiential Learning'];
  if (t.includes('hackathon') || t.includes('ideathon')) return ['NAAC 3.4 Extension/Innovation Activities', 'NAAC 5.3 Student Participation'];
  if (t.includes('project') || t.includes('expo')) return ['NAAC 2.3 Experiential Learning', 'NAAC 3.4 Research/Innovation'];
  if (t.includes('symposium') || t.includes('technical fest')) return ['NAAC 5.3 Student Participation', 'NAAC 3.4 Research/Academic Activities'];
  if (t.includes('conference') || t.includes('seminar')) return ['NAAC 3.4 Research Publications/Awards', 'NAAC 6.3 Faculty Development'];
  if (t.includes('research') || t.includes('patent') || t.includes('publication')) return ['NAAC 3.3 Research Publications and Awards', 'NAAC 3.4 Research Activities'];
  return ['NAAC 2 Teaching-Learning', 'NAAC 6 Governance and Faculty Development'];
}

function eventBucket(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('vac') || t.includes('value')) return 'vac';
  if (t.includes('fdp') || t.includes('faculty development')) return 'fdp';
  if (t.includes('guest')) return 'guest';
  if (t.includes('workshop')) return 'workshop';
  if (t.includes('industry') || t.includes('industrial') || t.includes('visit')) return 'industry';
  if (t.includes('hackathon') || t.includes('ideathon')) return 'hackathon';
  if (t.includes('project') || t.includes('expo')) return 'project';
  if (t.includes('symposium') || t.includes('technical fest')) return 'symposium';
  if (t.includes('conference') || t.includes('seminar')) return 'conference';
  return 'other';
}

function buildCriterionCoverage(row) {
  const nba = new Set();
  const naac = new Set();

  if (row.total_faculty > 0) {
    nba.add('NBA C5 Faculty Information');
    naac.add('NAAC 2.4 Teacher Profile and Quality');
  }

  const countMap = row.event_counts || {};
  Object.keys(countMap).forEach(k => {
    if (safeNum(countMap[k]) > 0) {
      getNbaMappingByEventType(k).forEach(x => nba.add(x));
      getNaacMappingByEventType(k).forEach(x => naac.add(x));
    }
  });

  if (row.attended_count > 0) {
    nba.add('NBA C6 Faculty Contributions');
    naac.add('NAAC 6.3 Faculty Empowerment Strategies');
  }

  return { nba: [...nba], naac: [...naac] };
}

function computeNorms(dept, intakeInfo, institutionalFirstYearIntake) {
  const normalized = normalizeDept(dept);
  const isCore = CORE_DEPTS.includes(normalized) || intakeInfo?.is_core;

  if (isCore) {
    const totalStrength = safeNum(intakeInfo?.total_strength);
    const required20 = ceilDiv(totalStrength, NORMS.core_sfr_nba_strict);
    const required25 = ceilDiv(totalStrength, NORMS.core_sfr_nba_minimum);
    const required = required20; // stricter NBA-ready target

    return {
      norm_basis: 'Core UG department: year-wise total student strength / NBA-ready SFR 20:1',
      is_core: true,
      total_strength: totalStrength,
      required_faculty: required,
      required_faculty_nba_20: required20,
      required_faculty_nba_25: required25,
      required_prof_count: Math.max(1, Math.ceil(required / NORMS.professor_ratio)),
      required_assoc_count: Math.max(1, Math.ceil(required / NORMS.associate_ratio)),
      required_phd_percent: NORMS.phd_percent,
      required_phd_count: Math.ceil((required * NORMS.phd_percent) / 100)
    };
  }

  if (BASIC_DEPTS.includes(normalized)) {
    const requiredTotalBasic = ceilDiv(institutionalFirstYearIntake, NORMS.basic_science_sfr);
    // Distribute across Maths, Physics, Chemistry, Humanities.
    let share = 0.25;
    if (normalized === 'Maths') share = 0.35;
    if (normalized === 'Physics') share = 0.25;
    if (normalized === 'Chemistry') share = 0.25;
    if (normalized === 'Humanities') share = 0.15;

    const required = Math.max(1, Math.ceil(requiredTotalBasic * share));

    return {
      norm_basis: 'Basic Science/Humanities: institutional first-year intake / AICTE workload-based SFR 20:1, distributed by subject load',
      is_core: false,
      total_strength: institutionalFirstYearIntake,
      required_faculty: required,
      required_faculty_nba_20: required,
      required_faculty_nba_25: required,
      required_prof_count: normalized === 'Maths' ? 1 : 0,
      required_assoc_count: Math.ceil(required / 4),
      required_phd_percent: NORMS.phd_percent,
      required_phd_count: Math.ceil((required * NORMS.phd_percent) / 100)
    };
  }

  return {
    norm_basis: 'No intake norm configured',
    is_core: false,
    total_strength: 0,
    required_faculty: 0,
    required_faculty_nba_20: 0,
    required_faculty_nba_25: 0,
    required_prof_count: 0,
    required_assoc_count: 0,
    required_phd_percent: NORMS.phd_percent,
    required_phd_count: 0
  };
}

function buildEventGapAnalysis(row) {
  const counts = row.event_counts || {};
  const gaps = [];
  const suggested_events = [];

  const checks = [
    {
      key: 'vac',
      label: 'Value Added Course / Certification Course',
      target: NORMS.minimum_criterion_events.vac,
      nba: 'NBA C1.2.4, C2.1',
      naac: 'NAAC 1.3, 2.3',
      suggestion: 'Organise one 30-hour value added course/certification course aligned with emerging technology.'
    },
    {
      key: 'guest',
      label: 'Industry/Academic Guest Lecture',
      target: NORMS.minimum_criterion_events.guest,
      nba: 'NBA C2.8, C4.7',
      naac: 'NAAC 2.3, 3.5',
      suggestion: 'Organise expert talks by industry/alumni/research organisations with attendance, photos and feedback.'
    },
    {
      key: 'fdp',
      label: 'FDP / Faculty Development Activity',
      target: NORMS.minimum_criterion_events.fdp,
      nba: 'NBA C5, C6',
      naac: 'NAAC 6.3',
      suggestion: 'Conduct/attend FDPs on OBE, AI tools, research methodology, patents or advanced domain topics.'
    },
    {
      key: 'workshop',
      label: 'Hands-on Workshop',
      target: NORMS.minimum_criterion_events.workshop,
      nba: 'NBA C2.1, C6',
      naac: 'NAAC 2.3, 6.3',
      suggestion: 'Organise hands-on workshops with lab outcomes and student/faculty participation proof.'
    },
    {
      key: 'industry',
      label: 'Industry Visit / MoU / Collaboration',
      target: NORMS.minimum_criterion_events.industry,
      nba: 'NBA C2.8',
      naac: 'NAAC 3.5',
      suggestion: 'Arrange industry visit, MoU activity, internship interaction or collaborative technical session.'
    },
    {
      key: 'hackathon',
      label: 'Hackathon / Ideathon / Coding Contest',
      target: NORMS.minimum_criterion_events.hackathon,
      nba: 'NBA C2.7, C4.7.2',
      naac: 'NAAC 3.4, 5.3',
      suggestion: 'Conduct hackathon/ideathon/problem-solving challenge mapped to SDGs or complex engineering problems.'
    },
    {
      key: 'project',
      label: 'Project Expo / Capstone Showcase',
      target: NORMS.minimum_criterion_events.project,
      nba: 'NBA C2.2, C2.7',
      naac: 'NAAC 2.3, 3.4',
      suggestion: 'Organise project exhibition/capstone review with rubrics, jury, photos and project outcomes.'
    },
    {
      key: 'symposium',
      label: 'Symposium / Professional Body Activity',
      target: NORMS.minimum_criterion_events.symposium,
      nba: 'NBA C4.7',
      naac: 'NAAC 5.3, 3.4',
      suggestion: 'Conduct professional society activity, technical symposium or student chapter event.'
    }
  ];

  for (const c of checks) {
    const existing = safeNum(counts[c.key]);
    const gap = Math.max(0, c.target - existing);
    gaps.push({
      type: c.label,
      key: c.key,
      existing,
      required: c.target,
      gap,
      nba_mapping: c.nba,
      naac_mapping: c.naac,
      priority: gap > 0 ? 'High' : 'Covered'
    });
    if (gap > 0) suggested_events.push(c.suggestion);
  }

  if (row.attended_count < row.total_faculty) {
    gaps.push({
      type: 'Faculty attended FDP/Workshop/Conference',
      key: 'attended',
      existing: row.attended_count,
      required: row.total_faculty,
      gap: row.total_faculty - row.attended_count,
      nba_mapping: 'NBA C6',
      naac_mapping: 'NAAC 6.3',
      priority: 'High'
    });
    suggested_events.push('Ensure every faculty uploads at least one attended FDP/workshop/conference certificate.');
  }

  return {
    gaps,
    suggested_events: [...new Set(suggested_events)],
    max_score_strategy: [
      'First conduct VAC/certification course because it supports curriculum enrichment and teaching-learning evidence.',
      'Next conduct industry guest lecture or MoU activity because it supports NBA C2.8 and NAAC 3.5.',
      'Then conduct hackathon/project expo because it supports complex engineering problems, student participation and experiential learning.',
      'Ensure every event has brochure, attendance, photos, report, feedback and outcome mapping.'
    ]
  };
}

function buildRecommendations(row) {
  const rec = [];

  if (row.faculty_shortfall > 0) {
    rec.push(`Recruit/appoint ${row.faculty_shortfall} faculty to meet AICTE/NBA SFR requirement based on year-wise student strength.`);
  }
  if (row.prof_shortfall > 0) {
    rec.push(`Add/identify ${row.prof_shortfall} Professor level faculty for cadre compliance.`);
  }
  if (row.assoc_shortfall > 0) {
    rec.push(`Add/identify ${row.assoc_shortfall} Associate Professor level faculty for cadre balance.`);
  }
  if (row.phd_gap > 0) {
    rec.push(`Add/identify ${row.phd_gap} Ph.D-qualified faculty. Required Ph.D faculty = ${row.required_phd_count} (${row.required_phd_percent}% of required faculty).`);
  }
  if (row.event_gap_analysis?.suggested_events?.length) {
    rec.push(...row.event_gap_analysis.suggested_events.slice(0, 5));
  }
  if (row.missing_docs > 0) {
    rec.push(`${row.missing_docs} faculty profile(s) have missing documents. Complete appointment order, PAN, Aadhar and resume uploads.`);
  }
  if (!rec.length) {
    rec.push('Department shows good compliance coverage. Continue evidence uploads and event mapping.');
  }

  return [...new Set(rec)];
}

function computeComplianceScore(row) {
  let score = 0;

  if (!row.required_faculty || row.total_faculty >= row.required_faculty) {
    score += 25;
  } else {
    score += Math.round((row.total_faculty / row.required_faculty) * 25);
  }

  if (!row.required_prof_count || row.prof_count >= row.required_prof_count) {
    score += 10;
  } else {
    score += Math.round((row.prof_count / row.required_prof_count) * 10);
  }

  if (!row.required_assoc_count || row.assoc_count >= row.required_assoc_count) {
    score += 10;
  } else {
    score += Math.round((row.assoc_count / row.required_assoc_count) * 10);
  }

  // Ph.D score is based on required Ph.D count, not existing-faculty percentage.
  if (!row.required_phd_count || row.phd_count >= row.required_phd_count) {
    score += 15;
  } else {
    score += Math.round((row.phd_count / row.required_phd_count) * 15);
  }

  const eventGapCount = (row.event_gap_analysis?.gaps || []).filter(g => g.gap > 0).length;
  score += Math.max(0, 20 - Math.min(20, eventGapCount * 3));

  const nbaCount = (row.criterion_coverage?.nba || []).length;
  const naacCount = (row.criterion_coverage?.naac || []).length;
  score += Math.min(10, nbaCount * 2);
  score += Math.min(10, naacCount * 2);

  if (row.missing_docs === 0) score += 10;
  else score += Math.max(0, 10 - Math.min(10, row.missing_docs));

  return Math.max(0, Math.min(100, score));
}

function getFSR(totalStrength, faculty) {
  if (!totalStrength || !faculty) return 'NA';
  return `1:${Math.round(totalStrength / faculty)}`;
}

async function buildDepartmentRow(dept, intakeMap, institutionalFirstYearIntake) {
  const department = normalizeDept(dept);
  const intakeInfo = intakeMap[department] || {
    department,
    y1: 0, y2: 0, y3: 0, y4: 0,
    total_strength: 0,
    approved_intake: 0,
    program_years: CORE_DEPTS.includes(department) ? 4 : 1,
    is_core: CORE_DEPTS.includes(department)
  };

  // Faculty count includes HOD/IQAC Coordinator from users table when their profile is not separately present in faculty table.
  const facRes = await pg(`
    WITH faculty_base AS (
      SELECT
        empid, name, department, designation, qualification, teaching_exp,
        doc_appt, doc_pan, doc_aadhar, doc_resume,
        'faculty_profile' AS source_type
      FROM faculty
      WHERE department = ?

      UNION ALL

      SELECT
        u.empid,
        COALESCE(u.email, u.empid) AS name,
        u.department,
        CASE
          WHEN LOWER(u.role::text) = 'hod' THEN 'HOD'
          WHEN LOWER(u.role::text) = 'iqac' THEN 'IQAC Coordinator'
          WHEN LOWER(u.role::text) = 'iqac_dept' THEN 'IQAC Department Coordinator'
          ELSE u.role
        END AS designation,
        '' AS qualification,
        0 AS teaching_exp,
        '—' AS doc_appt,
        '—' AS doc_pan,
        '—' AS doc_aadhar,
        '—' AS doc_resume,
        'user_login_role' AS source_type
      FROM users u
      WHERE u.department = ?
        AND LOWER(u.role::text) IN ('hod','iqac','iqac_dept')
        AND NOT EXISTS (
          SELECT 1 FROM faculty f
          WHERE f.empid = u.empid
        )
    )
    SELECT
      COUNT(DISTINCT empid) AS total_faculty,
      SUM(CASE WHEN designation ILIKE '%Professor%' AND designation NOT ILIKE '%Associate%' AND designation NOT ILIKE '%Assistant%' THEN 1 ELSE 0 END) AS prof_count,
      SUM(CASE WHEN designation ILIKE '%Associate%' THEN 1 ELSE 0 END) AS assoc_count,
      SUM(CASE WHEN designation ILIKE '%Assistant%' THEN 1 ELSE 0 END) AS asst_count,
      SUM(CASE WHEN qualification ILIKE '%ph%' OR qualification ILIKE '%doctor%' THEN 1 ELSE 0 END) AS phd_count,
      AVG(NULLIF(teaching_exp,0)) AS avg_teaching_exp,
      SUM(CASE WHEN source_type = 'faculty_profile' AND
                 (doc_appt IN ('—','') OR doc_appt IS NULL
                 OR doc_pan IN ('—','') OR doc_pan IS NULL
                 OR doc_aadhar IN ('—','') OR doc_aadhar IS NULL
                 OR doc_resume IN ('—','') OR doc_resume IS NULL)
               THEN 1 ELSE 0 END) AS missing_docs
    FROM faculty_base`, [department, department]);

  const fac = facRes.rows[0] || {};

  const evRes = await pg(`
    SELECT COALESCE(type,'Other') AS type, COUNT(*) AS cnt
    FROM events
    WHERE department = ?
    GROUP BY COALESCE(type,'Other')`, [department]);

  const attRes = await pg(`
    SELECT COALESCE(event_type,'Other') AS event_type, COUNT(*) AS cnt
    FROM events_attended
    WHERE department = ?
    GROUP BY COALESCE(event_type,'Other')`, [department]);

  const organized_mapping = [];
  const attended_mapping = [];
  const event_counts = {
    vac: 0, fdp: 0, guest: 0, workshop: 0, industry: 0,
    hackathon: 0, project: 0, symposium: 0, conference: 0, other: 0
  };

  let total_events = 0;
  for (const e of evRes.rows) {
    const type = e.type || 'Other';
    const cnt = safeNum(e.cnt);
    const bucket = eventBucket(type);
    event_counts[bucket] = safeNum(event_counts[bucket]) + cnt;
    total_events += cnt;
    organized_mapping.push({
      activity_type: type,
      count: cnt,
      nba: getNbaMappingByEventType(type),
      naac: getNaacMappingByEventType(type)
    });
  }

  let attended_count = 0;
  for (const a of attRes.rows) {
    const type = a.event_type || 'Other';
    const cnt = safeNum(a.cnt);
    const bucket = eventBucket(type);
    event_counts[bucket] = safeNum(event_counts[bucket]) + cnt;
    attended_count += cnt;
    attended_mapping.push({
      activity_type: type,
      count: cnt,
      nba: getNbaMappingByEventType(type),
      naac: getNaacMappingByEventType(type)
    });
  }

  const totalFaculty = safeNum(fac.total_faculty);
  const phdCount = safeNum(fac.phd_count);
  const norms = computeNorms(department, intakeInfo, institutionalFirstYearIntake);

  const row = {
    department,
    year1_intake: intakeInfo.y1,
    year2_intake: intakeInfo.y2,
    year3_intake: intakeInfo.y3,
    year4_intake: intakeInfo.y4,
    approved_intake: intakeInfo.approved_intake,
    total_student_strength: norms.total_strength,
    norm_basis: norms.norm_basis,
    fsr: getFSR(norms.total_strength, totalFaculty),

    total_faculty: totalFaculty,
    prof_count: safeNum(fac.prof_count),
    assoc_count: safeNum(fac.assoc_count),
    asst_count: safeNum(fac.asst_count),
    phd_count: phdCount,
    required_phd_count: norms.required_phd_count,
    // PhD compliance is calculated against required PhD count, not only existing faculty.
    // Example: if ECE requires 36 faculty, required PhD = 11. If only 1 PhD exists, compliance = 9%, not 100%.
    phd_percent: norms.required_phd_count ? Math.round((phdCount / norms.required_phd_count) * 100) : 0,
    phd_percent_existing_faculty: totalFaculty ? Math.round((phdCount / totalFaculty) * 100) : 0,
    avg_teaching_exp: Math.round(safeNum(fac.avg_teaching_exp)),
    missing_docs: safeNum(fac.missing_docs),

    required_faculty: norms.required_faculty,
    required_faculty_nba_20: norms.required_faculty_nba_20,
    required_faculty_nba_25: norms.required_faculty_nba_25,
    faculty_shortfall: positiveGap(norms.required_faculty, totalFaculty),
    required_prof_count: norms.required_prof_count,
    prof_shortfall: positiveGap(norms.required_prof_count, safeNum(fac.prof_count)),
    required_assoc_count: norms.required_assoc_count,
    assoc_shortfall: positiveGap(norms.required_assoc_count, safeNum(fac.assoc_count)),
    required_phd_percent: norms.required_phd_percent,
    phd_gap: positiveGap(norms.required_phd_count, phdCount),

    total_events,
    attended_count,
    event_counts,
    organized_mapping,
    attended_mapping
  };

  row.criterion_coverage = buildCriterionCoverage(row);
  row.event_gap_analysis = buildEventGapAnalysis(row);
  row.recommendations = buildRecommendations(row);
  row.compliance_score = computeComplianceScore(row);
  row.quality_score = row.compliance_score;

  row.strengths = [];
  row.weaknesses = [];

  if (row.faculty_shortfall === 0) row.strengths.push('Faculty strength meets configured AICTE/NBA SFR requirement.');
  else row.weaknesses.push(`Faculty shortfall of ${row.faculty_shortfall} based on year-wise intake.`);

  if (row.phd_gap === 0) row.strengths.push('Ph.D faculty percentage meets benchmark.');
  else row.weaknesses.push('Ph.D faculty percentage needs improvement.');

  if ((row.event_gap_analysis.gaps || []).filter(g => g.gap > 0).length === 0) row.strengths.push('Event mapping coverage is strong.');
  else row.weaknesses.push('Some NBA/NAAC event mapping areas need additional activities.');

  return row;
}

// GET /api/intelligence/department-report
router.get('/department-report', async (req, res) => {
  try {
    await ensureIntelligenceSupportTables();
    let role = String(req.user?.role || '').trim().toLowerCase();
    let department = normalizeDept(req.user?.department || '');

    if ((!department || department === '—') && req.query.department) {
      department = normalizeDept(req.query.department);
    }

    const intakeMap = await getIntakeRows();

    const institutionalFirstYearIntake = Object.keys(intakeMap)
      .filter(d => CORE_DEPTS.includes(d))
      .reduce((sum, d) => sum + safeNum(intakeMap[d].y1 || intakeMap[d].approved_intake), 0);

    let departments = [];

    if (department && department !== '—' && !['iqac', 'principal'].includes(role)) {
      departments = [{ department }];
    } else if (['iqac', 'principal'].includes(role)) {
      const result = await pg(`
        SELECT DISTINCT department FROM faculty WHERE department IS NOT NULL AND department <> '—'
        UNION
        SELECT DISTINCT department FROM events WHERE department IS NOT NULL AND department <> '—'
        UNION
        SELECT DISTINCT department FROM events_attended WHERE department IS NOT NULL AND department <> '—'
        UNION
        SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department <> '—' AND department <> '-'
        UNION
        SELECT department FROM department_intake
      `);
      departments = result.rows;
    } else if (department) {
      departments = [{ department }];
    } else {
      return res.status(403).json({
        error: 'Access denied: department not found in login token',
        user: req.user
      });
    }

    const report = [];
    const seen = new Set();

    for (const d of departments) {
      const dept = normalizeDept(d.department);
      if (!dept || dept === '—' || seen.has(dept)) continue;
      seen.add(dept);
      report.push(await buildDepartmentRow(dept, intakeMap, institutionalFirstYearIntake));
    }

    res.json(report);
  } catch (err) {
    console.error('Intelligence department-report error:', err);
    res.status(500).json({
      error: 'Failed to generate intelligence report',
      details: err.message
    });
  }
});

// GET /api/intelligence/intake
router.get('/intake', async (req, res) => {
  try {
    if (!['iqac', 'principal'].includes(roleOf(req))) {
      return res.status(403).json({ error: 'Only IQAC/Principal can view intake master.' });
    }

    const map = await getIntakeRows();
    res.json(Object.values(map));
  } catch (err) {
    console.error('Intake fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch intake master', details: err.message });
  }
});

// POST /api/intelligence/intake
router.post('/intake', async (req, res) => {
  try {
    if (!['iqac', 'principal'].includes(roleOf(req))) {
      return res.status(403).json({ error: 'Only IQAC/Principal can update intake master.' });
    }

    await ensureDepartmentIntakeTable();

    const rows = Array.isArray(req.body) ? req.body : [req.body];

    for (const r of rows) {
      const department = normalizeDept(r.department);
      if (!department) continue;

      const y1 = safeNum(r.year1_intake ?? r.y1 ?? r.approved_intake);
      const y2 = safeNum(r.year2_intake ?? r.y2);
      const y3 = safeNum(r.year3_intake ?? r.y3);
      const y4 = safeNum(r.year4_intake ?? r.y4);
      const isCore = r.is_core === undefined ? CORE_DEPTS.includes(department) : !!r.is_core;

      await db.query(`
        INSERT INTO department_intake
          (department, year1_intake, year2_intake, year3_intake, year4_intake, approved_intake, program_years, is_core, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        ON CONFLICT (department) DO UPDATE SET
          year1_intake = EXCLUDED.year1_intake,
          year2_intake = EXCLUDED.year2_intake,
          year3_intake = EXCLUDED.year3_intake,
          year4_intake = EXCLUDED.year4_intake,
          approved_intake = EXCLUDED.approved_intake,
          program_years = EXCLUDED.program_years,
          is_core = EXCLUDED.is_core,
          updated_at = NOW()
      `, [department, y1, y2, y3, y4, y1, isCore ? 4 : 1, isCore]);
    }

    res.json({ message: 'Intake master updated successfully' });
  } catch (err) {
    console.error('Intake update error:', err);
    res.status(500).json({ error: 'Failed to update intake master', details: err.message });
  }
});

// GET /api/intelligence/my-contribution
router.get('/my-contribution', async (req, res) => {
  try {
    let { empid, role, department } = req.user;
    role = String(role || '').trim().toLowerCase();

    if (role !== 'faculty') {
      return res.status(403).json({ error: 'Only faculty can access personal contribution.' });
    }

    const evRes = await pg(`
      SELECT id, name, type, department, event_date, status
      FROM events
      WHERE submitted_by = ?
      ORDER BY event_date DESC, id DESC
    `, [empid]);

    const attRes = await pg(`
      SELECT id, event_name, event_type, department, event_date, academic_year
      FROM events_attended
      WHERE submitted_by = ?
      ORDER BY event_date DESC, id DESC
    `, [empid]);

    const facRes = await pg(`
      SELECT name, department, designation, qualification, teaching_exp, research_exp, industry_exp,
             doc_appt, doc_pan, doc_aadhar, doc_resume
      FROM faculty
      WHERE empid = ?
      LIMIT 1
    `, [empid]);

    const fac = facRes.rows[0] || null;

    const organizedMapped = evRes.rows.map(e => ({
      title: e.name,
      type: e.type,
      department: e.department,
      date: e.event_date,
      status: e.status,
      nba: getNbaMappingByEventType(e.type),
      naac: getNaacMappingByEventType(e.type)
    }));

    const attendedMapped = attRes.rows.map(a => ({
      title: a.event_name,
      type: a.event_type,
      department: a.department,
      date: a.event_date,
      academic_year: a.academic_year,
      nba: getNbaMappingByEventType(a.event_type),
      naac: getNaacMappingByEventType(a.event_type)
    }));

    const missingDocs = [];
    if (fac) {
      if (!fac.doc_appt || fac.doc_appt === '—') missingDocs.push('Appointment Order');
      if (!fac.doc_pan || fac.doc_pan === '—') missingDocs.push('PAN');
      if (!fac.doc_aadhar || fac.doc_aadhar === '—') missingDocs.push('Aadhar');
      if (!fac.doc_resume || fac.doc_resume === '—') missingDocs.push('Resume/CV');
    }

    const suggestions = [];
    const attendedTypes = attRes.rows.map(a => String(a.event_type || '').toLowerCase()).join(' ');
    const organizedTypes = evRes.rows.map(e => String(e.type || '').toLowerCase()).join(' ');

    if (!organizedTypes.includes('guest')) suggestions.push('Organize guest lecture/industry expert talk for NBA C2.8 and NAAC 3.5.');
    if (!organizedTypes.includes('project')) suggestions.push('Coordinate project expo/capstone showcase for NBA C2.2/C2.7 and NAAC 2.3/3.4.');
    if (!organizedTypes.includes('hackathon')) suggestions.push('Coordinate hackathon/ideathon for NBA C4.7.2 and NAAC 5.3.');
    if (!organizedTypes.includes('vac')) suggestions.push('Organize value added course for NBA C1.2.4 and NAAC 1.3.');
    if (!attendedTypes.includes('conference')) suggestions.push('Attend conference/seminar to strengthen NBA C6 and NAAC 3.4/6.3.');
    if (!attendedTypes.includes('fdp') && !attendedTypes.includes('workshop')) suggestions.push('Attend FDP/workshop for NBA C6 and NAAC 6.3.');
    if (missingDocs.length > 0) suggestions.push(`Upload missing faculty documents: ${missingDocs.join(', ')}.`);

    res.json({
      faculty: fac || { department, designation: '', qualification: '' },
      summary: {
        organized_count: evRes.rows.length,
        attended_count: attRes.rows.length,
        missing_documents: missingDocs.length
      },
      organized: organizedMapped,
      attended: attendedMapped,
      missing_documents: missingDocs,
      suggestions
    });
  } catch (err) {
    console.error('My contribution error:', err);
    res.status(500).json({
      error: 'Failed to generate faculty contribution report',
      details: err.message
    });
  }
});

// GET /api/intelligence/faculty-contribution
router.get('/faculty-contribution', async (req, res) => {
  try {
    let role = String(req.user?.role || '').trim().toLowerCase();
    let department = normalizeDept(req.user?.department || '');

    if (!['hod', 'iqac_dept'].includes(role)) {
      return res.status(403).json({ error: 'Only HOD / IQAC department coordinator can view faculty contribution matrix.' });
    }

    if (!department || department === '—') {
      return res.status(400).json({ error: 'Department not found in login token.' });
    }

    // Include HOD/IQAC Department Coordinator in faculty contribution list if profile is not separately added.
    const facRes = await pg(`
      WITH faculty_list AS (
        SELECT empid, name, email, department, designation, qualification, teaching_exp,
               doc_appt, doc_pan, doc_aadhar, doc_resume
        FROM faculty
        WHERE department = ?

        UNION ALL

        SELECT
          u.empid,
          COALESCE(u.email, u.empid) AS name,
          u.email,
          u.department,
          CASE
            WHEN LOWER(u.role::text) = 'hod' THEN 'HOD'
            WHEN LOWER(u.role::text) = 'iqac_dept' THEN 'IQAC Department Coordinator'
            ELSE u.role
          END AS designation,
          '' AS qualification,
          0 AS teaching_exp,
          '—' AS doc_appt,
          '—' AS doc_pan,
          '—' AS doc_aadhar,
          '—' AS doc_resume
        FROM users u
        WHERE u.department = ?
          AND LOWER(u.role::text) IN ('hod','iqac_dept')
          AND NOT EXISTS (
            SELECT 1 FROM faculty f
            WHERE f.empid = u.empid
          )
      )
      SELECT *
      FROM faculty_list
      ORDER BY name ASC, empid ASC
    `, [department, department]);

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
      ['doc_appt', 'doc_pan', 'doc_aadhar', 'doc_resume'].forEach(k => {
        if (!f[k] || f[k] === '—' || f[k] === '') missing_docs++;
      });

      let score = 0;
      if (organized_count > 0) score += 25;
      if (attended_count > 0) score += 25;
      if (String(f.qualification || '').toLowerCase().includes('ph')) score += 15;
      if (missing_docs === 0) score += 15;
      if (nbaSet.size >= 2 && naacSet.size >= 2) score += 20;

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
        contribution_score: Math.min(100, score),
        suggestions: [
          ...(organized_count ? [] : ['Organize at least one mapped academic/industry event.']),
          ...(attended_count ? [] : ['Attend and upload proof for FDP/workshop/conference.']),
          ...(missing_docs ? ['Complete missing faculty document uploads.'] : [])
        ]
      });
    }

    res.json(rows);
  } catch (err) {
    console.error('Faculty contribution intelligence error:', err);
    res.status(500).json({
      error: 'Failed to generate faculty contribution matrix',
      details: err.message
    });
  }
});

// POST /api/intelligence/reports
router.post('/reports', async (req, res) => {
  try {
    await ensureIntelligenceSupportTables();
    let role = String(req.user?.role || '').trim().toLowerCase();

    if (!['iqac', 'principal', 'hod', 'iqac_dept'].includes(role)) {
      return res.status(403).json({ error: 'Only IQAC, Principal and HOD roles can save reports.' });
    }

    const { report_type, scope, department, remarks, summary_json, visible_to } = req.body || {};

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
      visible_to || (['hod', 'iqac_dept'].includes(role) ? 'faculty' : 'hod')
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Save intelligence report error:', err);
    res.status(500).json({
      error: 'Failed to save intelligence report',
      details: err.message
    });
  }
});

// GET /api/intelligence/reports
router.get('/reports', async (req, res) => {
  try {
    await ensureIntelligenceSupportTables();
    let role = String(req.user?.role || '').trim().toLowerCase();
    let department = normalizeDept(req.user?.department || '');

    const visible_to = String(req.query.visible_to || '').trim();
    const qDept = normalizeDept(req.query.department || '');

    let sql = `SELECT id, report_type, scope, department, generated_by, remarks, visible_to, created_at
               FROM intelligence_reports WHERE 1=1`;
    const params = [];

    if (visible_to) {
      params.push(visible_to);
      sql += ` AND visible_to = $${params.length}`;
    }

    if (['hod', 'iqac_dept', 'faculty'].includes(role)) {
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
    res.status(500).json({
      error: 'Failed to fetch intelligence reports',
      details: err.message
    });
  }
});

// POST /api/intelligence/faculty-remark
router.post('/faculty-remark', async (req, res) => {
  try {
    await ensureIntelligenceSupportTables();
    const role = String(req.user?.role || '').trim().toLowerCase();

    if (!['hod', 'iqac_dept'].includes(role)) {
      return res.status(403).json({ error: 'Only HOD / IQAC department coordinator can send faculty remarks.' });
    }

    const empid = String(req.body?.empid || '').trim();
    const remark = String(req.body?.remark || '').trim();

    if (!empid || !remark) {
      return res.status(400).json({ error: 'Faculty Employee ID and remark are required.' });
    }

    const department = normalizeDept(req.user?.department || '');

    const fRes = await pg(
      `SELECT empid, name, department FROM faculty WHERE empid = ? LIMIT 1`,
      [empid]
    );

    if (!fRes.rows.length) {
      return res.status(404).json({ error: 'Faculty profile not found.' });
    }

    const faculty = fRes.rows[0];

    if (department && department !== '—' && normalizeDept(faculty.department) !== department) {
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
    res.status(500).json({
      error: 'Failed to save faculty remark',
      details: err.message
    });
  }
});

// GET /api/intelligence/my-faculty-remarks
router.get('/my-faculty-remarks', async (req, res) => {
  try {
    await ensureIntelligenceSupportTables();
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
    res.status(500).json({
      error: 'Failed to fetch faculty remarks',
      details: err.message
    });
  }
});

// GET /api/intelligence/faculty-remarks
router.get('/faculty-remarks', async (req, res) => {
  try {
    await ensureIntelligenceSupportTables();
    const role = String(req.user?.role || '').trim().toLowerCase();

    if (!['hod', 'iqac_dept'].includes(role)) {
      return res.status(403).json({ error: 'Only HOD / IQAC department coordinator can view faculty remarks.' });
    }

    const department = normalizeDept(req.user?.department || '');

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
    res.status(500).json({
      error: 'Failed to fetch faculty remarks',
      details: err.message
    });
  }
});

// POST /api/intelligence/department-remark
router.post('/department-remark', async (req, res) => {
  try {
    await ensureIntelligenceSupportTables();
    const role = String(req.user?.role || '').trim().toLowerCase();

    if (!['iqac', 'principal'].includes(role)) {
      return res.status(403).json({ error: 'Only IQAC Coordinator / Principal can send department remarks.' });
    }

    const department = normalizeDept(req.body?.department || '');
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
    res.status(500).json({
      error: 'Failed to save department remark',
      details: err.message
    });
  }
});

// GET /api/intelligence/department-remarks
router.get('/department-remarks', async (req, res) => {
  try {
    await ensureIntelligenceSupportTables();
    const role = String(req.user?.role || '').trim().toLowerCase();
    let department = normalizeDept(req.query.department || req.user?.department || '');

    let sql = `
      SELECT id, department, remark, remark_by, created_at
      FROM department_remarks
      WHERE 1=1
    `;
    const params = [];

    if (!['iqac', 'principal'].includes(role)) {
      if (!department || department === '—') {
        return res.status(400).json({ error: 'Department not found.' });
      }

      params.push(department);
      sql += ` AND department = $${params.length}`;
    } else if (department && department !== 'ALL') {
      params.push(department);
      sql += ` AND department = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch department remarks error:', err);
    res.status(500).json({
      error: 'Failed to fetch department remarks',
      details: err.message
    });
  }
});


function addMonths(date, months) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function inferAccreditationCycle(file) {
  const title = String(file.title || '').toLowerCase();
  const category = String(file.category || '').toUpperCase();

  if (category === 'NBA') {
    if (title.includes('certificate') || title.includes('accredit')) {
      return { months: 36, label: 'NBA accreditation validity / renewal cycle' };
    }
    if (title.includes('sar')) return { months: 12, label: 'NBA SAR annual update reminder' };
    return { months: 12, label: 'NBA document annual review' };
  }

  if (category === 'NAAC') {
    if (title.includes('aqar')) return { months: 12, label: 'NAAC AQAR yearly submission cycle' };
    if (title.includes('ssr') || title.includes('certificate')) return { months: 60, label: 'NAAC accreditation cycle review' };
    return { months: 12, label: 'NAAC document annual review' };
  }

  if (category === 'NIRF') return { months: 12, label: 'NIRF annual submission cycle' };

  return { months: 12, label: 'Accreditation document annual review' };
}

// GET /api/intelligence/accreditation-timeline
router.get('/accreditation-timeline', async (req, res) => {
  try {
    const role = String(req.user?.role || '').trim().toLowerCase();
    const userDept = normalizeDept(req.user?.department || '');

    if (!['iqac', 'principal', 'hod', 'iqac_dept'].includes(role)) {
      return res.status(403).json({ error: 'Only IQAC, Principal and HOD roles can view accreditation timeline.' });
    }

    const result = await db.query(`
      SELECT id, category, title, uploaded_by, uploaded_at
      FROM accreditation_files
      ORDER BY uploaded_at DESC, id DESC
    `);

    const rows = result.rows
      .filter(f => {
        if (['iqac', 'principal'].includes(role)) return true;
        const t = String(f.title || '').toUpperCase();
        // HOD sees common NAAC/NIRF plus files that mention their department.
        return !userDept || userDept === '—' || t.includes(userDept) || ['NAAC','NIRF'].includes(String(f.category || '').toUpperCase());
      })
      .map(f => {
        const cycle = inferAccreditationCycle(f);
        const uploaded = f.uploaded_at ? new Date(f.uploaded_at) : new Date();
        const due = addMonths(uploaded, cycle.months);
        const warning = due ? addMonths(due, -6) : null;
        const days = daysUntil(due);

        let status = 'OK';
        let priority = 'Normal';

        if (days !== null && days < 0) {
          status = 'Overdue';
          priority = 'Critical';
        } else if (days !== null && days <= 90) {
          status = 'Due within 3 months';
          priority = 'High';
        } else if (days !== null && days <= 180) {
          status = 'Due within 6 months';
          priority = 'Medium';
        }

        return {
          id: f.id,
          category: f.category,
          title: f.title,
          uploaded_by: f.uploaded_by,
          uploaded_at: f.uploaded_at,
          cycle_basis: cycle.label,
          reminder_start_date: warning ? warning.toISOString().slice(0, 10) : null,
          due_date: due ? due.toISOString().slice(0, 10) : null,
          days_remaining: days,
          status,
          priority,
          reminder_message:
            `${f.category} document "${f.title}" should be reviewed before ${due ? due.toISOString().slice(0, 10) : 'the due date'}. ` +
            `Prepare/update supporting files, department data, events, faculty details and compliance proof.`
        };
      });

    const summary = {
      total_documents: rows.length,
      overdue: rows.filter(r => r.status === 'Overdue').length,
      due_3_months: rows.filter(r => r.status === 'Due within 3 months').length,
      due_6_months: rows.filter(r => r.status === 'Due within 6 months').length,
      normal: rows.filter(r => r.status === 'OK').length
    };

    res.json({ summary, reminders: rows });
  } catch (err) {
    console.error('Accreditation timeline intelligence error:', err);
    res.status(500).json({
      error: 'Failed to generate accreditation timeline intelligence',
      details: err.message
    });
  }
});


module.exports = router;
