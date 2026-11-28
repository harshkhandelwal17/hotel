const mongoose = require('mongoose');
const crypto = require('crypto');

const otaConfigSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: true,
    unique: true,
    index: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  secretToken: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(16).toString('hex')
  },
  inboundEmailKey: {
    type: String,
    unique: true,
    sparse: true,
    default: () => 'ota_' + crypto.randomBytes(6).toString('hex')
  },
  channels: [
    {
      name: {
        type: String,
        enum: ['MakeMyTrip', 'Goibibo', 'Booking.com', 'Agoda', 'Airbnb', 'Other'],
        required: true
      },
      enabled: {
        type: Boolean,
        default: true
      },
      externalIcalUrl: {
        type: String,
        trim: true,
        default: ''
      },
      lastSyncAt: Date,
      syncStatus: {
        type: String,
        enum: ['active', 'error', 'pending'],
        default: 'pending'
      },
      lastError: String
    }
  ],
  roomMappings: [
    {
      otaCategoryName: {
        type: String,
        required: true,
        trim: true
      },
      category: {
        type: String,
        required: true,
        trim: true
      },
      assignedRooms: [
        {
          type: mongoose.Schema.ObjectId,
          ref: 'Room'
        }
      ]
    }
  ],
  autoWhatsAppWelcome: {
    type: Boolean,
    default: true
  },
  autoAssignRooms: {
    type: Boolean,
    default: true
  },
  logs: [
    {
      source: {
        type: String,
        default: 'System'
      },
      action: {
        type: String,
        default: 'info'
      },
      bookingNumber: String,
      guestName: String,
      message: String,
      status: {
        type: String,
        enum: ['success', 'warning', 'error'],
        default: 'success'
      },
      rawSnippet: String,
      stay: {
        type: mongoose.Schema.ObjectId,
        ref: 'Stay'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

// Ensure secretToken and inboundEmailKey are created if missing
otaConfigSchema.pre('save', function (next) {
  if (!this.secretToken) {
    this.secretToken = crypto.randomBytes(16).toString('hex');
  }
  if (!this.inboundEmailKey) {
    this.inboundEmailKey = 'ota_' + crypto.randomBytes(6).toString('hex');
  }
  next();
});

module.exports = mongoose.model('OtaConfig', otaConfigSchema);
