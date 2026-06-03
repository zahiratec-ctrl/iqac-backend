// backend/middleware/auth.js

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  console.log('AUTH MIDDLEWARE:', req.method, req.originalUrl);

  // ✅ OPTIONS preflight – respond immediately, do NOT call next()
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS BYPASSED – sending 204');
    return res.sendStatus(204);
  }

  console.log('AUTH HEADER =', req.headers['authorization']);
  const header = req.headers['authorization'];

  if (!header) {
    console.log('NO TOKEN');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : header;

  try {
    console.log('TOKEN RECEIVED =', token.substring(0, 20));
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    console.log('JWT VERIFIED =', req.user);
    next();
  } catch (err) {
    console.log('JWT ERROR =', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Role-based access control middleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = String(req.user.role || '').toLowerCase();
    if (allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
    });
  };
}

module.exports = {
  authMiddleware,
  requireRole
};