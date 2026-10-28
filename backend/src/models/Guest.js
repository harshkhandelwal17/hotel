const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please add a full name'],
    trim: true
  },
  mobileNumber: {
    type: String,
    sparse: true
  },
  idProofType: {
    type: String,
    required: [true, 'Please add ID proof type'],
    enum: ['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'Other']
  },
  idProofNumber: {
    type: String
  },
  idProofImage: {
    type: String,
    default: ''
  },
  idProofImageBack: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  gender: String,
  dateOfBirth: String,
  address: String,
  emergencyContactName: String,
  emergencyContactNumber: String,
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
  notes: String,
  hostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: true
  }
}, { timestamps: true });

guestSchema.index({ hostel: 1, mobileNumber: 1 });
guestSchema.index({ hostel: 1, idProofNumber: 1 });
guestSchema.index({ hostel: 1, fullName: 1 });

module.exports = mongoose.model('Guest', guestSchema);
