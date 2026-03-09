// routes/donation.js
const express = require('express');
const router = express.Router();
const donationController = require('../components/donationController');

// API Routes
router.post('/create-session', donationController.createDonationSession);
router.post('/webhook', donationController.handleWebhook);
router.get('/verify/:sessionId', donationController.verifyDonation);
router.get('/stats', donationController.getDonationStats);
router.get('/all', donationController.getAllDonations); // Add auth middleware for production

module.exports = router;