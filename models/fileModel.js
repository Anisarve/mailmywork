// models/fileModel.js
const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: false,
  },
  filename:{
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,   
    unique: true,    
    trim: true      
  },
  expiryDate: {
    type: Date, 
    required: true 
  }
}, { 
  timestamps: true    
});

module.exports = mongoose.model("File", fileSchema);
