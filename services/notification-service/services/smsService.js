const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendSMS = async (contactNumber, message) => {
  try {
    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio number (e.g., +1234567890)
      to: contactNumber,
    });
    console.log('Twilio SMS sent:', response.sid);
  } catch (error) {
    console.error('Twilio SMS error:', error.message);
    throw new Error(`SMS sending failed: ${error.message}`);
  }
};
