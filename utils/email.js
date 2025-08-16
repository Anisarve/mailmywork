const nodemailer = require('nodemailer');
const path = require('path');
// configure Nodemailer instance
const transporter = nodemailer.createTransport({
  secure: true,
  host: 'smtp.gmail.com',
  port: 465,
  auth: {
    user: 'myshopii63@gmail.com',
    pass: 'pnlfucazbwgufnza'
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates
  }
});


// Function to send text content
const sendText = async (email, sub, message) => {
  transporter.sendMail({
    to: email,
    subject: sub || "You've sent yourself something via MailMyWork.io!",
    html: `<pre style="white-space:pre-wrap; font-family:monospace;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
  </pre>
  <p>Thanks,<br/>MailMyWork.io</p>
`
  })
};


const sendFiles = async (email, sub, files) => {
    const attachments = files.map(file => ({
        filename: file,
        path: path.join(__dirname, '../uploads', file) // Ensure the path is correct
    }));

    console.log('Sending files:', attachments);
    transporter.sendMail({
        to: email,
        subject: sub || "You shared some files with yourself via MailMyWork.io!",
        html: 'Attached file : ',
        attachments
    }).then(() => { console.log('Files sent successfully')}).catch(error => {console.error('Error sending files:', error)});
}


module.exports = {sendText, sendFiles};