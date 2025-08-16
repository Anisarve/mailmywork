// utils/deleteFile.js
const fs = require('fs');
const path = require('path');

function deleteFromSystem(filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, '../uploads', filename);
    fs.unlink(filePath, err => {
      if (err) {
        console.error(`Error deleting ${filename}:`, err);
        reject(err);
      } else {
        console.log(`Deleted ${filename}`);
        resolve();
      }
    });
  });
}

module.exports = { deleteFromSystem };
