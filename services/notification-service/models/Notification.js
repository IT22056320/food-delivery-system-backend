// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  email: { type: String, required: false },
  contactNumber: { type: String, required: false },
  message: { type: String, required: true },
  otp: { type: String, required: false },
  type: { type: String, enum: ['otp', 'notification'], required: true },
  channel: { type: String, enum: ['email', 'sms', 'both'], required: true },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
