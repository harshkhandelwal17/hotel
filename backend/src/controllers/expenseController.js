const Expense = require('../models/Expense');
const Hostel = require('../models/Hostel');
const mongoose = require('mongoose');

// @desc    Get all expenses with filters (hostel, date range, paymentMethod, category)
// @route   GET /api/expenses
// @access  Private
exports.getExpenses = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      filter.hostel = req.user.assignedHostel;
    } else if (req.user.role === 'admin') {
      const myHostels = await Hostel.find({ owner: req.user.id }).select('_id');
      const hostelIds = myHostels.map(h => h._id);

      if (req.query.hostel && req.query.hostel !== 'all') {
        if (!hostelIds.some(id => id.toString() === req.query.hostel)) {
          return res.status(403).json({ success: false, message: 'Not authorized for this property' });
        }
        filter.hostel = new mongoose.Types.ObjectId(req.query.hostel);
      } else {
        filter.hostel = { $in: hostelIds };
      }
    } else if (req.user.role === 'superadmin') {
      if (req.query.hostel && req.query.hostel !== 'all') {
        filter.hostel = new mongoose.Types.ObjectId(req.query.hostel);
      }
    }

    if (req.query.paymentMethod && req.query.paymentMethod !== 'all') {
      filter.paymentMethod = req.query.paymentMethod;
    }

    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.expenseDate = {};
      if (req.query.startDate) filter.expenseDate.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.expenseDate.$lte = new Date(req.query.endDate);
    }

    const expenses = await Expense.find(filter)
      .populate('hostel', 'name')
      .populate('createdBy', 'name role')
      .sort({ expenseDate: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
exports.createExpense = async (req, res, next) => {
  try {
    const { title, amount, category, paymentMethod, expenseDate, notes, receiptUrl, hostel } = req.body;

    let targetHostel = hostel || req.user.assignedHostel;
    if (!targetHostel) {
      return res.status(400).json({ success: false, message: 'Hostel/Property is required' });
    }

    // Verify admin owns property if role is admin
    if (req.user.role === 'admin') {
      const owned = await Hostel.findOne({ _id: targetHostel, owner: req.user.id });
      if (!owned) {
        return res.status(403).json({ success: false, message: 'Not authorized to add expense for this property' });
      }
    }

    const expense = await Expense.create({
      hostel: targetHostel,
      title: (title || '').trim(),
      amount: Number(amount) || 0,
      category: category || 'Miscellaneous',
      paymentMethod: paymentMethod || 'Cash',
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      notes: (notes || '').trim(),
      receiptUrl: receiptUrl || '',
      createdBy: req.user.id
    });

    const populated = await Expense.findById(expense._id)
      .populate('hostel', 'name')
      .populate('createdBy', 'name role');

    res.status(201).json({
      success: true,
      data: populated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
exports.updateExpense = async (req, res, next) => {
  try {
    let expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (req.user.role === 'admin') {
      const owned = await Hostel.findOne({ _id: expense.hostel, owner: req.user.id });
      if (!owned) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify expense for this property' });
      }
    } else if (req.user.role !== 'superadmin') {
      if (expense.hostel.toString() !== (req.user.assignedHostel ? req.user.assignedHostel.toString() : '')) {
        return res.status(403).json({ success: false, message: 'Not authorized for this property' });
      }
    }

    const { title, amount, category, paymentMethod, expenseDate, notes, receiptUrl } = req.body;

    if (title !== undefined) expense.title = title.trim();
    if (amount !== undefined) expense.amount = Number(amount) || 0;
    if (category !== undefined) expense.category = category;
    if (paymentMethod !== undefined) expense.paymentMethod = paymentMethod;
    if (expenseDate !== undefined) expense.expenseDate = new Date(expenseDate);
    if (notes !== undefined) expense.notes = notes;
    if (receiptUrl !== undefined) expense.receiptUrl = receiptUrl;

    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('hostel', 'name')
      .populate('createdBy', 'name role');

    res.status(200).json({
      success: true,
      data: populated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    if (req.user.role === 'admin') {
      const owned = await Hostel.findOne({ _id: expense.hostel, owner: req.user.id });
      if (!owned) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete expense for this property' });
      }
    } else if (req.user.role !== 'superadmin') {
      if (expense.hostel.toString() !== (req.user.assignedHostel ? req.user.assignedHostel.toString() : '')) {
        return res.status(403).json({ success: false, message: 'Not authorized for this property' });
      }
    }

    await expense.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    next(err);
  }
};
