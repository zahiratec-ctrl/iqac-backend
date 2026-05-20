// backend/middleware/upload.js
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${uuidv4()}_${safe}${ext}`);
  }
});

const allowedTypes = /pdf|jpg|jpeg|png|doc|docx|xls|xlsx/;

const fileFilter = (req, file, cb) => {
  const ext  = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = file.mimetype;
  if (allowedTypes.test(ext)) return cb(null, true);
  cb(new Error(`File type .${ext} not allowed`));
};

const maxSize = (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024;

const upload = multer({ storage, fileFilter, limits: { fileSize: maxSize } });

module.exports = upload;
