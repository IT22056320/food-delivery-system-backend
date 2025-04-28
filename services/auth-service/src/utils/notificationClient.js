const axios = require('axios');

const NOTIFICATION_SERVICE_URL = 'http://localhost:5001/api/notifications';

exports.sendOtp = async ({ email, contactNumber, message, otp, channel }) => {
  await axios.post(`${NOTIFICATION_SERVICE_URL}/send-otp`, {
    email,
    contactNumber,
    message,
    otp,
    channel,
  });
};

exports.sendNotification = async ({ email, contactNumber, message, channel }) => {
  await axios.post(`${NOTIFICATION_SERVICE_URL}/send-notification`, {
    email,
    contactNumber,
    message,
    channel,
  });
};
