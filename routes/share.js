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



module.exports = router;