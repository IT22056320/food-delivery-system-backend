const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/jwt');

exports.generateToken = (user) => jwt.sign({ id: user._id, isAdmin: user.isAdmin }, jwtSecret, { expiresIn: jwtExpiresIn });