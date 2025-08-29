const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const fileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'files',
    resource_type: "auto",
    eager: [{ quality: "auto", fetch_format: "auto" }]
  },
});

// Function to delete an File
// async function deleteFile(fileUrl) {
//   try {
//     // Get path after /upload/
//     const parts = fileUrl.split("/upload/")[1];
//     const publicIdWithExt = parts.substring(parts.indexOf("/") + 1);
//     const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf(".")); 

//     // Delete File
//     const response = await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });

//     console.log("Delete response:", response);
//     return response;
//   } catch (error) {
//     return { "result": "not found" };
//   }
// }


module.exports = {fileStorage, deleteFile};