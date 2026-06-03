// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  console.log('AUTH MIDDLEWARE:', req.method, req.originalUrl);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  const header = req.headers['authorization'];
  if (!header) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userRole = String(req.user.role || '').toLowerCase();
    if (allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
      return next();
    }
    return res.status(403).json({ error: 'Access denied' });
  };
}

module.exports = {
  authMiddleware,
  requireRole
};
