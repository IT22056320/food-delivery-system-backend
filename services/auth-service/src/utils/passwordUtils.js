const bcrypt = require('bcryptjs');

exports.hashPassword = async (password) => await bcrypt.hash(password, 10);
exports.comparePasswords = async (pass, hash) => await bcrypt.compare(pass, hash);