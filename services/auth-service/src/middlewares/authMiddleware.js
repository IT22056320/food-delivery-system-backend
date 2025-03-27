const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/jwt');

// Protect route middleware
const protect = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Forbidden' });
  }
};

// Admin-only route middleware
const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access only' });
  }
  next();
};

module.exports = {
  protect,
  isAdmin
};
