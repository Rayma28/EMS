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
    console.error('Email transporter error:', error.message);
  } else {
    console.log('Email transporter ready');
  }
});

/**
 * Send email - now supports both plain text and HTML
 * @param {string} to - recipient email(s), comma-separated if multiple
 * @param {string} subject - email subject
 * @param {string} body - email content (plain text or HTML)
 * @param {boolean} isHtml - set to true if body is HTML (default: false)
 * @returns {Promise<boolean>} success
 */
const sendEmail = async (to, subject, body, isHtml = false) => {
  if (!to) {
    console.error('Cannot send email: recipient email is missing');
    return false;
  }

  const mailOptions = {
    from: `"EMS Notification" <${process.env.EMAIL_USER}>`,
    to,
    subject,
  };

  if (isHtml) {
    mailOptions.html = body;
    mailOptions.text = body
      .replace(/<[^>]+>/g, ' ')           
      .replace(/\s+/g, ' ')              
      .trim();
  } else {
    mailOptions.text = body;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (err) {
    console.error('Failed to send email:', err.message);
    if (err.response) {
      console.error('Full error response:', err.response);
    }
    return false;
  }
};

module.exports = { sendEmail };