const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ['user', 'admin', 'restaurant_owner', 'delivery_person'],
    default: 'user'
  },
  isVerified: { type: Boolean, default: false },
  otp: String,
  otpExpires: Date,
  resetOtp: String,
  resetOtpExpires: Date,
  isResetVerified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);