const nodemailer = require('nodemailer');
const path = require('path');

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  secure: true,
  host: 'smtp.gmail.com',
  port: 465,
  auth: {
    user: 'myshopii63@gmail.com',
    pass: 'pnlfucazbwgufnza' // App password
  },
  tls: {
    rejectUnauthorized: false,
  }
});

// Function to send text content
const sendText = (email, sub, message) => {
  return transporter.sendMail({
    to: email,
    subject: sub || "You've sent yourself something via MailMyWork.io!",
    html: `<pre style="white-space:pre-wrap; font-family:monospace;">${message
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre>
<p>Thanks,<br/>MailMyWork.io</p>`
  });
};

// Function to send files
const sendFiles = (email, sub, files) => {
  const attachments = files.map(file => ({
    filename: file,
    path: path.join(__dirname, '../uploads', file)
  }));

  console.log('Sending files:', attachments);

  // Return the promise so the caller can await it
  return transporter.sendMail({
    to: email,
    subject: sub || "You shared some files with yourself via MailMyWork.io!",
    html: 'Attached file(s):',
    attachments
  });
};

module.exports = { sendText, sendFiles };