// routes/donatePages.js
const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');

// GET /donate - Donation Landing Page
router.get('/', (req, res) => {
    res.render('donate');
});

// GET /donate/success - Success Page
router.get('/success', async (req, res) => {
    const { session_id } = req.query;

    let donation = null;
    if (session_id) {
        donation = await Donation.findOne({ dodoSessionId: session_id });
    }

    res.render('donate-success', { donation });
});

module.exports = router;
