const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({

  userId:{
    type: String,
  },
  name: {
    type: String,
   
  },
  address: {
    type: String,
    
  },
  phone: {
    type: String,
   
  },
  locality: {
    type: String,
    
  },
  pincode: {
    type: String,
    
  },
  state: {
    type: String,
    
  },
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;