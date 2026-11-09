const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Expense title is required'],
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Food & Groceries',
      'Cleaning & Housekeeping',
      'Maintenance & Repairs',
      'Electricity & Utility',
      'Staff Salary / Advance',
      'Water Supply',
      'Internet & Software',
      'Laundry Expense',
      'Miscellaneous',
      'Other'
    ],
    default: 'Miscellaneous'
  },
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'],
    default: 'Cash'
  },
  expenseDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  receiptUrl: {
    type: String
  },
  laundryOrder: {
    type: mongoose.Schema.ObjectId,
    ref: 'LaundryOrder'
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

expenseSchema.index({ hostel: 1, expenseDate: -1 });
expenseSchema.index({ hostel: 1, paymentMethod: 1 });
expenseSchema.index({ expenseDate: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
