const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please enter item name'],
    trim: true
  },
  itemCode: {
    type: String,
    trim: true,
    uppercase: true,
    default: ''
  },
  category: {
    type: String,
    required: [true, 'Please enter category'],
    trim: true,
    default: 'Main Course'
  },
  price: {
    type: Number,
    required: [true, 'Please enter price'],
    min: [0, 'Price cannot be negative']
  },
  isVeg: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

menuItemSchema.index({ hostel: 1, category: 1 });
menuItemSchema.index({ hostel: 1, itemCode: 1 });
menuItemSchema.index({ hostel: 1, isAvailable: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
