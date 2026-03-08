const generateCode = require('../utils/code_generator');
const Text = require("../models/textModel");
const { preWarmCache } = require("./fetch");

async function saveText(textContent) {
  try {
    if (!textContent) {
      return { success: false, message: "Text not found" };
    }
    let code;
    let isUnique = false;

    // Keep generating until unique code is found
    while (!isUnique) {
      code = generateCode();
      const existing = await Text.findOne({ code });
      if (!existing) isUnique = true;
    }

    const content = new Text({ code, textContent, expiryDate: new Date(Date.now() + 1 * 60 * 1000) });
    await content.save();

    // Pre-warm the LRU Cache so receivers get it instantly without DB hit
    preWarmCache(code, 'text', textContent);

    return { success: true, code };
  } catch (err) {
    console.log(err);
    return { success: false, message: err };
  }
}

module.exports = { saveText };


