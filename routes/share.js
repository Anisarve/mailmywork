const express = require('express');
const router = express.Router();

const multer = require('multer');
const {ShareFileStorage} = require('../utils/storage');
const upload = multer({ storage: ShareFileStorage });

const { saveText, deleteTextById } = require("../components/Text");
const { saveFileUrl, deleteFileById } = require("../components/file");

// {
//   fieldname: 'files',
//   originalname: 'Eyantra Themes.pdf',
//   encoding: '7bit',
//   mimetype: 'application/pdf',
//   originalFileName: 'Eyantra Themes.pdf',
//   storedFileName: '6HzwGrNMLMDhd80nJWKV.pdf',
//   destination: 'E:\\Main Projects\\MailMyWork\\public\\share_uploads',
//   filename: '6HzwGrNMLMDhd80nJWKV.pdf',
//   path: 'E:\\Main Projects\\MailMyWork\\public\\share_uploads\\6HzwGrNMLMDhd80nJWKV.pdf',
//   size: 55634
// }


router.post('/upload', upload.single('files'), async (req, res) => {
    try {
        const {code} = req.body;
        const result = await saveFileUrl( req.file.originalname, req.file.storedFileName, code);
        if(result.success){
            return res.status(200).json({ success: true, message: 'File uploaded successfully', filename: req.file.originalname, fileId: result.file.id, code:result.code});
        }
        res.status(200).json({ success: false, message: result.message });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Upload failed!" });
    }
});


router.post('/remove', async (req, res) => {
    const { fileId } = req.body;
    if (!fileId){
        return res.status(400).json({ success: false, message: 'file id is required' });
    }
    const result = await deleteFileById(fileId);
    if(result.success){
        res.status(200).json({success:true, message: "File Deleted Successfully"});
    }else{
        res.status(500).json({ success:false, message: result.message, fileId:fileId });
    }
});


router.post('/text', async (req, res) => {
    try{
        const {text} = req.body;
        if(!text){
            return res.status(402).json({success:false, message:"Empty message can't be stored"});
        }
        const result = await saveText(text);
        if(result.success){
            return res.status(200).json({success:true, code:result.code});
        }
        console.error("Error ocuurs");
        res.status(400).json({success:false, message:result.message});

    }catch(error){
        console.error(error);
        res.status(400).json({success:false, message:error});
    }
})

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

// Ensure temp_chunks folder exists
const tempChunksDir = path.join(__dirname, '../temp_chunks');
if (!fs.existsSync(tempChunksDir)) {
    fs.mkdirSync(tempChunksDir, { recursive: true });
}

const uploadChunk = multer({ dest: 'temp_chunks/' });

router.post('/upload-chunk', uploadChunk.single('chunk'), async (req, res) => {
    try {
        const { storedFileName, chunkIndex, totalChunks, code, originalName } = req.body;
        const chunkPath = req.file.path;
        const destPath = path.join(__dirname, '../public/share_uploads', storedFileName);

        // Read chunk file and append it to final destination file
        const chunkBuffer = await fsPromises.readFile(chunkPath);
        await fsPromises.appendFile(destPath, chunkBuffer);

        // Remove temp chunk file
        await fsPromises.unlink(chunkPath);

        const chunkIdxVal = parseInt(chunkIndex, 10);
        const totalChunksVal = parseInt(totalChunks, 10);

        // Check if final chunk has arrived
        if (chunkIdxVal + 1 === totalChunksVal) {
            const result = await saveFileUrl(originalName, storedFileName, code);
            if (result.success) {
                return res.status(200).json({
                    success: true,
                    completed: true,
                    message: 'File uploaded and merged successfully',
                    filename: originalName,
                    fileId: result.file.id,
                    code: result.code
                });
            } else {
                return res.status(200).json({ success: false, message: result.message });
            }
        }

        return res.status(200).json({
            success: true,
            completed: false,
            message: `Chunk ${chunkIdxVal + 1}/${totalChunksVal} uploaded successfully`
        });
    } catch (error) {
        console.error('Error handling chunk upload:', error);
        res.status(500).json({ success: false, error: 'Chunk upload failed' });
    }
});

module.exports = router;