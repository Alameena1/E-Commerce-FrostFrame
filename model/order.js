const mongoose = require('mongoose');
const moment = require('moment-timezone');

const Schema = mongoose.Schema;

const orderSchema = new Schema({
    orderId: {
        type: String
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    items: [{
        productId: { type: Schema.Types.ObjectId, required: true },
        productName: { type: String, required: true },
        categoryId: { type: Schema.Types.ObjectId},
        categoryName: { type: String, required: true },
        productDescription: { type: String },
        productRating: { type: Number, default: 0 },
        stock: { type: Number },
        productImage: { type: [String] },
        quantity: { type: Number, min: 1, required: true },
        price: { type: Number, min: 0, required: true },
        status: { type: String, default: "Pending" },
        reason: { type: String, default: "" },
        discountPrice: { type: Number, default: 0 },
        couponCode: { type: String },
        referralCode: { type: String }
    }],
    coupon: {
        couponCode: { type: String },
        discount: { type: Number }
    },
    totalQuantity: { type: Number, min: 1, required: true },
    totalPrice: { type: Number, min: 0, required: true },
    address: {
        user: {
            type: Schema.Types.ObjectId,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        phoneNo: {
            type: Number
        },
        pincode: {
            type: Number
        },
        locality: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        city: {
            type: String
        },
        state: {
            type: String,
            required: true
        },
        landmark: {
            type: String
        },
        alternateNo: {
            type: Number
        }
    },
    paymentMethod: { type: String, required: true },
    orderDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

// Pre-save hook to set orderDate and createdAt fields using Moment.js
orderSchema.pre('save', function (next) {
    const now = moment().tz("Asia/Kolkata");
    this.orderDate = now.toDate();
    this.createdAt = now.toDate();
    next();
});

const ordersCollection = mongoose.model('Order', orderSchema);

module.exports = ordersCollection;
