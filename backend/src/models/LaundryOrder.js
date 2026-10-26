const mongoose = require('mongoose');

const laundryItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  sentCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  receivedCount: {
    type: Number,
    min: 0,
    default: 0
  },
  damagedOrMissingCount: {
    type: Number,
    min: 0,
    default: 0
  },
  ratePerPiece: {
    type: Number,
    min: 0,
    default: 0
  },
  totalCost: {
    type: Number,
    min: 0,
    default: 0
  }
}, { _id: false });

const laundryOrderSchema = new mongoose.Schema({
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
  vendorName: {
    type: String,
    required: [true, 'Please enter vendor or dhobi name'],
    trim: true
  },
  vendorPhone: {
    type: String,
    trim: true,
    default: ''
  },
  sentDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  expectedReturnDate: {
    type: Date
  },
  receivedDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Sent', 'Received', 'Cancelled'],
    default: 'Sent',
    index: true
  },
  items: [laundryItemSchema],
  totalPiecesSent: {
    type: Number,
    default: 0
  },
  totalPiecesReceived: {
    type: Number,
    default: 0
  },
  totalPiecesMissing: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Unpaid', 'Partial', 'Paid'],
    default: 'Unpaid',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Other'],
    default: 'Cash'
  },
  paymentDate: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  },
  dispatchedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  receivedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Auto-generate orderNumber before saving if not present
laundryOrderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `LD-${dateStr}-${rand}`;
  }
  next();
});

module.exports = mongoose.model('LaundryOrder', laundryOrderSchema);
