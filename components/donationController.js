// controllers/donationController.js
const Donation = require('../models/Donation');
const crypto = require('crypto');

// Dodo Payments Configuration
const DODO_API_KEY = process.env.DODO_SECRET_KEY;
const DODO_WEBHOOK_SECRET = process.env.DODO_WEBHOOK_SECRET;
const BASE_URL = process.env.BASE_URL || 'https://mailmywork.onrender.com';

/**
 * Create a donation session
 * POST /api/donate/create-session
 */
exports.createDonationSession = async (req, res) => {
    if (!DODO_API_KEY) {
        console.error('CRITICAL: DODO_SECRET_KEY is not defined in environment variables!');
        return res.status(500).json({
            success: false,
            error: 'Server configuration error: Payment provider not configured.'
        });
    }

    try {
        const { amount, donorEmail, donorName } = req.body;

        // Validate amount
        if (!amount || amount < 10) {
            return res.status(400).json({
                success: false,
                error: 'Minimum donation amount is ₹10'
            });
        }

        // Get client info
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Create donation record
        const donation = new Donation({
            amount: parseFloat(amount),
            currency: 'INR',
            donorEmail: donorEmail || null,
            donorName: donorName || 'Anonymous',
            status: 'pending',
            ipAddress,
            userAgent
        });

        await donation.save();

        // Create Dodo Payments checkout session
        const dodoResponse = await fetch('https://live.dodopayments.com/v1/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DODO_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Convert to paise
                currency: 'INR',
                customer_email: donorEmail,
                customer_name: donorName,
                description: `Donation to MailMyWork.io - ${donation._id}`,
                metadata: {
                    donation_id: donation._id.toString(),
                    type: 'donation'
                },
                success_url: `${BASE_URL}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${BASE_URL}/donate?cancelled=true`,
                webhook_url: `${BASE_URL}/api/donate/webhook`
            })
        });

        // Robust error handling for non-JSON or error responses
        const responseText = await dodoResponse.text();
        let dodoData;

        try {
            dodoData = JSON.parse(responseText);
        } catch (e) {
            console.error('Dodo API returned non-JSON response:', responseText);
            throw new Error(`Dodo API Error: ${responseText || 'Unknown error'}`);
        }

        if (!dodoResponse.ok || !dodoData.checkout_url) {
            console.error('Dodo API error data:', dodoData);
            throw new Error(dodoData.message || 'Failed to create Dodo checkout session');
        }

        // Update donation with Dodo session info
        donation.dodoSessionId = dodoData.id;
        donation.dodoCheckoutUrl = dodoData.checkout_url;
        donation.status = 'processing';
        await donation.save();

        res.json({
            success: true,
            checkoutUrl: dodoData.checkout_url,
            sessionId: dodoData.id,
            donationId: donation._id
        });

    } catch (error) {
        console.error('Create donation session error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create donation session',
            details: error.message
        });
    }
};

/**
 * Handle Dodo Payments webhook
 * POST /api/donate/webhook
 */
exports.handleWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-dodo-signature'];
        const payload = JSON.stringify(req.body);

        // Verify webhook signature (if Dodo provides signature verification)
        if (DODO_WEBHOOK_SECRET) {
            const expectedSignature = crypto
                .createHmac('sha256', DODO_WEBHOOK_SECRET)
                .update(payload)
                .digest('hex');

            if (signature !== expectedSignature) {
                console.error('Invalid webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        }

        const event = req.body;
        console.log('Webhook received:', event.type);

        // Handle different event types
        switch (event.type) {
            case 'payment.succeeded':
            case 'checkout.session.completed':
                await handlePaymentSuccess(event.data);
                break;

            case 'payment.failed':
                await handlePaymentFailed(event.data);
                break;

            case 'payment.refunded':
                await handlePaymentRefunded(event.data);
                break;

            default:
                console.log('Unhandled webhook event:', event.type);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(paymentData) {
    try {
        const donationId = paymentData.metadata?.donation_id;

        if (!donationId) {
            console.error('No donation ID in webhook data');
            return;
        }

        const donation = await Donation.findById(donationId);

        if (!donation) {
            console.error('Donation not found:', donationId);
            return;
        }

        // Mark as completed
        await donation.markAsCompleted({
            payment_id: paymentData.id,
            payment_method: paymentData.payment_method,
            ...paymentData
        });

        console.log(`Donation ${donationId} marked as completed`);

        // Optional: Send thank you email here
        // await sendThankYouEmail(donation);

    } catch (error) {
        console.error('Error handling payment success:', error);
    }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentData) {
    try {
        const donationId = paymentData.metadata?.donation_id;

        if (!donationId) return;

        const donation = await Donation.findById(donationId);

        if (!donation) return;

        await donation.markAsFailed(paymentData.failure_reason || 'Unknown error');

        console.log(`Donation ${donationId} marked as failed`);

    } catch (error) {
        console.error('Error handling payment failure:', error);
    }
}

/**
 * Handle refunded payment
 */
async function handlePaymentRefunded(paymentData) {
    try {
        const donationId = paymentData.metadata?.donation_id;

        if (!donationId) return;

        const donation = await Donation.findById(donationId);

        if (!donation) return;

        donation.status = 'refunded';
        donation.refundedAt = new Date();
        donation.webhookData = paymentData;
        await donation.save();

        console.log(`Donation ${donationId} refunded`);

    } catch (error) {
        console.error('Error handling refund:', error);
    }
}

/**
 * Verify donation status
 * GET /api/donate/verify/:sessionId
 */
exports.verifyDonation = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const donation = await Donation.findOne({ dodoSessionId: sessionId });

        if (!donation) {
            return res.status(404).json({
                success: false,
                error: 'Donation not found'
            });
        }

        res.json({
            success: true,
            status: donation.status,
            amount: donation.amount,
            currency: donation.currency,
            paidAt: donation.paidAt
        });

    } catch (error) {
        console.error('Verify donation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify donation'
        });
    }
};

/**
 * Get donation statistics
 * GET /api/donate/stats
 */
exports.getDonationStats = async (req, res) => {
    try {
        const totalStats = await Donation.getTotalDonations();
        const recentDonations = await Donation.getRecentDonations(5);

        res.json({
            success: true,
            stats: {
                totalAmount: totalStats.total,
                totalDonations: totalStats.count,
                recentDonations: recentDonations.map(d => ({
                    name: d.donorName,
                    amount: d.amount,
                    date: d.paidAt
                }))
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get donation stats'
        });
    }
};

/**
 * Get all donations (admin only - add auth middleware)
 * GET /api/donate/all
 */
exports.getAllDonations = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;

        const filter = {};
        if (status) filter.status = status;

        const donations = await Donation.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Donation.countDocuments(filter);

        res.json({
            success: true,
            donations,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });

    } catch (error) {
        console.error('Get all donations error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch donations'
        });
    }
};