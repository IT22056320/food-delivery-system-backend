// services/emailService.js
const nodemailer = require('nodemailer');

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);


const transporter = nodemailer.createTransport({
  service: 'gmail', // Or your preferred provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendEmail = async (to, subject, otp, message) => {
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #fdf6f0; color: #333;">
      <h2 style="color: #ff6600;">FoodHub Notification</h2>
      <p>${message}</p>
      ${otp ? `<h3>Your OTP: <span style="color: #ff6600;">${otp}</span></h3>` : ''}
      <p style="font-size: 12px; color: #999;">If you didn't request this, please ignore this message.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"FoodHub" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: htmlTemplate,
  });
};
