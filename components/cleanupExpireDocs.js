// controllers/cleanupController.js
const File = require("../models/fileModel");
const Text = require("../models/textModel");
const { deleteFileById } = require('./file.js');

async function cleanupExpiredDocs() {
  try {
    const now = new Date();
    let deletedSomething = true;

    // Keep checking until no expired doc is left
    while (deletedSomething) {
      deletedSomething = false;

      // --- Oldest File ---
      const oldestFile = await File.findOne().sort({ createdAt: 1 });
      if (oldestFile && oldestFile.expiryDate && now > oldestFile.expiryDate) {
        await deleteFileById(oldestFile._id);
        deletedSomething = true; // deleted one → check again
        continue; // skip to next loop iteration
      }

      // --- Oldest Text ---
      const oldestText = await Text.findOne().sort({ createdAt: 1 });
      if (oldestText && oldestText.expiryDate && now > oldestText.expiryDate) {
        await Text.findByIdAndDelete(oldestText._id);
        deletedSomething = true; // deleted one → check again
        continue;
      }
    }

  } catch (err) {
    console.error("Error in cleanupExpiredDocs:", err);
  }
}

module.exports = { cleanupExpiredDocs };
