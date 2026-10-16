const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Please add a room number'],
    trim: true
  },
  hostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: true
  },
  floor: {
    type: String,
    required: [true, 'Please add a floor']
  },
  roomType: {
    type: String,
    enum: ['Standard Single', 'Standard Double', 'Twin', 'Triple', 'Deluxe', 'Suite', 'Family Room'],
    default: 'Standard Double'
  },
  capacity: {
    type: Number,
    default: 2,
    min: 1
  },
  price12h: {
    type: Number,
    default: 0
  },
  price24h: {
    type: Number,
    default: 0
  },
  extraPerPerson12h: {
    type: Number,
    default: 0  // Extra charge per additional person for 12h stay
  },
  extraPerPerson24h: {
    type: Number,
    default: 0  // Extra charge per additional person per night
  },
  customRates: [{
    hours: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  status: {
    type: String,
    enum: ['Active', 'Maintenance', 'Inactive'],
    default: 'Active'
  },
  housekeepingStatus: {
    type: String,
    enum: ['Clean', 'Dirty', 'Cleaning'],
    default: 'Clean'
  },
  lastCleanedAt: Date,
  lastCleanedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  // Current maintenance details (only meaningful while status === 'Maintenance')
  maintenanceReason: String,
  maintenanceSince: Date,
  // Full log of every maintenance period
  maintenanceHistory: [{
    reason: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    startedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
    endedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
    note: String // what was fixed
  }]
}, { timestamps: true });

// Prevent duplicate room numbers in the same hostel & optimize queries
roomSchema.index({ hostel: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ hostel: 1, status: 1 });
roomSchema.index({ hostel: 1, floor: 1 });

module.exports = mongoose.model('Room', roomSchema);
