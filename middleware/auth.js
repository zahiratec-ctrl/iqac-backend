// backend/middleware/auth.js 

const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  console.log(
    'AUTH MIDDLEWARE:',
    req.method,
    req.originalUrl
  );

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS BYPASSED');
    return next();
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
    return res.status(401).json({
      error: 'Invalid or expired token'
    });
  }
} // <--- Added missing closing brace for authMiddleware function

// Added helper function to prevent exports reference crash
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole
};
