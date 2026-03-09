// models/Donation.js
const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    // Donor information
    donorEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    donorName: {
        type: String,
        trim: true
    },

    // Payment details
    amount: {
        type: Number,
        required: true,
        min: 10
    },
    currency: {
        type: String,
        default: 'INR',
        uppercase: true
    },

    // Dodo Payments data
    dodoSessionId: {
        type: String,
        unique: true,
        sparse: true
    },
    dodoPaymentId: {
        type: String,
        unique: true,
        sparse: true
    },
    dodoCheckoutUrl: String,

    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },

    // Payment method used
    paymentMethod: {
        type: String,
        enum: ['upi', 'card', 'netbanking', 'wallet', 'other'],
        default: 'other'
    },

    // Metadata
    ipAddress: String,
    userAgent: String,

    // Webhook data
    webhookData: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    // Timestamps
    paidAt: Date,
    refundedAt: Date
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Index for faster queries
donationSchema.index({ status: 1, createdAt: -1 });
donationSchema.index({ donorEmail: 1 });
donationSchema.index({ dodoPaymentId: 1 });

// Virtual for formatted amount
donationSchema.virtual('formattedAmount').get(function () {
    return `₹${this.amount.toFixed(2)}`;
});

// Method to mark as completed
donationSchema.methods.markAsCompleted = function (paymentData) {
    this.status = 'completed';
    this.paidAt = new Date();
    this.dodoPaymentId = paymentData.payment_id || this.dodoPaymentId;
    this.paymentMethod = paymentData.payment_method || this.paymentMethod;
    this.webhookData = paymentData;
    return this.save();
};

// Method to mark as failed
donationSchema.methods.markAsFailed = function (reason) {
    this.status = 'failed';
    this.webhookData = { failureReason: reason };
    return this.save();
};

// Static method to get total donations
donationSchema.statics.getTotalDonations = async function () {
    const result = await this.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    return result[0] || { total: 0, count: 0 };
};

// Static method to get recent donations
donationSchema.statics.getRecentDonations = async function (limit = 10) {
    return this.find({ status: 'completed' })
        .sort({ paidAt: -1 })
        .limit(limit)
        .select('donorName amount currency paidAt');
};

module.exports = mongoose.model('Donation', donationSchema);