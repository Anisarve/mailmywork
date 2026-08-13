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

const emailHead = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Rajdhani:wght@500;700&display=swap');
    body { margin: 0; padding: 0; background-color: #0b111a; font-family: 'Inter', sans-serif; color: #cbd5e1; }
    .container { max-width: 600px; margin: 40px auto; padding: 30px; background-color: #0f1824; border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,240,255,0.05); }
    h2 { font-family: 'Rajdhani', sans-serif; color: #ffffff; font-size: 28px; line-height: 1.2; letter-spacing: 1px; margin-top: 0; margin-bottom: 20px; }
    .gradient-text { background: linear-gradient(90deg, #00f0ff, #1c55d0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .accent-box { background: rgba(11, 17, 26, 0.8); padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; font-family: monospace; white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #e2e8f0; margin-bottom: 30px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 13px; color: #64748b; }
    .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(45deg, #1c55d0, #00f0ff); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-family: 'Rajdhani', sans-serif; letter-spacing: 1px; }
    .logo-container { text-align: center; margin-bottom: 30px; }
  </style>
`;

const globalHeader = `
  <div class="logo-container">
    <h1 style="font-family:'Rajdhani', sans-serif; font-size:32px; margin:0; letter-spacing:2px; color:#ffffff;">
      <span style="color:#00f0ff;">Mail</span>My<span style="color:#10b981;">Work</span>.io
    </h1>
  </div>
`;



// Function to send feedback email
const sendFeedback = (userName, userEmail, feedback) => {
  return transporter.sendMail({
    to: "anusarve2006@gmail.com",
    subject: "New Feedback Received - MailMyWork.io",
    html: `
      <!DOCTYPE html>
      <html>
      <head>${emailHead}</head>
      <body>
        <div class="container">
          ${globalHeader}
          <h2><span class="gradient-text">Incoming Feedback</span> Alert</h2>
          <div class="accent-box" style="border-left-color: #f59e0b;">
            <strong>User Details:</strong><br>
            Name: ${userName}<br>
            Email: ${userEmail}
          </div>
          <h3>System Feedback:</h3>
          <div class="accent-box">
            ${feedback.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </div>
          <div class="footer">Admin Notification System - MailMyWork.io</div>
        </div>
      </body>
      </html>
    `
  });
};

// Function to send text content
const sendTextAPI = (email, sub, message) => {
  return transporter.sendMail({
    to: email,
    subject: sub,
    html: message
  });
};


// Function to send files
const sendFilesAPI = (email, sub, filename) => {
  const attachments = files.map(file => ({
    filename: filename,
    path: path.join(__dirname, '../uploads', filename)
  }));

  // Return the promise so the caller can await it
  return transporter.sendMail({
    to: email,
    subject: sub,
    html: 'Attached file(s):',
    attachments
  });
};

module.exports = { sendFeedback, sendTextAPI, sendFilesAPI };
