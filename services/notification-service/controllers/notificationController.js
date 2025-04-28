// controllers/notificationController.js
const Notification = require('../models/Notification');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

exports.sendOtp = async (req, res) => {
  const { email, contactNumber, message, otp, channel } = req.body;
  try {
    if (!otp) return res.status(400).json({ error: "OTP is required" });

    // Send Email
    if (channel === 'email' || channel === 'both') {
      await sendEmail(email, 'Your OTP Code', otp, message);
    }

    // Send SMS
    if (channel === 'sms' || channel === 'both') {
      await sendSMS(contactNumber, `${message} - Your OTP: ${otp}`);
    }

    await Notification.create({ email, contactNumber, message, otp, type: 'otp', channel });

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

exports.sendNotification = async (req, res) => {
  const { email, contactNumber, message, channel } = req.body;
  try {
    if (!message) return res.status(400).json({ error: "Message is required" });

    if (channel === 'email' || channel === 'both') {
      await sendEmail(email, 'Notification', null, message);
    }

    if (channel === 'sms' || channel === 'both') {
      await sendSMS(contactNumber, message);
    }

    await Notification.create({ email, contactNumber, message, type: 'notification', channel });

    res.json({ message: "Notification sent successfully" });
  } catch (error) {
  console.error("Notification Service Error:", error.message);
  res.status(500).json({ error: "Failed to send OTP", details: error.message });
}

};
