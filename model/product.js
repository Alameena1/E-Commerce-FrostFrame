const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productschema = new mongoose.Schema({
    name: {
        type: String,
    },
    description: {
        type: String,
        
      },

    category: {
      type: String,
      
    }, 
    productImages: {
        type: [String]
    },
    stock: {
        type: Number,
    },
    price: {
        type: Number,
    },
    offerprice: {
        type: Number,
       
      },
      isBlocked: {
        type: Boolean,
        default: false
    }

    
});

const productcollection = mongoose.model('product', productschema);
module.exports = productcollection;
