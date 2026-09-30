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
  }
}, { timestamps: true });

// Prevent duplicate room numbers in the same hostel
roomSchema.index({ roomNumber: 1, hostel: 1 }, { unique: true });

module.exports = mongoose.model('Room', roomSchema);
