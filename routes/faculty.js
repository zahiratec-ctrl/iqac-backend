// backend/routes/faculty.js — Supabase Storage version
const express = require('express');
const upload = require('../middleware/upload');
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { uploadBuffer, downloadToResponse, deleteFile } = require('../utils/supabaseStorage');

const router = express.Router();

router.use((req, res, next) => {
  console.log('FACULTY ROUTER:', req.method, req.originalUrl);
  next();
});
router.use(authMiddleware);

function pg(sql, params = []) {
  let i = 0;
  return db.query(sql.replace(/\?/g, () => `$${++i}`), params);
}

const DOC_FIELDS = [
  { name: 'doc_appt', maxCount: 1 },
  { name: 'doc_pan', maxCount: 1 },
  { name: 'doc_aadhar', maxCount: 1 },
  { name: 'doc_resume', maxCount: 1 },
  { name: 'doc_exp_certs', maxCount: 10 }
];

async function uploadDoc(files, fieldName, folder = 'faculty') {
  if (!files?.[fieldName]?.[0]) return null;
  const stored = await uploadBuffer(folder, files[fieldName][0]);
  return stored.path;
}

router.get('/', async (req, res) => {
  console.log('FACULTY ROUTE HIT');
  console.log('USER =', req.user);
  try {
    if (!req.user) return res.status(401).json({ error: 'User not authenticated' });

    const role = String(req.user.role || '').toLowerCase();
    const department = req.user.department || '';

    let where = '';
    let params = [];

    if (role === 'faculty') {
      where = 'WHERE empid = ?';
      params = [req.user.empid];
    } else if (['hod','iqac_dept'].includes(role) && department && department !== '—') {
      where = 'WHERE department = ?';
      params = [department];
    }

    const result = await pg(`SELECT * FROM faculty ${where} ORDER BY name ASC`, params);
    res.json(result.rows);
  } catch (err) {
    console.error('FACULTY GET ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pg('SELECT * FROM faculty WHERE id = ?', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Faculty not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch faculty' });
  }
});

