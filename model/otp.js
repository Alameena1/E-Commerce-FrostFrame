const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60, // OTP documents will expire after 60 seconds
    }
});

const otps= mongoose.model("Otp", otpSchema);
module.exports = otps;
