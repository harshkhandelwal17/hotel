const DailyRegister = require('../models/DailyRegister');
const Payment = require('../models/Payment');
const Stay = require('../models/Stay');
const Expense = require('../models/Expense');
const Hostel = require('../models/Hostel');
const mongoose = require('mongoose');

// Helper to get today's date string YYYY-MM-DD in IST (UTC+5:30)
function getTodayIST() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5));
  return istDate.toISOString().split('T')[0];
}

// Helper to safely extract a valid ObjectId string for Hostel
async function resolveTargetHostel(inputHostel, reqUser) {
  const extract = (val) => {
    if (!val) return null;
    if (typeof val === 'object') {
      if (val._id) return val._id.toString();
      if (val.id) return val.id.toString();
      return null;
    }
    if (typeof val === 'string') {
      const s = val.trim();
      if (!s || s === '[object Object]' || s === 'all' || s === 'undefined' || s === 'null') {
        return null;
      }
      return s;
    }
    return null;
  };

  let id = extract(inputHostel) || extract(reqUser?.assignedHostel);
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    return id;
  }

  // If user is owner/admin, find first hostel owned by them
  if (reqUser) {
    const uid = reqUser.id || reqUser._id;
    if (uid && mongoose.Types.ObjectId.isValid(uid)) {
      const owned = await Hostel.findOne({ owner: uid }).select('_id');
      if (owned) return owned._id.toString();
    }
  }

  // Fallback to first available hostel in database
  const anyHostel = await Hostel.findOne().select('_id');
  if (anyHostel) return anyHostel._id.toString();

  return null;
}

// Helper to calculate previous day closing cash
async function calculatePreviousClosingCash(hostelId, currentDateStr) {
  const prevDoc = await DailyRegister.findOne({
    hostel: hostelId,
    date: { $lt: currentDateStr }
  }).sort({ date: -1 });

  if (!prevDoc) return 0;

  let cashIn = 0;
  let foodCash = 0;
  let cashExp = 0;

  (prevDoc.entries || []).forEach(e => {
    cashIn += (e.cashAmount || 0);
    foodCash += (e.foodCashAmount || 0);
    if ((e.paymentMode || 'Cash').toLowerCase() === 'cash') {
      cashExp += (e.expenseAmount || 0);
    }
  });

  const closing = (prevDoc.openingBalance || 0) + cashIn + foodCash - cashExp;
  return Math.max(0, closing);
}

// Helper to compute summary stats
function computeSummary(registerDoc) {
  const opening = registerDoc.openingBalance || 0;
  let totalCash = 0;
  let totalCard = 0;
  let totalOnline = 0;
  let totalFoodCash = 0;
  let totalExpense = 0;
  let cashExpense = 0;
  let onlineExpense = 0;

  (registerDoc.entries || []).forEach(e => {
    totalCash += (e.cashAmount || 0);
    totalCard += (e.cardAmount || 0);
    totalOnline += (e.onlineAmount || 0);
    totalFoodCash += (e.foodCashAmount || 0);
    totalExpense += (e.expenseAmount || 0);

    const mode = (e.paymentMode || 'Cash').toLowerCase();
    if (mode === 'cash') {
      cashExpense += (e.expenseAmount || 0);
    } else {
      onlineExpense += (e.expenseAmount || 0);
    }
  });

  const totalCashIn = totalCash + totalFoodCash;
  const totalIncome = totalCashIn + totalCard + totalOnline;
  const closingCash = opening + totalCashIn - cashExpense;
  const netDayProfit = totalIncome - totalExpense;

  return {
    openingBalance: opening,
    totalCash,
    totalCard,
    totalOnline,
    totalFoodCash,
    totalCashIn,
    totalIncome,
    totalExpense,
    cashExpense,
    onlineExpense,
    closingCash,
    netDayProfit,
    netDayBalance: netDayProfit,
    entryCount: (registerDoc.entries || []).length
  };
}

