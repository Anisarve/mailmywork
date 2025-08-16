const express = require('express');
const router = express.Router();

const multer = require('multer');
const path = require('path');

const {storage} = require('../utils/storage');
const upload = multer({ storage });

const { sendFiles } = require('../utils/email');
const fs = require('fs');
const { deleteFromSystem } = require('../utils/deletefile');

router.post('/', upload.single('files'), (req, res) => {
    console.log('Files received:', req.file);
    if(!req.file) {
        return res.status(400).json({ status: false, message: 'No files uploaded' });
    }
    res.status(200).json({ status:true, message: 'Files uploaded successfully', filename : req.file.originalname});
});

router.post('/finalise', (req, res)=>{
    console.log('Finalise request received:', req.body);
    const { email, subject, files } = req.body;
    if (!email || !files || files.length === 0) {
        return res.status(400).json({ status: false, message: 'Email and files are required' });
    }
    sendFiles(email, subject, files)
        .then(() => {
            res.status(200).json({ status: true, message: 'Files sent successfully' });
        })
        .catch(error => {
            console.error('Error sending files:', error);
            res.status(500).json({ status: false, message: 'Error sending files' });
        });
})

router.post('/remove', (req, res) => {
    const { filename } = req.body;
    if (!filename) {
        return res.status(400).json({ status: false, message: 'Filename is required' });
    }
    const filePath = path.join(__dirname, '../uploads', filename);
    console.log('Removing file:', filePath);
    
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error removing file:', err);
            return res.status(500).json({ status: false, message: 'Error removing file' });
        }
        res.status(200).json({ status: true, message: 'File removed successfully' });
    });
});

module.exports = router;