const generateCode = require('../utils/code_generator');
const File = require("../models/fileModel");
const fs = require("fs").promises;
const path = require('path');

async function saveFileUrl(filename, url, defaultCode) {
    try {
        if (!url) return { success: false, message: "Url not found" };

        let code;
        let isUnique = false;

        if (!defaultCode) {
            // Keep generating until unique code is found
            while (!isUnique) {
                code = generateCode();
                const existing = await File.findOne({ code });
                if (!existing) isUnique = true;
            }
        } else {
            code = defaultCode;
        }
        const file = new File({ code, filename, url, expiryDate: new Date(Date.now() + 1 * 60 * 1000) });
        await file.save();

        return { success: true, file, code };
    } catch (err) {
        return { success: false, message: err };
    }
}


// Delete file URL by ID
async function deleteFileById(id) {
    try {
        const file = await File.findById(id);
        if (!file) {
            return { success: false, message: "File not found on mongoose" };
        }
        const res = await deleteFile(file.url);
        await File.findByIdAndDelete(id);
        if (res.result === "ok") {
            return { success: true, file };
        }
        return { success: false, message: "Not found on cloudinary" };
    } catch (err) {
        return { success: false, message: err };
    }
}


// Delete file from local folder
const deleteFile = async (url) => {
  try {
    const filePath = path.join(__dirname, "../public/share_uploads/", url);
    await fs.unlink(filePath); // Promise version, no callback needed
    return { result: "ok" };
  } catch (error) {
    console.error("Error deleting file:", error);
    return { result: error };
  }
};
module.exports = { saveFileUrl, deleteFileById };


