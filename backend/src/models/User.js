const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'receptionist', 'sales'],
    default: 'receptionist'
  },
  assignedHostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: function() {
      return this.role === 'receptionist';
    }
  },
  onboardedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  monthlyTargetHotels: {
    type: Number,
    default: 10
  },
  commissionRate: {
    type: Number,
    default: 15 // 15% commission percentage
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tokenVersion: {
    type: Number,
    default: 0
  },
  pushSubscriptions: [{
    endpoint: { type: String, required: true },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    },
    userAgent: { type: String },
    subscribedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
