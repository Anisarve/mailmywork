const File = require("../models/fileModel");
const Text = require("../models/textModel");
const { LRUCache } = require("lru-cache");

// Configure the In-Memory Cache for blazing fast code lookups
const options = {
    max: 500, // Maximum active codes to hold in memory
    ttl: 1000 * 60 * 10 // 10 minutes (matches the DB expiry)
};
const codeCache = new LRUCache(options);

const fetch = async (code) => {
    try {
        // 1. Check RAM Cache First
        if (codeCache.has(code)) {
            console.log("Serving instantly from RAM cache:", code);
            return codeCache.get(code);
        }

        // 2. Fallback to MongoDB
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

            const fileResult = { success: true, type: "file", content: fileArray };
            // Save to RAM Cache
            codeCache.set(code, fileResult);
            return fileResult;
        }

        const textResult = { success: true, type: "text", content: text.textContent };
        // Save to RAM cache
        codeCache.set(code, textResult);
        return textResult;

    } catch (error) {
        console.log(error);
        return { success: false, message: error };
    }
}

// Function to pre-warm the cache immediately upon creation
const preWarmCache = (code, type, content) => {
    const payload = { success: true, type, content };
    codeCache.set(code, payload);
};

module.exports = { fetch, preWarmCache };