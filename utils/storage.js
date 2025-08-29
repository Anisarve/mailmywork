const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const shareUploads = path.join(__dirname, '../public/share_uploads');
if (!fs.existsSync(shareUploads)) {
    fs.mkdirSync(shareUploads, { recursive: true });
}

const emailUploads = path.join(__dirname, '../uploads');
if (!fs.existsSync(emailUploads)) {
    fs.mkdirSync(emailUploads, { recursive: true });
}

// Function to generate 10 random alphanumeric characters
function randomFilename(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Store file with original filename
const ShareFileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/share_uploads')); // Destination folder
  },
  filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // keep extension
        const name = path.basename(file.originalname, ext); // original name
        const newFilename = randomFilename(20)+ext;
        
        // Store both names in req.file for later use
        file.originalFileName = file.originalname;
        file.storedFileName = newFilename;
        
        cb(null, newFilename);
    }
});

// Store file with original filename
const EmailFilestorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads')); // Destination folder
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Keep original file name
  }
});


module.exports = {EmailFilestorage, ShareFileStorage};