router.post('/',
  requireRole('faculty','hod','iqac','iqac_dept','principal'),
  upload.fields(DOC_FIELDS),
  async (req, res) => {
    try {
      const { name, department, empid, phone, designation,
              dob, doj, dor, emp_status, qualification, specialization,
              aadhar_no, pan_no, teaching_exp, research_exp, industry_exp } = req.body;

      if (!name || !department || !empid || !designation)
        return res.status(400).json({ error: 'name, department, empid and designation are required' });

      const exist = await pg('SELECT id FROM faculty WHERE empid = ?', [empid]);
      if (exist.rows.length)
        return res.status(409).json({ error: 'A faculty with this Employee ID already exists' });

      const files = req.files || {};
      const docAppt = await uploadDoc(files, 'doc_appt');
      const docPan = await uploadDoc(files, 'doc_pan');
      const docAadhar = await uploadDoc(files, 'doc_aadhar');
      const docResume = await uploadDoc(files, 'doc_resume');

      const expCerts = [];
      for (const f of (files.doc_exp_certs || [])) {
        const stored = await uploadBuffer('faculty', f);
        expCerts.push(stored.path);
      }

      const result = await pg(`
        INSERT INTO faculty
          (name, department, empid, phone, designation, dob, doj, dor, emp_status,
           qualification, specialization, aadhar_no, pan_no,
           teaching_exp, research_exp, industry_exp,
           doc_appt, doc_pan, doc_aadhar, doc_exp_certs, doc_resume, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        RETURNING id`,
        [name, department, empid, phone||'', designation,
         dob||null, doj||null, dor||null, emp_status||'serving',
         qualification||'', specialization||'', aadhar_no||'', pan_no||'',
         parseInt(teaching_exp)||0, parseInt(research_exp)||0, parseInt(industry_exp)||0,
         docAppt || '—', docPan || '—', docAadhar || '—', JSON.stringify(expCerts), docResume || '—',
         req.user.empid]
      );

      res.status(201).json({ id: result.rows[0].id, message: 'Faculty profile created' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create faculty profile' });
    }
  }
);

router.put('/:id',
  requireRole('faculty','hod','iqac','iqac_dept','principal'),
  upload.fields(DOC_FIELDS),
  async (req, res) => {
    try {
      const { name, department, empid, phone, designation,
              dob, doj, dor, emp_status, qualification, specialization,
              aadhar_no, pan_no, teaching_exp, research_exp, industry_exp } = req.body;

      if (!name || !department || !empid || !designation)
        return res.status(400).json({ error: 'name, department, empid and designation are required' });

      const conflict = await pg('SELECT id FROM faculty WHERE empid = ? AND id != ?', [empid, req.params.id]);
      if (conflict.rows.length)
        return res.status(409).json({ error: 'Another faculty already has this Employee ID' });

      const oldRes = await pg('SELECT * FROM faculty WHERE id = ?', [req.params.id]);
      if (!oldRes.rows.length) return res.status(404).json({ error: 'Faculty not found' });
      const old = oldRes.rows[0];

      const files = req.files || {};
      const docAppt = await uploadDoc(files, 'doc_appt');
      const docPan = await uploadDoc(files, 'doc_pan');
      const docAadhar = await uploadDoc(files, 'doc_aadhar');
      const docResume = await uploadDoc(files, 'doc_resume');

      if (docAppt) await deleteFile(old.doc_appt);
      if (docPan) await deleteFile(old.doc_pan);
      if (docAadhar) await deleteFile(old.doc_aadhar);
      if (docResume) await deleteFile(old.doc_resume);

      let docSql = '';
      const docParams = [];
      if (docAppt) { docSql += ', doc_appt=?'; docParams.push(docAppt); }
      if (docPan) { docSql += ', doc_pan=?'; docParams.push(docPan); }
      if (docAadhar) { docSql += ', doc_aadhar=?'; docParams.push(docAadhar); }
      if (docResume) { docSql += ', doc_resume=?'; docParams.push(docResume); }

      await pg(`
        UPDATE faculty SET
          name=?, department=?, empid=?, phone=?, designation=?,
          dob=?, doj=?, dor=?, emp_status=?,
          qualification=?, specialization=?, aadhar_no=?, pan_no=?,
          teaching_exp=?, research_exp=?, industry_exp=?
          ${docSql}
        WHERE id=?`,
        [name, department, empid, phone||'', designation,
         dob||null, doj||null, dor||null, emp_status||'serving',
         qualification||'', specialization||'', aadhar_no||'', pan_no||'',
         parseInt(teaching_exp)||0, parseInt(research_exp)||0, parseInt(industry_exp)||0,
         ...docParams, req.params.id]
      );

      res.json({ message: 'Faculty profile updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update faculty profile' });
    }
  }
);

router.delete('/:id',
  requireRole('faculty','hod','iqac','iqac_dept','principal'),
  async (req, res) => {
    try {
      const result = await pg('SELECT * FROM faculty WHERE id = ?', [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Faculty not found' });

      const fac = result.rows[0];
      const loggedEmpid = String(req.user.empid || req.user.employee_id || req.user.id || '').trim();

      if (req.user.role === 'faculty' &&
          String(fac.empid||'').trim() !== loggedEmpid &&
          String(fac.created_by||'').trim() !== loggedEmpid) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      await deleteFile(fac.doc_appt);
      await deleteFile(fac.doc_pan);
      await deleteFile(fac.doc_aadhar);
      await deleteFile(fac.doc_resume);

      let expCerts = [];
      try { expCerts = JSON.parse(fac.doc_exp_certs || '[]'); if (!Array.isArray(expCerts)) expCerts = []; }
      catch(e) { expCerts = []; }
      for (const p of expCerts) await deleteFile(p);

      await pg('DELETE FROM faculty WHERE id = ?', [req.params.id]);
      res.json({ message: 'Faculty profile deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete faculty profile' });
    }
  }
);

router.get('/:id/docs/:docType',
  requireRole('faculty','hod','iqac','iqac_dept','principal'),
  async (req, res) => {
    try {
      const result = await pg('SELECT * FROM faculty WHERE id = ?', [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Faculty not found' });

      const fac = result.rows[0];
      if (req.user.role === 'faculty' && fac.empid !== req.user.empid)
        return res.status(403).json({ error: 'Insufficient permissions' });

      const validTypes = { doc_appt:1, doc_pan:1, doc_aadhar:1, doc_resume:1 };
      if (!validTypes[req.params.docType])
        return res.status(400).json({ error: 'Invalid document type' });

      const filename = fac[req.params.docType];
      return downloadToResponse(filename, res, `${fac.empid || 'faculty'}-${req.params.docType}`);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to download document' });
    }
  }
);

router.delete('/:id/docs/:docType',
  requireRole('faculty','hod','iqac','iqac_dept','principal'),
  async (req, res) => {
    try {
      const { id, docType } = req.params;
      const validTypes = { doc_appt:1, doc_pan:1, doc_aadhar:1, doc_resume:1 };
      if (!validTypes[docType]) return res.status(400).json({ error: 'Invalid document type' });

      const result = await pg('SELECT * FROM faculty WHERE id = ?', [id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Faculty not found' });

      const fac = result.rows[0];
      if (req.user.role === 'faculty' &&
          String(fac.empid||'').trim() !== String(req.user.empid||'').trim() &&
          String(fac.created_by||'').trim() !== String(req.user.empid||'').trim())
        return res.status(403).json({ error: 'Insufficient permissions' });

      const filename = fac[docType];
      await deleteFile(filename);

      await pg(`UPDATE faculty SET ${docType} = '—' WHERE id = ?`, [id]);
      res.json({ message: 'Document deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
);

module.exports = router;
