const express = require("express");
const router = express();
const {fetch} = require('../components/fetch');

router.post('/', async (req, res)=>{
    const {code} = req.body;
    if(!code) return res.status(403).json({success:false, message:"Code not found"});
    try{
        const result = await fetch(code);
        if(result.success){
            return res.status(200).json({success:true, type:result.type, content:result.content});
        }
        return res.status(500).json({success:false, message:result.message});
    }catch(error){
        console.error(error);
        return res.status(500).json({success:false, message:error});
    }
})

module.exports = router;