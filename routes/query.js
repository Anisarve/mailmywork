const express = require("express");
const router = express();

const multer = require('multer');
const { ApiShareFileStorage } = require('../utils/storage');
const upload = multer({ storage: ApiShareFileStorage });

const { sendTextAPI, sendFilesAPI } = require('../utils/gmail_nodemailer');
const fs = require('fs');
const { deleteFromSystem } = require('../utils/deletefile');

router.post('/file', upload.single('file'), async (req, res) => {
    const {email, sub } = req.body;
    try {
        if(!email){
            return res.status(400).json({ status: false, error: 'Email is undefined' });
        }
        if(!sub){
            return res.status(400).json({ status: false, error: 'Subject is undefined' });
        }
        if (!req.file) {
            return res.status(400).json({ status: false, error: 'No files uploaded' });
        }
        const result = await sendFilesAPI(email, sub, req.file.storedFileName);
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error removing file:', err);
                return res.status(500).json({ status: false, error: 'Error removing file' });
            }
            res.status(200).json({ status: true, message: 'File removed successfully' });
        });
        console.error("Error Removing Files");
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, error: 'No files uploaded' });
    }

});

router.post('/text', async (req, res) => {
    const {email, sub, message} = req.body;
    try {
        if(!email){
            return res.status(400).json({ status: false, error: 'Email is undefined' });
        }
        if(!sub){
            return res.status(400).json({ status: false, error: 'Subject is undefined' });
        }
        if(!message){
            return res.status(400).json({ status: false, error: 'Subject is undefined' });
        }
        const result = await sendTextAPI(email, sub, message);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, error: 'Error Sending text api query' });
    }
});

module.exports = router;