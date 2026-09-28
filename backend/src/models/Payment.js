const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  stay: {
    type: mongoose.Schema.ObjectId,
    ref: 'Stay',
    required: true
  },
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
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'],
    required: true
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  transactionId: String,
  notes: String,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

paymentSchema.index({ stay: 1 });
paymentSchema.index({ guest: 1 });
paymentSchema.index({ hostel: 1 });
paymentSchema.index({ paymentDate: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
