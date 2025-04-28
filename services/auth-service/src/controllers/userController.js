const User = require('../models/User');
const asyncHandler = require('express-async-handler');

exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw new Error('User not found');
  res.status(200).json(user);
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password');
  res.status(200).json(users);
});

exports.updateUser = asyncHandler(async (req, res) => {
  const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  }).select('-password');
  res.status(200).json(updated);
});

exports.deleteUser = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: 'User deleted successfully' });
});
