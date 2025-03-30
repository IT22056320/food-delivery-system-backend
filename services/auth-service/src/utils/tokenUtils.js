const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/jwt');

exports.generateToken = (user) => jwt.sign(
  { 
    id: user._id, 
    role: user.role 
  }, 
  jwtSecret, 
  { expiresIn: jwtExpiresIn }
);
