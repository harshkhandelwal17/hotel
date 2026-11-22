const mongoose = require('mongoose');

/**
 * DeletedArchive Model (Safety Recycle Bin)
 * 
 * Protects against accidental deletion of Stays, Payments, Expenses, and Rooms.
 * Whenever a record is deleted, its full JSON payload + related records are archived here.
 * 
 * Auto-expires after 90 days to maintain MongoDB Atlas 512MB free tier limit.
 */
const deletedArchiveSchema = new mongoose.Schema({
  modelName: {
    type: String,
    required: true,
    index: true
  },
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  relatedData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedByName: {
    type: String,
    default: ''
  },
  deletedByEmail: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    default: ''
  },
  deletedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Auto-cleanup after 90 days to preserve MongoDB 512MB free tier storage
deletedArchiveSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('DeletedArchive', deletedArchiveSchema);
