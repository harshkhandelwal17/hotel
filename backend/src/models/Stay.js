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
  // GST Tax details for this reservation
  gstApplied: {
    type: Boolean,
    default: false
  },
  gstType: {
    type: String,
    enum: ['none', 'exclusive', 'inclusive'],
    default: 'none'
  },
  gstRate: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  // Corporate Billing details
  companyName: {
    type: String,
    trim: true,
    default: ''
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  billingAddress: {
    type: String,
    trim: true,
    default: ''
  },
  // Itemised extra charges (food, water, laundry, damage...)
  charges: [{
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Food', 'Beverage', 'Laundry', 'Extra Bed', 'Damage', 'Late Checkout', 'Other'],
      default: 'Other'
    },
    quantity: { type: Number, default: 1 },
    amount: { type: Number, required: true }, // total for the line (qty * rate)
    date: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.ObjectId, ref: 'User' }
  }],
  // Room shift audit trail
  roomHistory: [{
    fromRoom: { type: mongoose.Schema.ObjectId, ref: 'Room' },
    toRoom: { type: mongoose.Schema.ObjectId, ref: 'Room' },
    fromRoomNumber: String,
    toRoomNumber: String,
    reason: String,
    priceAdjustment: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    shiftedBy: { type: mongoose.Schema.ObjectId, ref: 'User' }
  }],
  commissionTo: {
    type: String,
    trim: true
  },
  commissionPhone: {
    type: String,
    trim: true,
    default: ''
  },
  commissionAmount: {
    type: Number,
    default: 0
  },
  // Group Booking fields (for multi-room corporate / family bookings)
  groupId: {
    type: String,
    trim: true,
    index: true,
    default: null
  },
  groupName: {
    type: String,
    trim: true,
    default: ''
  },
  groupType: {
    type: String,
    enum: ['Corporate', 'Family', 'Tour', 'Event', 'Other', ''],
    default: ''
  },
  isGroupLeader: {
    type: Boolean,
    default: false
  },
  groupTotalRooms: {
    type: Number,
    default: 1
  },
  billingType: {
    type: String,
    enum: ['individual', 'group_master'],
    default: 'group_master'
  },
  // Cancellation and Refund Details
  cancellationReason: {
    type: String,
    trim: true,
    default: ''
  },
  cancellationCharge: {
    type: Number,
    default: 0
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundPaymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Wallet', 'Other', ''],
    default: ''
  },
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
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
staySchema.index({ room: 1, status: 1, checkInDate: 1, expectedCheckOutDate: 1 });
staySchema.index({ status: 1 });
staySchema.index({ checkInDate: 1 });
staySchema.index({ expectedCheckOutDate: 1 });
staySchema.index({ hostel: 1, status: 1 });
staySchema.index({ hostel: 1, status: 1, expectedCheckOutDate: -1 });
staySchema.index({ hostel: 1, expectedCheckOutDate: -1 });
staySchema.index({ hostel: 1, createdAt: -1 });
staySchema.index({ hostel: 1, checkInDate: 1 });
staySchema.index({ hostel: 1, expectedCheckOutDate: 1, status: 1 });
staySchema.index({ hostel: 1, groupId: 1 });

module.exports = mongoose.model('Stay', staySchema);

