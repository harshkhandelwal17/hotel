const mongoose = require('mongoose');

const salesLeadSchema = new mongoose.Schema({
  salesAgent: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  hotelName: {
    type: String,
    required: [true, 'Please add hotel name'],
    trim: true
  },
  contactPerson: {
    type: String,
    required: [true, 'Please add contact person name'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Please add contact phone number'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  city: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  roomCount: {
    type: Number,
    default: 15
  },
  currentSystem: {
    type: String,
    enum: ['Paper Register', 'Excel / Sheets', 'Old Desktop Software', 'Other Cloud SaaS', 'None'],
    default: 'Paper Register'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'demo_scheduled', 'demo_completed', 'negotiation', 'won', 'lost'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'hot'],
    default: 'medium'
  },
  nextFollowUpDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  followUpHistory: [{
    note: { type: String, required: true },
    followUpDate: { type: Date },
    status: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  estimatedValue: {
    type: Number,
    default: 2499
  },
  convertedHostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel'
  },
  convertedAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('SalesLead', salesLeadSchema);
