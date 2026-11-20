const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.ObjectId,
    ref: 'MenuItem'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const restaurantOrderSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    trim: true,
    index: true
  },
  orderType: {
    type: String,
    enum: ['Room Service', 'Dine-In', 'Takeaway', 'Quick Counter'],
    default: 'Room Service'
  },
  tableOrRoom: {
    type: String,
    trim: true,
    default: ''
  },
  stay: {
    type: mongoose.Schema.ObjectId,
    ref: 'Stay',
    index: true
  },
  guestName: {
    type: String,
    trim: true,
    default: 'Walk-in Guest'
  },
  guestPhone: {
    type: String,
    trim: true,
    default: ''
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  taxPercent: {
    type: Number,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Charged to Room', 'Pending'],
    default: 'Paid',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Room Folio', 'Other'],
    default: 'Cash'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  billedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

restaurantOrderSchema.index({ hostel: 1, createdAt: -1 });
restaurantOrderSchema.index({ hostel: 1, paymentStatus: 1 });

restaurantOrderSchema.pre('save', function () {
  if (!this.orderNumber) {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `POS-${dateStr}-${rand}`;
  }
});

module.exports = mongoose.model('RestaurantOrder', restaurantOrderSchema);
