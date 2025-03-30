const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

// Protected routes
router.get('/:id', protect, userController.getUserById);
router.get('/', protect, isAdmin, userController.getAllUsers);
router.put('/:id', protect, userController.updateUser);
router.delete('/:id', protect, isAdmin, userController.deleteUser);

module.exports = router;
