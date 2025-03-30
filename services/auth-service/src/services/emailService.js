const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendOtpEmail = async (to, otp) => {
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your OTP Code',
    text: `Your OTP is ${otp}`
  });
};

exports.sendConfirmationEmail = async (to) => {
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Account Verified',
    text: 'Your registration has been successfully verified!'
  });
};