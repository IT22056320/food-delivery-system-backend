const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  isAdmin: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  otp: String,
  otpExpires: Date,
  resetOtp: String,
resetOtpExpires: Date,
isResetVerified: { type: Boolean, default: false }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);