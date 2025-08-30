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
    html: `
      <div style="font-family: Arial, sans-serif; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color:#333;">Your Saved Note</h2>
        <p style="background:#f9f9f9; padding:10px; border-radius:5px; white-space:pre-wrap; font-family: monospace;">
          ${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </p>
        <br/>
        <p>Thanks,<br/>MailMyWork.io</p>
      </div>
    `
  });
};


// Function to send files
const sendFiles = (email, sub, files) => {
  const attachments = files.map(file => ({
    filename: file,
    path: path.join(__dirname, '../uploads', file)
  }));

  // Return the promise so the caller can await it
  return transporter.sendMail({
    to: email,
    subject: sub || "You shared some files with yourself via MailMyWork.io!",
    html: 'Attached file(s):',
    attachments
  });
};

// Function to send feedback email
const sendFeedback = (userName, userEmail, feedback) => {
  return transporter.sendMail({
    to: "anusarve2006@gmail.com", 
    subject: "New Feedback Received - MailMyWork.io",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color:#333;">New Feedback Received</h2>
        <p><strong>Name:</strong> ${userName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Feedback:</strong></p>
        <p style="background:#f9f9f9; padding:10px; border-radius:5px; white-space:pre-wrap;">
          ${feedback.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </p>
        <br/>
        <p>Thanks,<br/>MailMyWork.io</p>
      </div>
    `
  });
};

module.exports = { sendText, sendFiles, sendFeedback };
