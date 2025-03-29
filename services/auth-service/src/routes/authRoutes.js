const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');
const passport = require('passport');
const { generateToken } = require('../utils/tokenUtils');

router.post('/register', authCtrl.register);
router.post('/verify-otp', authCtrl.verifyOtp);
router.post('/login', authCtrl.login);
router.post('/logout', authCtrl.logout);
router.post('/forgot-password', authCtrl.forgotPassword);
router.post('/verify-reset-otp', authCtrl.verifyResetOtp);
router.post('/reset-password', authCtrl.resetPassword);

router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );
  
  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      // Successful login, generate JWT & set cookie
      const token = generateToken(req.user);
      res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      });
  
      res.redirect('/'); // Or redirect to frontend
    }
  );

module.exports = router;