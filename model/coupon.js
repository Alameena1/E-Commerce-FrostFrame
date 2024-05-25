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
    });
    const Coupon = mongoose.model('Coupon', couponSchema);
  
    module.exports = Coupon;