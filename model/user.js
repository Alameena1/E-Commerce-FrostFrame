const mongoose = require("mongoose")
const Schema = mongoose.Schema

const userschema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String

    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    googleid: {
        type: String

    },
    is_verified: {
        type: Number,
        default: 0
    },
    referralCode: {
        type: String
    },
    refferedCode: {
        type: String
    },
    token: {
        type: String,
        default: ''
    },
    phone: {
        type: Number,
    },
    wallet: {
        balance: {
            type: Number,
            default: 0
        },
        transactions: [{
            amount: {
                type: Number
            },
            description: {
                type: String
            },
            date: {
                type: Date,
                default: Date.now
            }
        }]
    }



},
{ timestamps: true })


const user = mongoose.model('User', userschema);
module.exports = user;
