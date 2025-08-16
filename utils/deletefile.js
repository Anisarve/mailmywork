const fs = require('fs');
const path = require('path');
function deleteFromSystem(filename) {
    const filePath = path.join(__dirname, '../uploads', filename);
    fs.unlink(filePath, (err)=>{
        console.error(err);
    })
}
module.exports = {deleteFromSystem};