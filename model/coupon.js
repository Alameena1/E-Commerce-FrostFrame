const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
      type: String,
      unique: true,
      required: true,
    },
    discountValue: {
        type: Number,
        required: true,
    },
    usedBy: {
        type: Date,
        required: true,
    },
    expirationDate: {
        type: Date,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    minimum: {
        type: Number
    },
    maximum: {
        type: Number
    },
    fixedRate: {
        type: Number, // Add this field
        default: 0   // Default to 0 if not provided
    }
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