// @desc    Get Daily Register for a specific date & hostel
// @route   GET /api/daily-register
// @access  Private
exports.getRegister = async (req, res, next) => {
  try {
    const { hostel, date } = req.query;
    const targetHostel = await resolveTargetHostel(hostel, req.user);

    if (!targetHostel) {
      return res.status(400).json({ success: false, message: 'Property/Hostel ID is required' });
    }

    const queryDate = date || getTodayIST();

    let register = await DailyRegister.findOne({
      hostel: targetHostel,
      date: queryDate
    });

    if (!register) {
      // Find previous day's closing cash to carry forward as Opening Balance
      const autoOpening = await calculatePreviousClosingCash(targetHostel, queryDate);

      register = await DailyRegister.create({
        hostel: targetHostel,
        date: queryDate,
        openingBalance: autoOpening,
        isOpeningBalanceManual: false,
        entries: [],
        lastUpdatedBy: req.user.id
      });
    } else if (!register.isOpeningBalanceManual) {
      // If opening balance was not manually overridden by user, re-sync from previous day
      const autoOpening = await calculatePreviousClosingCash(targetHostel, queryDate);
      if (register.openingBalance !== autoOpening) {
        register.openingBalance = autoOpening;
        await register.save();
      }
    }

    const summary = computeSummary(register);

    res.status(200).json({
      success: true,
      data: register,
      summary
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update Opening Balance manually
// @route   PUT /api/daily-register/opening-balance
// @access  Private
exports.updateOpeningBalance = async (req, res, next) => {
  try {
    const { hostel, date, openingBalance } = req.body;
    const targetHostel = await resolveTargetHostel(hostel, req.user);
    if (!targetHostel) {
      return res.status(400).json({ success: false, message: 'Property/Hostel ID is required' });
    }
    const queryDate = date || getTodayIST();

    let register = await DailyRegister.findOne({
      hostel: targetHostel,
      date: queryDate
    });

    if (!register) {
      register = new DailyRegister({
        hostel: targetHostel,
        date: queryDate,
        entries: []
      });
    }

    register.openingBalance = Number(openingBalance) || 0;
    register.isOpeningBalanceManual = true;
    register.lastUpdatedBy = req.user.id;
    await register.save();

    const summary = computeSummary(register);

    res.status(200).json({
      success: true,
      data: register,
      summary
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update Header Mantras
// @route   PUT /api/daily-register/mantras
// @access  Private
exports.updateHeaderMantras = async (req, res, next) => {
  try {
    const { hostel, date, headerMantraLeft, headerMantraCenter, headerMantraRight } = req.body;
    const targetHostel = await resolveTargetHostel(hostel, req.user);
    if (!targetHostel) {
      return res.status(400).json({ success: false, message: 'Property/Hostel ID is required' });
    }
    const queryDate = date || getTodayIST();

    let register = await DailyRegister.findOne({ hostel: targetHostel, date: queryDate });
    if (!register) {
      const autoOpening = await calculatePreviousClosingCash(targetHostel, queryDate);
      register = new DailyRegister({
        hostel: targetHostel,
        date: queryDate,
        openingBalance: autoOpening,
        entries: []
      });
    }

    if (headerMantraLeft !== undefined) register.headerMantraLeft = headerMantraLeft;
    if (headerMantraCenter !== undefined) register.headerMantraCenter = headerMantraCenter;
    if (headerMantraRight !== undefined) register.headerMantraRight = headerMantraRight;
    register.lastUpdatedBy = req.user.id;

    await register.save();

    res.status(200).json({
      success: true,
      data: register,
      summary: computeSummary(register)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add new manual or synced entry
// @route   POST /api/daily-register/entry
// @access  Private
exports.addEntry = async (req, res, next) => {
  try {
    const {
      hostel,
      date,
      roomNo,
      bid,
      guestName,
      cashAmount,
      cardAmount,
      onlineAmount,
      foodCashAmount,
      expenseTitle,
      expenseAmount,
      expenseCategory,
      paymentMode,
      notes,
      source
    } = req.body;

    const targetHostel = await resolveTargetHostel(hostel, req.user);
    if (!targetHostel) {
      return res.status(400).json({ success: false, message: 'Property/Hostel ID is required' });
    }
    const queryDate = date || getTodayIST();

    let register = await DailyRegister.findOne({ hostel: targetHostel, date: queryDate });
    if (!register) {
      const autoOpening = await calculatePreviousClosingCash(targetHostel, queryDate);
      register = new DailyRegister({
        hostel: targetHostel,
        date: queryDate,
        openingBalance: autoOpening,
        entries: []
      });
    }

    const nextSrNo = (register.entries.length > 0)
      ? Math.max(...register.entries.map(e => e.srNo || 0)) + 1
      : 1;

    register.entries.push({
      srNo: nextSrNo,
      roomNo: (roomNo || '').trim(),
      bid: (bid || '').trim(),
      guestName: (guestName || '').trim() || (expenseTitle ? `EXP: ${expenseTitle}` : 'Manual Entry'),
      cashAmount: Number(cashAmount) || 0,
      cardAmount: Number(cardAmount) || 0,
      onlineAmount: Number(onlineAmount) || 0,
      foodCashAmount: Number(foodCashAmount) || 0,
      expenseTitle: (expenseTitle || '').trim(),
      expenseAmount: Number(expenseAmount) || 0,
      expenseCategory: expenseCategory || 'General',
      paymentMode: paymentMode || 'Cash',
      notes: (notes || '').trim(),
      source: source || 'manual'
    });

    register.lastUpdatedBy = req.user.id;
    await register.save();

    res.status(201).json({
      success: true,
      data: register,
      summary: computeSummary(register)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update existing entry
// @route   PUT /api/daily-register/entry/:entryId
// @access  Private
exports.updateEntry = async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const {
      hostel,
      date,
      roomNo,
      bid,
      guestName,
      cashAmount,
      cardAmount,
      onlineAmount,
      foodCashAmount,
      expenseTitle,
      expenseAmount,
      expenseCategory,
      paymentMode,
      notes
    } = req.body;

    const targetHostel = await resolveTargetHostel(hostel, req.user);
    if (!targetHostel) {
      return res.status(400).json({ success: false, message: 'Property/Hostel ID is required' });
    }
    const queryDate = date || getTodayIST();

    const register = await DailyRegister.findOne({ hostel: targetHostel, date: queryDate });
    if (!register) {
      return res.status(404).json({ success: false, message: 'Daily Register not found' });
    }

    const entry = register.entries.id(entryId);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Register entry not found' });
    }

    if (roomNo !== undefined) entry.roomNo = roomNo.trim();
    if (bid !== undefined) entry.bid = bid.trim();
    if (guestName !== undefined) entry.guestName = guestName.trim();
    if (cashAmount !== undefined) entry.cashAmount = Number(cashAmount) || 0;
    if (cardAmount !== undefined) entry.cardAmount = Number(cardAmount) || 0;
    if (onlineAmount !== undefined) entry.onlineAmount = Number(onlineAmount) || 0;
    if (foodCashAmount !== undefined) entry.foodCashAmount = Number(foodCashAmount) || 0;
    if (expenseTitle !== undefined) entry.expenseTitle = expenseTitle.trim();
    if (expenseAmount !== undefined) entry.expenseAmount = Number(expenseAmount) || 0;
    if (expenseCategory !== undefined) entry.expenseCategory = expenseCategory;
    if (paymentMode !== undefined) entry.paymentMode = paymentMode;
    if (notes !== undefined) entry.notes = notes.trim();

    register.lastUpdatedBy = req.user.id;
    await register.save();

    res.status(200).json({
      success: true,
      data: register,
      summary: computeSummary(register)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete entry from register
// @route   DELETE /api/daily-register/entry/:entryId
// @access  Private
exports.deleteEntry = async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const { hostel, date } = req.query;
    const targetHostel = await resolveTargetHostel(hostel, req.user);
    if (!targetHostel) {
      return res.status(400).json({ success: false, message: 'Property/Hostel ID is required' });
    }
    const queryDate = date || getTodayIST();

    const register = await DailyRegister.findOne({ hostel: targetHostel, date: queryDate });
    if (!register) {
      return res.status(404).json({ success: false, message: 'Daily Register not found' });
    }

    register.entries.pull({ _id: entryId });
    register.lastUpdatedBy = req.user.id;
    await register.save();

    res.status(200).json({
      success: true,
      data: register,
      summary: computeSummary(register)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Auto-Sync today's hotel check-ins, payments & expenses from system into register
// @route   POST /api/daily-register/sync
// @access  Private
exports.syncFromSystem = async (req, res, next) => {
  try {
    const { hostel, date } = req.body;
    const targetHostel = await resolveTargetHostel(hostel, req.user);
    if (!targetHostel) {
      return res.status(400).json({ success: false, message: 'Property/Hostel ID is required' });
    }
    const queryDate = date || getTodayIST();

    let register = await DailyRegister.findOne({ hostel: targetHostel, date: queryDate });
    if (!register) {
      const autoOpening = await calculatePreviousClosingCash(targetHostel, queryDate);
      register = new DailyRegister({
        hostel: targetHostel,
        date: queryDate,
        openingBalance: autoOpening,
        entries: []
      });
    }

    // 1. Date window (India timezone safe)
    const dayStart = new Date(`${queryDate}T00:00:00.000+05:30`);
    const dayEnd = new Date(`${queryDate}T23:59:59.999+05:30`);

    // 2. Fetch Payments recorded on this date
    const payments = await Payment.find({
      hostel: targetHostel,
      paymentDate: { $gte: dayStart, $lte: dayEnd }
    })
      .populate({
        path: 'stay',
        select: 'room totalAmount paidAmount status checkInDate',
        populate: { path: 'room', select: 'roomNumber' }
      })
      .populate('guest', 'fullName mobileNumber');

    // Track which payments are already synced
    const existingPaymentIds = new Set(
      register.entries
        .filter(e => e.relatedPayment)
        .map(e => e.relatedPayment.toString())
    );

    let nextSrNo = register.entries.length > 0
      ? Math.max(...register.entries.map(e => e.srNo || 0)) + 1
      : 1;

    let addedCount = 0;

    for (const p of payments) {
      if (existingPaymentIds.has(p._id.toString())) continue;

      const roomNum = p.stay?.room?.roomNumber || '—';
      const guestName = p.guest?.fullName || 'Walk-in Guest';
      const bid = p.stay ? (p.stay._id.toString().slice(-6).toUpperCase()) : 'DIR';

      const method = (p.paymentMethod || 'Cash').toLowerCase();
      let cashAmt = 0;
      let cardAmt = 0;
      let onlineAmt = 0;

      if (method === 'cash') cashAmt = p.amount || 0;
      else if (method === 'card') cardAmt = p.amount || 0;
      else onlineAmt = p.amount || 0; // UPI, Fab, Bank Transfer, Online

      register.entries.push({
        srNo: nextSrNo++,
        roomNo: String(roomNum),
        bid: `BK-${bid}`,
        guestName,
        cashAmount: cashAmt,
        cardAmount: cardAmt,
        onlineAmount: onlineAmt,
        foodCashAmount: 0,
        expenseTitle: '',
        expenseAmount: 0,
        notes: p.notes || `Synced from Stay Payment`,
        source: 'synced_payment',
        relatedPayment: p._id,
        relatedStay: p.stay?._id
      });

      addedCount++;
    }

    // 3. Fetch Expenses recorded on this date
    const expenses = await Expense.find({
      hostel: targetHostel,
      expenseDate: { $gte: dayStart, $lte: dayEnd }
    });

    const existingExpenseIds = new Set(
      register.entries
        .filter(e => e.relatedExpense)
        .map(e => e.relatedExpense.toString())
    );

    for (const exp of expenses) {
      if (existingExpenseIds.has(exp._id.toString())) continue;

      const pMode = exp.paymentMethod || 'Cash';

      register.entries.push({
        srNo: nextSrNo++,
        roomNo: 'EXP',
        bid: '',
        guestName: exp.title || 'Operating Expense',
        cashAmount: 0,
        cardAmount: 0,
        onlineAmount: 0,
        foodCashAmount: 0,
        expenseTitle: exp.title || 'Expense',
        expenseAmount: exp.amount || 0,
        expenseCategory: exp.category || 'General',
        paymentMode: pMode,
        notes: exp.notes || '',
        source: 'synced_expense',
        relatedExpense: exp._id
      });

      addedCount++;
    }

    register.lastUpdatedBy = req.user.id;
    await register.save();

    res.status(200).json({
      success: true,
      message: `Successfully synced ${addedCount} entries from system stays & expenses.`,
      addedCount,
      data: register,
      summary: computeSummary(register)
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Monthly Summary for CA / Tax / P&L Export
// @route   GET /api/daily-register/monthly-summary
// @access  Private
exports.getMonthlySummary = async (req, res, next) => {
  try {
    const { hostel, yearMonth } = req.query; // format: "YYYY-MM", e.g. "2026-11"
    const targetHostel = await resolveTargetHostel(hostel, req.user);

    if (!targetHostel) {
      return res.status(400).json({ success: false, message: 'Hostel is required' });
    }

    const ym = yearMonth || getTodayIST().slice(0, 7);

    // Find all registers for this month
    const registers = await DailyRegister.find({
      hostel: targetHostel,
      date: { $regex: `^${ym}` }
    }).sort({ date: 1 });

    const daysSummary = registers.map(r => ({
      date: r.date,
      ...computeSummary(r)
    }));

    // Monthly aggregates
    const monthTotals = daysSummary.reduce((acc, curr) => {
      acc.totalCash += curr.totalCash;
      acc.totalCard += curr.totalCard;
      acc.totalOnline += curr.totalOnline;
      acc.totalFoodCash += curr.totalFoodCash;
      acc.totalIncome += curr.totalIncome;
      acc.totalExpense += curr.totalExpense;
      acc.cashExpense += curr.cashExpense;
      acc.onlineExpense += curr.onlineExpense;
      acc.netProfit += curr.netDayProfit;
      return acc;
    }, {
      totalCash: 0,
      totalCard: 0,
      totalOnline: 0,
      totalFoodCash: 0,
      totalIncome: 0,
      totalExpense: 0,
      cashExpense: 0,
      onlineExpense: 0,
      netProfit: 0
    });

    res.status(200).json({
      success: true,
      yearMonth: ym,
      days: daysSummary,
      totals: monthTotals
    });
  } catch (err) {
    next(err);
  }
};
