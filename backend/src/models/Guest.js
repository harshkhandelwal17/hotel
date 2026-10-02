const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please add a full name'],
    trim: true
  },
  mobileNumber: {
    type: String,
    sparse: true,
    unique: true
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
  dateOfBirth: Date,
  address: String,
  emergencyContactName: String,
  emergencyContactNumber: String,
  notes: String,
  hostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: true
  }
}, { timestamps: true });



module.exports = mongoose.model('Guest', guestSchema);
