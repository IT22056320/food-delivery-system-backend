// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationCtrl = require('../controllers/notificationController');

router.post('/send-otp', notificationCtrl.sendOtp);
router.post('/send-notification', notificationCtrl.sendNotification);

module.exports = router;
