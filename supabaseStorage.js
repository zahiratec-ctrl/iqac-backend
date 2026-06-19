// backend/utils/supabaseStorage.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'iqac-documents';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase Storage env variables missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function safeName(name = 'file') {
  return String(name)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 160);
}

function storagePath(folder, originalname) {
  const stamp = Date.now();
  const rand = Math.round(Math.random() * 1e9);
  return `${folder}/${stamp}-${rand}-${safeName(originalname)}`;
}

async function uploadBuffer(folder, file) {
  if (!file) return null;

  const path = storagePath(folder, file.originalname || file.filename || 'file');

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(path, file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: false
    });

  if (error) throw error;

  return {
    path,
    originalName: file.originalname || file.filename || 'file',
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.size || 0
  };
}

async function downloadToResponse(path, res, downloadName = 'download') {
  if (!path || path === '—') {
    return res.status(404).json({ error: 'Document not uploaded' });
  }

  const cleanPath = String(path).replace(/^\/+/, '');

  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .download(cleanPath);

  if (error || !data) {
    console.error('Supabase download error:', error);
    return res.status(404).json({ error: 'File not found in Supabase Storage' });
  }

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  res.setHeader('Content-Disposition', `attachment; filename="${safeName(downloadName)}"`);
  res.setHeader('Content-Type', data.type || 'application/octet-stream');
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
}

async function deleteFile(path) {
  if (!path || path === '—') return;

  const cleanPath = String(path).replace(/^\/+/, '');

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .remove([cleanPath]);

  if (error) console.warn('Supabase delete warning:', error.message);
}

module.exports = {
  supabase,
  SUPABASE_BUCKET,
  uploadBuffer,
  downloadToResponse,
  deleteFile
};
