const express = require('express');
const router = express.Router();
const { sendText } = require('../utils/gmail_nodemailer');

router.post('/send', (req, res) => {
    const { email, subject, message } = req.body;
    if (!email || !message) {
        return res.status(400).json({ status: false, message: 'Email and message are required' });
    }
    sendText(email, subject, message)
        .then(() => {
            res.status(200).json({ status: true, message: 'Text sent successfully' });
        })
        .catch(error => {
            console.error('Error sending text:', error);
            res.status(500).json({ status: false, message: 'Error sending text' });
        });
})


module.exports = router;    