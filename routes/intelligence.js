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

    // Annual approved intake for core UG departments.
    // Edit these values whenever AICTE/affiliating-university approved intake changes.
    const PROGRAM_INTAKE = {
      CSE: 360,
      ISE: 120,
      ECE: 180,
      AIML: 120,
      ME: 60,
      Humanities: 0,
      Physics: 0,
      Chemistry: 0,
      Maths: 0,
      IQAC: 0
    };

    const CORE_DEPARTMENTS = ['CSE', 'ISE', 'ECE', 'AIML', 'ME'];
    const BASIC_SCIENCE_DEPARTMENTS = ['Maths', 'Physics', 'Chemistry', 'Humanities'];

    // NBA/AICTE SFR target used for dashboard gap.
    // 20 is stricter and suitable for better NBA readiness.
    // 25 is also calculated and returned as a reference for NBA 3-year readiness.
    const NBA_SFR_TARGET = 20;
    const NBA_SFR_THREE_YEAR = 25;
    const CORE_PROGRAM_DURATION_YEARS = 4;

    // Basic Science / Humanities faculty requirement is based on total institutional first-year intake,
    // because these departments normally serve all first-year programmes rather than one branch intake.
    const BASIC_SCIENCE_NORMS = {
      Maths: { ratio: 160, prof: 1, assoc: 1, phd_percent: 30 },
      Physics: { ratio: 240, prof: 1, assoc: 1, phd_percent: 30 },
      Chemistry: { ratio: 240, prof: 1, assoc: 1, phd_percent: 30 },
      Humanities: { ratio: 240, prof: 1, assoc: 1, phd_percent: 30 }
    };

    function safeNum(v) { return Number(v || 0); }

    function totalInstitutionFirstYearIntake() {
      return CORE_DEPARTMENTS.reduce((sum, dept) => sum + safeNum(PROGRAM_INTAKE[dept]), 0);
    }

    function requiredNormFor(dept) {
      const department = String(dept || '').trim();
      const annualIntake = safeNum(PROGRAM_INTAKE[department]);
      const totalFirstYearIntake = totalInstitutionFirstYearIntake();

      if (CORE_DEPARTMENTS.includes(department)) {
        const totalConsideredStrength = annualIntake * CORE_PROGRAM_DURATION_YEARS;

        return {
          annual_intake: annualIntake,
          considered_student_strength: totalConsideredStrength,
          faculty: Math.ceil(totalConsideredStrength / NBA_SFR_TARGET),
          faculty_nba_20: Math.ceil(totalConsideredStrength / 20),
          faculty_nba_25: Math.ceil(totalConsideredStrength / NBA_SFR_THREE_YEAR),
          fsr_target: NBA_SFR_TARGET,
          prof: Math.max(1, Math.ceil(Math.ceil(totalConsideredStrength / NBA_SFR_TARGET) * 0.10)),
          assoc: Math.max(1, Math.ceil(Math.ceil(totalConsideredStrength / NBA_SFR_TARGET) * 0.20)),
          phd_percent: 30,
          norm_basis: `Core UG department: approved annual intake × ${CORE_PROGRAM_DURATION_YEARS} years ÷ ${NBA_SFR_TARGET}:1 SFR`
        };
      }

      if (BASIC_SCIENCE_DEPARTMENTS.includes(department)) {
        const basic = BASIC_SCIENCE_NORMS[department];
        return {
          annual_intake: 0,
          considered_student_strength: totalFirstYearIntake,
          faculty: Math.ceil(totalFirstYearIntake / basic.ratio),
          faculty_nba_20: Math.ceil(totalFirstYearIntake / basic.ratio),
          faculty_nba_25: Math.ceil(totalFirstYearIntake / basic.ratio),
          fsr_target: basic.ratio,
          prof: basic.prof,
          assoc: basic.assoc,
          phd_percent: basic.phd_percent,
          norm_basis: `Basic Science/Humanities: total institutional first-year intake ÷ ${basic.ratio}`
        };
      }

      return {
        annual_intake: annualIntake,
        considered_student_strength: annualIntake,
        faculty: 0,
        faculty_nba_20: 0,
        faculty_nba_25: 0,
        fsr_target: NBA_SFR_TARGET,
        prof: 0,
        assoc: 0,
        phd_percent: 30,
        norm_basis: 'No intake norm configured for this department'
      };
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


    function getEventTargetMatrix(row) {
      const facultyTarget = Math.max(1, safeNum(row.total_faculty));
      return [
        {
          key: 'vac',
          label: 'Value Added Course / Certificate Course',
          existing: safeNum(row.vac_count),
          target: CORE_DEPARTMENTS.includes(row.department) ? 2 : 0,
          nba: ['NBA C1.2.4 Content beyond syllabus', 'NBA C2.1 Teaching-Learning enrichment'],
          naac: ['NAAC 1.3 Curriculum Enrichment', 'NAAC 2.3 Teaching-Learning Process'],
          suggestion: 'Organise value added/certificate courses aligned with emerging technologies and curriculum gaps.'
        },
        {
          key: 'fdp',
          label: 'FDP / Workshop Organised',
          existing: safeNum(row.fdp_count),
          target: 2,
          nba: ['NBA C5 Faculty Information', 'NBA C6 Faculty Contributions'],
          naac: ['NAAC 6.3 Faculty Empowerment Strategies'],
          suggestion: 'Organise FDP/workshop on OBE, assessment, research methodology, AI tools, patents or emerging areas.'
        },
        {
          key: 'guest',
          label: 'Guest Lecture / Expert Talk',
          existing: safeNum(row.guest_count),
          target: 3,
          nba: ['NBA C2.8 Industry Institute Partnership', 'NBA C4.7 Professional Activities'],
          naac: ['NAAC 2.3 Teaching-Learning Process', 'NAAC 3.5 Collaboration'],
          suggestion: 'Conduct industry expert lectures with attendance, photos, feedback and outcome mapping.'
        },
        {
          key: 'hackathon',
          label: 'Hackathon / Ideathon / Coding Challenge',
          existing: safeNum(row.hackathon_count),
          target: CORE_DEPARTMENTS.includes(row.department) ? 1 : 0,
          nba: ['NBA C2.7 Complex Engineering Problems & SDGs', 'NBA C4.7.2 Student Participation in Professional Events'],
          naac: ['NAAC 3.4 Extension/Innovation Activities', 'NAAC 5.3 Student Participation'],
          suggestion: 'Plan hackathon/ideathon/project challenge connected to SDGs, innovation and complex engineering problems.'
        },
        {
          key: 'project',
          label: 'Project Expo / Capstone Showcase',
          existing: safeNum(row.project_count),
          target: CORE_DEPARTMENTS.includes(row.department) ? 1 : 0,
          nba: ['NBA C2.2 Quality of Capstone/Major Project', 'NBA C2.7 Complex Engineering Problems'],
          naac: ['NAAC 2.3 Experiential Learning', 'NAAC 3.4 Research/Innovation'],
          suggestion: 'Organise project expo, mini-project exhibition or capstone demonstration with rubrics and evaluation sheets.'
        },
        {
          key: 'symposium',
          label: 'Symposium / Professional Body Activity',
          existing: safeNum(row.symposium_count),
          target: 1,
          nba: ['NBA C4.7 Professional Activities', 'NBA C4.7.1 Professional Bodies/Chapters/Clubs'],
          naac: ['NAAC 5.3 Student Participation', 'NAAC 3.4 Research/Academic Activities'],
          suggestion: 'Conduct professional society event, technical symposium, quiz or student chapter activity.'
        },
        {
          key: 'faculty_fdp_workshop',
          label: 'Faculty FDP/Workshop Attended',
          existing: safeNum(row.faculty_fdp_workshop_count),
          target: facultyTarget,
          nba: ['NBA C6 Faculty Contributions'],
          naac: ['NAAC 6.3 Faculty Empowerment Strategies'],
          suggestion: 'Ensure each faculty attends at least one FDP/workshop and uploads certificate/proof.'
        },
        {
          key: 'conference',
          label: 'Conference / Seminar Attended',
          existing: safeNum(row.conference_count) + safeNum(row.seminar_count),
          target: Math.ceil(facultyTarget * 0.5),
          nba: ['NBA C6 Faculty Contributions', 'NBA C4.7 Professional Activities'],
          naac: ['NAAC 3.4 Research Publications/Awards', 'NAAC 6.3 Faculty Development'],
          suggestion: 'Encourage faculty participation in conferences/seminars and upload certificates/papers.'
        },
        {
          key: 'industry',
          label: 'Industry Interaction / Visit / Training Attended',
          existing: safeNum(row.industry_count),
          target: CORE_DEPARTMENTS.includes(row.department) ? 1 : 0,
          nba: ['NBA C2.8 Industry Institute Partnership'],
          naac: ['NAAC 3.5 Collaboration', 'NAAC 2.3 Experiential Learning'],
          suggestion: 'Arrange industry visit, internship interaction, MoU activity or industry training proof.'
        }
      ];
    }

    function buildEventGapAnalysis(row) {
      return getEventTargetMatrix(row).map(item => ({
        ...item,
        gap: Math.max(0, safeNum(item.target) - safeNum(item.existing)),
        status: safeNum(item.target) === 0
          ? 'Not Applicable'
          : safeNum(item.existing) >= safeNum(item.target)
            ? 'Adequate'
            : 'Gap'
      }));
    }

    function buildEventsToOrganize(row) {
      return buildEventGapAnalysis(row)
        .filter(item => item.gap > 0)
        .sort((a, b) => b.gap - a.gap)
        .map(item => ({
          event: item.label,
          gap: item.gap,
          why: `Improves ${[...item.nba, ...item.naac].join('; ')}`,
          suggested_action: item.suggestion
        }));
    }

    function buildRecommendations(row) {
      const rec = [];
      const norms = requiredNormFor(row.department);

      if (row.total_faculty === 0) {
        rec.push('Faculty data is not available. Update faculty profiles for NBA Criterion 5 and NAAC 2.4/6.3 evidence.');
      }

      if (row.faculty_shortfall > 0) {
        rec.push(`Faculty shortfall is ${row.faculty_shortfall}. Required faculty is ${row.required_faculty} based on ${norms.norm_basis}.`);
      }

      if (row.prof_shortfall > 0) {
        rec.push(`Professor cadre shortfall is ${row.prof_shortfall}. Strengthen senior cadre evidence for NBA Criterion 5.`);
      }

      if (row.assoc_shortfall > 0) {
        rec.push(`Associate Professor cadre shortfall is ${row.assoc_shortfall}. Improve cadre balance for department academic leadership.`);
      }

      if (row.phd_gap > 0) {
        rec.push(`Ph.D faculty percentage gap is ${row.phd_gap}%. Encourage faculty qualification enhancement for NBA Criterion 5 and NAAC 2.4.`);
      }

      const eventGaps = buildEventGapAnalysis(row).filter(g => g.gap > 0);

      eventGaps.slice(0, 6).forEach(g => {
        rec.push(`${g.label} gap: ${g.gap}. ${g.suggestion}`);
      });

      if (row.attended_count < row.total_faculty && row.total_faculty > 0) {
        rec.push('Faculty participation is low. Ensure each faculty uploads at least one FDP/workshop/conference/industry interaction proof.');
      }

      if (row.missing_docs > 0) {
        rec.push(`${row.missing_docs} faculty profile(s) have missing documents. Complete appointment order, PAN, Aadhar and resume uploads.`);
      }

      if (!rec.length) {
        rec.push('Department shows good evidence coverage. Continue uploading brochures, reports, photos and certificates for audit readiness.');
      }

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
      const norms = requiredNormFor(dept);

      const facRes = await pg(`
        SELECT
          COUNT(*) AS total_faculty,
          SUM(CASE WHEN designation='Professor' THEN 1 ELSE 0 END) AS prof_count,
          SUM(CASE WHEN designation='Associate Professor' THEN 1 ELSE 0 END) AS assoc_count,
          SUM(CASE WHEN designation='Assistant Professor' THEN 1 ELSE 0 END) AS asst_count,
          SUM(CASE WHEN qualification IN ('Ph.D','PhD','Ph.D.') OR qualification ILIKE '%ph.d%' OR qualification ILIKE '%phd%' THEN 1 ELSE 0 END) AS phd_count,
          AVG(teaching_exp) AS avg_teaching_exp,
          SUM(CASE WHEN doc_appt IN ('—','') OR doc_appt IS NULL
                     OR doc_pan IN ('—','') OR doc_pan IS NULL
                     OR doc_aadhar IN ('—','') OR doc_aadhar IS NULL
                     OR doc_resume IN ('—','') OR doc_resume IS NULL
                   THEN 1 ELSE 0 END) AS missing_docs
        FROM faculty WHERE department = ?`, [dept]);
      const fac = facRes.rows[0] || {};

      const evRes = await pg(`
        SELECT
          COUNT(*) AS total_events,
          SUM(CASE WHEN type ILIKE '%vac%' OR type ILIKE '%value%' OR type ILIKE '%certificate%' THEN 1 ELSE 0 END) AS vac_count,
          SUM(CASE WHEN type ILIKE '%fdp%' OR type ILIKE '%workshop%' THEN 1 ELSE 0 END) AS fdp_count,
          SUM(CASE WHEN type ILIKE '%guest%' OR type ILIKE '%expert%' THEN 1 ELSE 0 END) AS guest_count,
          SUM(CASE WHEN type ILIKE '%hackathon%' OR type ILIKE '%ideathon%' THEN 1 ELSE 0 END) AS hackathon_count,
          SUM(CASE WHEN type ILIKE '%project%' OR type ILIKE '%expo%' OR type ILIKE '%capstone%' THEN 1 ELSE 0 END) AS project_count,
          SUM(CASE WHEN type ILIKE '%symposium%' OR type ILIKE '%professional%' OR type ILIKE '%chapter%' THEN 1 ELSE 0 END) AS symposium_count
        FROM events WHERE department = ?`, [dept]);
      const events = evRes.rows[0] || {};

      const attRes = await pg(`
        SELECT
          COUNT(*) AS attended_count,
          SUM(CASE WHEN event_type ILIKE '%fdp%' OR event_type ILIKE '%workshop%' THEN 1 ELSE 0 END) AS faculty_fdp_workshop_count,
          SUM(CASE WHEN event_type ILIKE '%conference%' THEN 1 ELSE 0 END) AS conference_count,
          SUM(CASE WHEN event_type ILIKE '%seminar%' THEN 1 ELSE 0 END) AS seminar_count,
          SUM(CASE WHEN event_type ILIKE '%industry%' OR event_type ILIKE '%visit%' OR event_type ILIKE '%training%' THEN 1 ELSE 0 END) AS industry_count
        FROM events_attended WHERE department = ?`, [dept]);
      const att = attRes.rows[0] || {};

      const eventDetailsRes = await pg(`
        SELECT name AS title, type, event_date, status, 'Organised' AS source
        FROM events
        WHERE department = ?
        UNION ALL
        SELECT event_name AS title, event_type AS type, event_date, status, 'Attended' AS source
        FROM events_attended
        WHERE department = ?
        ORDER BY event_date DESC NULLS LAST
        LIMIT 100
      `, [dept, dept]);

      const totalFaculty = safeNum(fac.total_faculty);
      const phdCount = safeNum(fac.phd_count);
      const annualIntake = safeNum(norms.annual_intake);
      const consideredStrength = safeNum(norms.considered_student_strength);

      const row = {
        department: dept,
        intake: annualIntake,
        annual_approved_intake: annualIntake,
        considered_student_strength: consideredStrength,
        norm_basis: norms.norm_basis,
        fsr_target: norms.fsr_target,
        fsr: getFSR(consideredStrength || annualIntake, totalFaculty),

        total_faculty: totalFaculty,
        required_faculty: norms.faculty,
        required_faculty_nba_20: norms.faculty_nba_20,
        required_faculty_nba_25: norms.faculty_nba_25,
        faculty_shortfall: positiveGap(norms.faculty, totalFaculty),

        prof_count: safeNum(fac.prof_count),
        required_prof_count: norms.prof,
        prof_shortfall: positiveGap(norms.prof, safeNum(fac.prof_count)),

        assoc_count: safeNum(fac.assoc_count),
        required_assoc_count: norms.assoc,
        assoc_shortfall: positiveGap(norms.assoc, safeNum(fac.assoc_count)),

        asst_count: safeNum(fac.asst_count),
        phd_count: phdCount,
        phd_percent: totalFaculty ? Math.round((phdCount / totalFaculty) * 100) : 0,
        required_phd_percent: norms.phd_percent,
        phd_gap: positiveGap(norms.phd_percent, totalFaculty ? Math.round((phdCount / totalFaculty) * 100) : 0),

        avg_teaching_exp: Math.round(safeNum(fac.avg_teaching_exp)),
        missing_docs: safeNum(fac.missing_docs),

        total_events: safeNum(events.total_events),
        events_organized_count: safeNum(events.total_events),
        vac_count: safeNum(events.vac_count),
        fdp_count: safeNum(events.fdp_count),
        guest_count: safeNum(events.guest_count),
        hackathon_count: safeNum(events.hackathon_count),
        project_count: safeNum(events.project_count),
        symposium_count: safeNum(events.symposium_count),

        attended_count: safeNum(att.attended_count),
        events_attended_count: safeNum(att.attended_count),
        faculty_fdp_workshop_count: safeNum(att.faculty_fdp_workshop_count),
        conference_count: safeNum(att.conference_count),
        seminar_count: safeNum(att.seminar_count),
        industry_count: safeNum(att.industry_count)
      };

      row.event_mapping_table = eventDetailsRes.rows.map(item => ({
        title: item.title,
        type: item.type,
        date: item.event_date,
        status: item.status,
        source: item.source,
        nba: getNbaMappingByEventType(item.type),
        naac: getNaacMappingByEventType(item.type)
      }));

      row.criterion_coverage = buildCriterionCoverage(row);
      row.event_gap_analysis = buildEventGapAnalysis(row);
      row.events_to_organize = buildEventsToOrganize(row);
      row.recommendations = buildRecommendations(row);

      row.strengths = [];
      row.weaknesses = [];

      if (row.faculty_shortfall === 0 && row.total_faculty > 0) row.strengths.push('Faculty strength meets the configured NBA/AICTE requirement.');
      else row.weaknesses.push(`Faculty shortfall: ${row.faculty_shortfall} against required ${row.required_faculty}.`);

      if (row.phd_percent >= row.required_phd_percent) row.strengths.push('Ph.D faculty percentage meets the configured target.');
      else row.weaknesses.push(`Ph.D qualification gap: ${row.phd_gap}%.`);

      if (row.event_gap_analysis.some(g => g.status === 'Adequate')) row.strengths.push('Some organised/attended event evidence is mapped to NBA/NAAC criteria.');
      if (row.event_gap_analysis.some(g => g.gap > 0)) row.weaknesses.push('Event evidence gaps exist. Refer events_to_organize for maximum scoring opportunities.');

      if (row.missing_docs > 0) row.weaknesses.push(`${row.missing_docs} faculty profile(s) have missing documents.`);

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
