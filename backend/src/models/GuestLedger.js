const mongoose = require('mongoose');

const guestLedgerSchema = new mongoose.Schema({
  guest: {
    type: mongoose.Schema.ObjectId,
    ref: 'Guest',
    required: true
  },
  hostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: true
  },
  stay: {
    type: mongoose.Schema.ObjectId,
    ref: 'Stay'
  },
  entryType: {
    type: String,
    enum: ['DEPOSIT', 'PAYMENT', 'STAY_CHARGE', 'WALLET_DEDUCTION', 'ADJUSTMENT'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Wallet', 'Khata', 'Mixed', 'Other', 'System'],
    default: 'Cash'
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

guestLedgerSchema.index({ guest: 1, date: -1 });
guestLedgerSchema.index({ hostel: 1, date: -1 });
guestLedgerSchema.index({ hostel: 1, entryType: 1 });
guestLedgerSchema.index({ stay: 1 });

module.exports = mongoose.model('GuestLedger', guestLedgerSchema);

