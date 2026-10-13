const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a hostel name'],
    trim: true,
    maxlength: [100, 'Name can not be more than 100 characters']
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  contactNumber: {
    type: String,
    required: [true, 'Please add a contact number']
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  description: {
    type: String,
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  aiOcrEnabled: {
    type: Boolean,
    default: false
  },
  whatsappSyncEnabled: {
    type: Boolean,
    default: false
  },
  whatsappStatus: {
    type: String,
    enum: ['disconnected', 'connecting', 'connected'],
    default: 'disconnected'
  },
  whatsappPhone: {
    type: String,
    default: ''
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  // 🎟️ SUBSCRIPTION & BILLING PLAN DETAILS
  plan: {
    type: String,
    enum: ['demo', 'starter', 'professional', 'enterprise'],
    default: 'demo'
  },
  planStatus: {
    type: String,
    enum: ['trial', 'active', 'expired', 'cancelled'],
    default: 'trial'
  },
  planStartDate: {
    type: Date,
    default: Date.now
  },
  planEndDate: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7-day demo
  },
  planPrice: {
    type: Number,
    default: 0
  },
  billingCycle: {
    type: String,
    enum: ['trial', 'monthly', 'quarterly', 'yearly', 'lifetime'],
    default: 'trial'
  },
  maxRooms: {
    type: Number,
    default: 20
  },
  planNotes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Hostel', hostelSchema);
