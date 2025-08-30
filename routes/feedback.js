const express = require("express");
const router = express();

const {sendFeedback} = require('../utils/gmail_nodemailer');

router.post('/', async (req, res)=>{
    try {
        const {username, useremail, feedback} = req.body;
        const result = await sendFeedback(username, useremail, feedback);
        if(result.accepted){
            return res.status(200).json({success:true, message:"Thanks for your feedback"});
        }
        res.status(500).json({success:false, error:"Something went wrong"});
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false, error});
    }
})

module.exports = router;