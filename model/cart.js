const mongoose = require ('mongoose')
// // require("dotenv").config();
// require('dotenv').config()
// mongoose.connect(mongodb://${process.env.LOCALHOST})
// // mongoose.connect(mongodb://localhost:${process.env.DBport}/try1)
// .then(()=>{
//     console.log("mongodb connected");
// })
// .catch(()=>{
//     console.log("Failed to connect3");
// })
const cartSchema =new mongoose.Schema({
    userId:{
        type:String,
        required:true,
    },
    items:[{
        productId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"product",
            required:true,
        },
        quantity:{
            type:Number,
            required:true,
            default:1,
        },
    }],
});
const Cart = mongoose.model('carts',cartSchema);

module.exports=Cart