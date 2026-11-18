const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  hostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: true,
    index: true
  },
  stay: {
    type: mongoose.Schema.ObjectId,
    ref: 'Stay'
  },
  type: {
    type: String,
    enum: ['checkin', 'checkout', 'payment', 'system'],
    default: 'checkin'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  metadata: {
    hotelName: { type: String, default: '' },
    roomNumber: { type: String, default: '' },
    guestName: { type: String, default: '' },
    guestPhone: { type: String, default: '' },
    totalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    stayId: { type: String, default: '' }
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
