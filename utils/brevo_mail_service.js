require("dotenv").config();
const SibApiV3Sdk = require('sib-api-v3-sdk');
const fs = require('fs');
const path = require('path');

const { sendText, sendFiles } = require('../utils/gmail_nodemailer');

// Configure Brevo
let defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_SMTP_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendFilesBrevo(email, sub, text, files) {
    try {
        let attachments = [];

        for (const fileName of files) {
            const filePath = path.join(__dirname, '../uploads', fileName);

            // Ensure file exists
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath).toString("base64");
                attachments.push({
                    content: fileContent,
                    name: fileName
                });
            } else {
                console.warn(`File not found: ${fileName}`);
            }
        }

        // Email payload
        const sendSmtpEmail = {
            sender: { email: "myshopii63@gmail.com" },
            to: [{ email: email }],
            subject: sub || "You shared some files with yourself via MailMyWork.io!",
            textContent:text || "You've sent yourself something via MailMyWork.io!",
            attachment: attachments
        };

        const result = await tranEmailApi.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
        console.error("Error sending email:", error);
        console.log("Using Backup Method Nodemailer :)");
        sendFiles(email, sub, files);
    }
}

async function sendTextBrevo(email, sub, text) {
    try {
        // Email payload
        const sendSmtpEmail = {
            sender: { email: "myshopii63@gmail.com" },
            to: [{ email: email }],
            subject: sub || "You shared some text with yourself via MailMyWork.io!",
            textContent: text,
        };
        const result = await tranEmailApi.sendTransacEmail(sendSmtpEmail);
    } catch (error) {
        console.error("Error sending email:", error);
        console.log("Using Backup Method Nodemailer :)");
        sendText(email, sub, text);
    }


}

module.exports = { sendTextBrevo, sendFilesBrevo };