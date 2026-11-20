const mongoose = require('mongoose');

const registerEntrySchema = new mongoose.Schema({
  srNo: {
    type: Number,
    default: 1
  },
  roomNo: {
    type: String,
    trim: true,
    default: ''
  },
  bid: {
    type: String, // Booking ID / Bill ID
    trim: true,
    default: ''
  },
  guestName: {
    type: String, // Guest Name / Particulars / Vendor Name
    trim: true,
    required: [true, 'Guest Name or Description is required']
  },
  cashAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  cardAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  onlineAmount: {
    type: Number, // Fab / UPI / OTA / Online
    default: 0,
    min: 0
  },
  foodCashAmount: {
    type: Number, // Food CASH
    default: 0,
    min: 0
  },
  expenseTitle: {
    type: String, // E X P (Expense reason/item)
    trim: true,
    default: ''
  },
  expenseAmount: {
    type: Number, // Amt (Expense amount)
    default: 0,
    min: 0
  },
  expenseCategory: {
    type: String,
    enum: [
      'Food & Groceries',
      'Cleaning & Housekeeping',
      'Maintenance & Repairs',
      'Electricity & Utility',
      'Staff Salary / Advance',
      'Water Supply',
      'Laundry Expense',
      'Owner Drawing / Transfer',
      'Miscellaneous',
      'General'
    ],
    default: 'General'
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'],
    default: 'Cash'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  source: {
    type: String,
    enum: ['manual', 'synced_stay', 'synced_expense', 'synced_payment'],
    default: 'manual'
  },
  relatedStay: {
    type: mongoose.Schema.ObjectId,
    ref: 'Stay'
  },
  relatedPayment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Payment'
  },
  relatedExpense: {
    type: mongoose.Schema.ObjectId,
    ref: 'Expense'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const dailyRegisterSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.ObjectId,
    ref: 'Hostel',
    required: true,
    index: true
  },
  date: {
    type: String, // "YYYY-MM-DD" format
    required: true,
    index: true
  },
  headerMantraLeft: {
    type: String,
    default: 'जय श्री श्याम'
  },
  headerMantraCenter: {
    type: String,
    default: 'श्री गणेशाय नम:'
  },
  headerMantraRight: {
    type: String,
    default: 'सीता राम'
  },
  openingBalance: {
    type: Number,
    default: 0
  },
  isOpeningBalanceManual: {
    type: Boolean,
    default: false
  },
  entries: [registerEntrySchema],
  closingNotes: {
    type: String,
    trim: true,
    default: ''
  },
  isClosed: {
    type: Boolean,
    default: false
  },
  closedAt: Date,
  closedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

dailyRegisterSchema.index({ hostel: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyRegister', dailyRegisterSchema);
