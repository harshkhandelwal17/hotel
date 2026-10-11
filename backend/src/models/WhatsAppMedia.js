const mongoose = require('mongoose');

const whatsAppMediaSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: true,
    index: true
  },
  senderPhone: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  senderName: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    required: true
  },
  messageId: {
    type: String,
    index: true
  },
  messageTimestamp: {
    type: Date,
    default: Date.now,
    expires: 86400 * 3 // Auto-expires after 3 days to keep DB compact
  },
  status: {
    type: String,
    enum: ['new', 'used'],
    default: 'new'
  }
}, { timestamps: true });

module.exports = mongoose.model('WhatsAppMedia', whatsAppMediaSchema);

