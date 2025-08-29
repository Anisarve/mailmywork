const File = require("../models/fileModel");
const Text = require("../models/textModel");

const fetch = async (code) => {
    try {
        const text = await Text.findOne({ code });
        if (!text) {
            const files = await File.find({ code });
            if (!files || files.length == 0) {
                return { success: false, message: "Invalid Code" };
            }
            // Create a new array with just name + url
            const fileArray = files.map(file => ({
                name: file.filename,
                url: file.url
            }));
            return { success: true, type: "file", content: fileArray };
        }
        return { success: true, type: "text", content: text.textContent };
    } catch (error) {
        console.log(error);
        return { success: false, message: error };
    }
}

module.exports = { fetch };