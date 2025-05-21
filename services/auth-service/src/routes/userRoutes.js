const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');
const User = require('../models/User');

// 🔓 Internal route - MUST come before `/:id` to avoid conflict
router.get('/internal/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-password -otp -resetOtp -otpExpires -resetOtpExpires'
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error) {
    console.error('Internal fetch user error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// 🔐 Protected routes
router.get('/:id', protect, userController.getUserById);
router.get('/', protect, isAdmin, userController.getAllUsers);
router.put('/:id', protect, userController.updateUser);
router.delete('/:id', protect, isAdmin, userController.deleteUser);

module.exports = router;
