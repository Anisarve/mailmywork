// models/fileModel.js
const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },

  textContent: {
    type: String,
    required: false,  
    trim: true
  },
  expiryDate: {
    type: Date, 
    required: true 
  }
}, { 
  timestamps: true     
});

module.exports = mongoose.model("Text", fileSchema);
