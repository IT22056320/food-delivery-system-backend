const User = require('../models/User');
const { hashPassword, comparePasswords } = require('../utils/passwordUtils');
const { generateToken } = require('../utils/tokenUtils');
const { sendOtpEmail, sendConfirmationEmail } = require('../services/emailService');
const crypto = require('crypto');

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashedPassword = await hashPassword(password);
  const otp = crypto.randomInt(100000, 999999).toString();

  const user = await User.create({ 
    name, 
    email, 
    password: hashedPassword, 
    role: role || 'user', 
    otp, 
    otpExpires: Date.now() + 300000 
  });
  await sendOtpEmail(email, otp);
  res.status(201).json({ message: 'OTP sent to email', userId: user._id });
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  user.isVerified = true;
  user.otp = null;
  await user.save();
  await sendConfirmationEmail(user.email);

  res.json({ message: 'User verified successfully' });
};


exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !user.isVerified || !(await comparePasswords(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials or user not verified' });
  }

  const token = generateToken(user);
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  const { _id, name, role, email: userEmail } = user;

  res.status(200).json({
    message: 'Login successful',
    user: {
      _id,
      name,
      email: userEmail,
      role
    }
  });
};

// 1. Request password reset
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(404).json({ error: 'User not found' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetOtp = otp;
  user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  await sendOtpEmail(user.email, otp);

  res.json({ message: 'OTP sent to your email' });
};

// 2. Verify OTP
exports.verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user || user.resetOtp !== otp || user.resetOtpExpires < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  user.isResetVerified = true;
  await user.save();

  res.json({ message: 'OTP verified. You can now reset your password.' });
};

// 3. Reset password
exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  const user = await User.findOne({ email });

  if (!user || !user.isResetVerified) {
    return res.status(403).json({ error: 'OTP verification required' });
  }

  user.password = await hashPassword(newPassword);
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;
  user.isResetVerified = false;
  await user.save();

  res.json({ message: 'Password reset successful. You can now log in.' });
};


exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};
