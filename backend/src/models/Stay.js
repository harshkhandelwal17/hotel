const mongoose = require('mongoose');

const staySchema = new mongoose.Schema({
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
  room: {
    type: mongoose.Schema.ObjectId,
    ref: 'Room',
    required: true
  },
  bed: {
    type: mongoose.Schema.ObjectId,
    ref: 'Bed'
  },
  occupants: {
    type: Number,
    default: 1
  },
  coGuests: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Guest'
  }],
  checkInDate: {
    type: Date,
    required: true
  },
  expectedCheckOutDate: {
    type: Date,
    required: true
  },
  actualCheckOutDate: Date,
  status: {
    type: String,
    enum: ['Upcoming', 'Active', 'Checkout Due', 'Overdue', 'Checked Out', 'Cancelled'],
    default: 'Active'
  },
  durationOption: {
    type: String,
    default: '24h'
  },
  basePrice: { // Deprecated but kept for backward compatibility
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  additionalCharges: {
    type: Number,
    default: 0
  },
  commissionTo: {
    type: String,
    trim: true
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

staySchema.index({ guest: 1 });
staySchema.index({ hostel: 1 });
staySchema.index({ room: 1 });
staySchema.index({ status: 1 });
staySchema.index({ checkInDate: 1 });
staySchema.index({ expectedCheckOutDate: 1 });

module.exports = mongoose.model('Stay', staySchema);

