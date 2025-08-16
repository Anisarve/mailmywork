const multer = require('multer');
const path = require('path');

// Store file with original filename
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads')); // Destination folder
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Keep original file name
  }
});

module.exports = {storage};