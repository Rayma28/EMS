const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('EMAIL_USER or EMAIL_PASS is missing in .env file!');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
  tls: {
    rejectUnauthorized: false, 
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error(' Email transporter error:', error.message);
  } else {
    console.log(' Email transporter ready');
  }
});

const sendEmail = async (to, subject, text) => {
  if (!to) {
    console.error('Cannot send email: recipient email is missing');
    return false;
  }

  const mailOptions = {
    from: `"EMS Notification" <${process.env.EMAIL_USER}>`, 
    to,
    subject,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (err) {
    console.error('Failed to send email:', err.message);
    return false;
  }
};

module.exports = { sendEmail };