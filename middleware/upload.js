// backend/middleware/upload.js
// Supabase Storage version: keep files in memory, route uploads them to Supabase.
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

module.exports = upload;
