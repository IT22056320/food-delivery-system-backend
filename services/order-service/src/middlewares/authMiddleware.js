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

// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${roles.join(', ')}` 
      });
    }
    next();
  };
};

// Convenience middleware for specific roles
const isAdmin = (req, res, next) => authorize('admin')(req, res, next);
const isRestaurantOwner = (req, res, next) => authorize('restaurant_owner')(req, res, next);
const isDeliveryPerson = (req, res, next) => authorize('delivery_person')(req, res, next);
const isCustomer = (req, res, next) => authorize('customer')(req, res, next);

module.exports = {
  protect,
  authorize,
  isAdmin,
  isRestaurantOwner,
  isDeliveryPerson,
  isCustomer,
};
