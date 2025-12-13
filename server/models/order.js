const Mongoose = require('mongoose');
const { Schema } = Mongoose;

// Order Schema
const OrderSchema = new Schema({
  cart: {
    type: Schema.Types.ObjectId,
    ref: 'Cart'
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  total: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  // Shipping address information (dari checkout)
  shippingAddress: {
    fullName: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    cityId: {
      type: String,
      default: ''
    },
    cityName: {
      type: String,
      default: ''
    },
    provinceId: {
      type: String,
      default: ''
    },
    provinceName: {
      type: String,
      default: ''
    },
    districtId: {
      type: String,
      default: ''
    },
    districtName: {
      type: String,
      default: ''
    },
    postalCode: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: 'Indonesia'
    }
  },
  // Shipping information
  shipping: {
    courier: {
      type: String,
      default: ''
    },
    service: {
      type: String,
      default: ''
    },
    airwayBill: {
      type: String,
      default: ''
    },
    cost: {
      type: Number,
      default: 0
    },
    komerceOrderId: {
      type: String,
      default: ''
    },
    labelPrintedAt: {
      type: Date
    }
  },
  updated: Date,
  created: {
    type: Date,
    default: Date.now
  }
});

module.exports = Mongoose.model('Order', OrderSchema);
