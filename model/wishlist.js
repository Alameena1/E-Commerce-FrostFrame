const mongoose = require('mongoose');
const {Schema,Types} = mongoose;
const objectId = Types.ObjectId;

const wishlistItemSchema = new mongoose.Schema({
    
  userId : {
      type : String,
  },
  productId :{
    type: Types.ObjectId,
  },
  productName: {
    type: String,
  },
  productImage: {
    type: [String],
  },
  price: {
    type: Number,
  },
  stock:{
    type: Number,
  },
  addedAt: {
    type: Date,
    default: Date.now
  }

});

const Wishlist = mongoose.model('Wishlist',wishlistItemSchema);

module.exports = Wishlist;