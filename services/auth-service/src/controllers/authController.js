const User = require('../models/User');
const { hashPassword, comparePasswords } = require('../utils/passwordUtils');
const { generateToken } = require('../utils/tokenUtils');
const { sendOtpEmail, sendConfirmationEmail } = require('../services/emailService');
const crypto = require('crypto');

exports.register = async (req, res) => {
  const { name, email, password, isAdmin } = req.body;
  const hashedPassword = await hashPassword(password);
  const otp = crypto.randomInt(100000, 999999).toString();

  const user = await User.create({ name, email, password: hashedPassword, isAdmin, otp, otpExpires: Date.now() + 300000 });
  await sendOtpEmail(email, otp);
  res.status(201).json({ message: 'OTP sent to email', userId: user._id });
};

exports.verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;
  const user = await User.findById(userId);

  if (!user || user.otp !== otp || user.otpExpires < Date.now()) return res.status(400).json({ error: 'Invalid or expired OTP' });

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

  const { _id, name, isAdmin } = user;

  res.status(200).json({
    message: 'Login successful',
    user: {
      _id,
      name,
      email: user.email,
      isAdmin
    }
  });
};


exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};
