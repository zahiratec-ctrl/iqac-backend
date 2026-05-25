// backend/routes/faculty.js
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const upload  = require('../middleware/upload');
const db      = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const DOC_FIELDS = [
  { name: 'doc_appt',   maxCount: 1 },
  { name: 'doc_pan',    maxCount: 1 },
  { name: 'doc_aadhar', maxCount: 1 },
  { name: 'doc_resume', maxCount: 1 },
  { name: 'doc_exp_certs', maxCount: 10 }
];

// ── GET /api/faculty ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { role, department } = req.user;
    let where = '', params = [];
    if (['hod','iqac','iqac_dept'].includes(role) && department && department !== '—') {
      where = 'WHERE department = ?'; params = [department];
    }
    const [rows] = await db.query(
      `SELECT * FROM faculty ${where} ORDER BY name ASC`, params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch faculty' });
  }
});

// ── GET /api/faculty/:id ─────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM faculty WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Faculty not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch faculty' });
  }
});

// ── POST /api/faculty ─────────────────────────────────────
router.post('/',
  requireRole('faculty','hod','iqac','iqac_dept','principal'),
  upload.fields(DOC_FIELDS),
  async (req, res) => {
    try {
      const {
        name, department, empid, phone, designation,
        dob, doj, dor, emp_status, qualification, specialization,
        aadhar_no, pan_no, teaching_exp, research_exp, industry_exp
      } = req.body;

      if (!name || !department || !empid || !designation)
        return res.status(400).json({ error: 'name, department, empid and designation are required' });

      const [exist] = await db.query('SELECT id FROM faculty WHERE empid = ?', [empid]);
      if (exist.length)
        return res.status(409).json({ error: 'A faculty with this Employee ID already exists' });

      const files = req.files || {};
      const docAppt    = files.doc_appt?.[0]?.filename    || '—';
      const docPan     = files.doc_pan?.[0]?.filename     || '—';
      const docAadhar  = files.doc_aadhar?.[0]?.filename  || '—';
      const docResume  = files.doc_resume?.[0]?.filename  || '—';
      const expCerts   = (files.doc_exp_certs || []).map(f => f.filename);

      const [result] = await db.query(`
        INSERT INTO faculty
          (name, department, empid, phone, designation, dob, doj, dor, emp_status,
           qualification, specialization, aadhar_no, pan_no,
           teaching_exp, research_exp, industry_exp,
           doc_appt, doc_pan, doc_aadhar, doc_exp_certs, doc_resume, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [name, department, empid, phone||'', designation,
         dob||null, doj||null, dor||null, emp_status||'serving',
         qualification||'', specialization||'', aadhar_no||'', pan_no||'',
         parseInt(teaching_exp)||0, parseInt(research_exp)||0, parseInt(industry_exp)||0,
         docAppt, docPan, docAadhar, JSON.stringify(expCerts), docResume,
         req.user.empid]
      );
      res.status(201).json({ id: result.insertId, message: 'Faculty profile created' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create faculty profile' });
    }
  }
);

// ── PUT /api/faculty/:id ──────────────────────────────────
router.put('/:id',
  requireRole('hod','iqac','iqac_dept','principal'),
  async (req, res) => {
    try {
      const {
        name, department, empid, phone, designation,
        dob, doj, dor, emp_status, qualification, specialization,
        aadhar_no, pan_no, teaching_exp, research_exp, industry_exp
      } = req.body;

      if (!name || !department || !empid || !designation)
        return res.status(400).json({ error: 'name, department, empid and designation are required' });

      // Check empid conflict with other records
      const [conflict] = await db.query(
        'SELECT id FROM faculty WHERE empid = ? AND id != ?', [empid, req.params.id]
      );
      if (conflict.length)
        return res.status(409).json({ error: 'Another faculty already has this Employee ID' });

      await db.query(`
        UPDATE faculty SET
          name=?, department=?, empid=?, phone=?, designation=?,
          dob=?, doj=?, dor=?, emp_status=?,
          qualification=?, specialization=?, aadhar_no=?, pan_no=?,
          teaching_exp=?, research_exp=?, industry_exp=?
        WHERE id=?`,
        [name, department, empid, phone||'', designation,
         dob||null, doj||null, dor||null, emp_status||'serving',
         qualification||'', specialization||'', aadhar_no||'', pan_no||'',
         parseInt(teaching_exp)||0, parseInt(research_exp)||0, parseInt(industry_exp)||0,
         req.params.id]
      );
      res.json({ message: 'Faculty profile updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update faculty profile' });
    }
  }
);

// ── DELETE /api/faculty/:id ───────────────────────────────
router.delete('/:id',
  requireRole('faculty','hod','iqac','iqac_dept','principal'),
  async (req, res) => {
    try {
      const [rows] = await db.query('SELECT * FROM faculty WHERE id = ?', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Faculty not found' });

      // Clean up uploaded files
      const fac  = rows[0];
      if (req.user.role === 'faculty' && String(fac.empid) !== String(req.user.empid)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
      }
      const base = process.env.UPLOAD_DIR || './uploads';
      const filesToDelete = [fac.doc_appt, fac.doc_pan, fac.doc_aadhar, fac.doc_resume,
        ...(JSON.parse(fac.doc_exp_certs || '[]'))].filter(f => f && f !== '—');
      filesToDelete.forEach(f => {
        const fp = path.join(base, f);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      });

      await db.query('DELETE FROM faculty WHERE id = ?', [req.params.id]);
      res.json({ message: 'Faculty profile deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete faculty profile' });
    }
  }
);

// ── GET /api/faculty/:id/docs/:docType ────────────────────
// Download a specific document (HOD/IQAC/iqac_dept/principal only)
router.get('/:id/docs/:docType',
     requireRole('faculty','hod','iqac','iqac_dept','principal'),
  async (req, res) => {
    try {
      const [rows] = await db.query('SELECT * FROM faculty WHERE id = ?', [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'Faculty not found' });

      const fac = rows[0];
      if (req.user.role === 'faculty' && fac.empid !== req.user.empid) {
     return res.status(403).json({ error: 'Insufficient permissions' });
       }
      const validTypes = { doc_appt:1, doc_pan:1, doc_aadhar:1, doc_resume:1 };
      if (!validTypes[req.params.docType])
        return res.status(400).json({ error: 'Invalid document type' });

      const filename = fac[req.params.docType];
      if (!filename || filename === '—')
        return res.status(404).json({ error: 'Document not uploaded' });

      const filePath = path.join(process.env.UPLOAD_DIR || './uploads', filename);
      if (!fs.existsSync(filePath))
        return res.status(404).json({ error: 'File not found on server' });

      res.download(filePath, filename);
    } catch (err) {
      res.status(500).json({ error: 'Failed to download document' });
    }
  }
);
// ── DELETE /api/faculty/:id/docs/:docType ─────────────────
router.delete('/:id/docs/:docType',
  requireRole('faculty','hod','iqac','iqac_dept','principal'),
  async (req, res) => {
    try {
      const { id, docType } = req.params;

      const validTypes = {
        doc_appt: 1,
        doc_pan: 1,
        doc_aadhar: 1,
        doc_resume: 1
      };

      if (!validTypes[docType]) {
        return res.status(400).json({ error: 'Invalid document type' });
      }

      const [rows] = await db.query('SELECT * FROM faculty WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Faculty not found' });

      const fac = rows[0];

      if (req.user.role === 'faculty' && fac.empid !== req.user.empid) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const filename = fac[docType];

      if (filename && filename !== '—') {
        const filePath = path.join(process.env.UPLOAD_DIR || './uploads', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      await db.query(`UPDATE faculty SET ${docType} = '—' WHERE id = ?`, [id]);

      res.json({ message: 'Document deleted successfully' });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
);
module.exports = router;
