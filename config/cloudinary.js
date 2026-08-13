const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const assignmentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'assignments',
    resource_type: 'raw' // Store as raw files to bypass default Cloudinary PDF/document restrictions
  },
});

// Function to delete an asset from Cloudinary by extracting public_id
async function deleteFromCloudinary(fileUrl) {
  try {
    if (!fileUrl) return { result: "not found" };
    // Cloudinary URLs look like: https://res.cloudinary.com/<cloud_name>/image/upload/v1234567/assignments/xxxx.pdf
    const parts = fileUrl.split("/upload/");
    if (parts.length < 2) return { result: "not found" };
    
    const pathAfterUpload = parts[1]; // e.g. "v1234567/assignments/xxxx.pdf" or "assignments/xxxx.pdf"
    const pathParts = pathAfterUpload.split("/");
    
    // If the first part starts with 'v' and is numeric, it is the version number. Skip it.
    const startIndex = (pathParts[0].startsWith('v') && !isNaN(pathParts[0].substring(1))) ? 1 : 0;
    const cleanPath = pathParts.slice(startIndex).join("/"); // e.g. "assignments/xxxx.pdf"
    
    // Remove the extension to get public_id
    const lastDotIndex = cleanPath.lastIndexOf(".");
    const publicId = lastDotIndex !== -1 ? cleanPath.substring(0, lastDotIndex) : cleanPath;
    
    console.log("Cloudinary deleting publicId:", publicId);
    
    // Cloudinary destroy expects the resource type. Since resource_type: 'auto' is used in upload,
    // PDFs are stored as resource_type: 'image'. Let's try image first, then raw.
    let response = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    if (response.result !== "ok") {
      response = await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    }
    
    console.log("Delete response:", response);
    return response;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return { result: "error", error };
  }
}

module.exports = { assignmentStorage, deleteFromCloudinary };
