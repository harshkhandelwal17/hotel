const Stay = require('../models/Stay');
const Guest = require('../models/Guest');
const Payment = require('../models/Payment');
const Room = require('../models/Room');
const Bed = require('../models/Bed');
const Expense = require('../models/Expense');
const Hostel = require('../models/Hostel');
const { getHostelFilter } = require('../utils/hostelAccess');
const mongoose = require('mongoose');

function toAggregationFilter(filter) {
  const aggFilter = { ...filter };
  if (aggFilter.hostel) {
    if (typeof aggFilter.hostel === 'string' && mongoose.isValidObjectId(aggFilter.hostel)) {
      aggFilter.hostel = new mongoose.Types.ObjectId(aggFilter.hostel);
    } else if (aggFilter.hostel.$in && Array.isArray(aggFilter.hostel.$in)) {
      aggFilter.hostel = {
        $in: aggFilter.hostel.$in.map(id => (mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id))
      };
    } else if (aggFilter.hostel._id && mongoose.isValidObjectId(aggFilter.hostel._id)) {
      aggFilter.hostel = new mongoose.Types.ObjectId(aggFilter.hostel._id);
    }
  }
  return aggFilter;
}

exports.getDashboardStats = async (req, res, next) => {
  try {
    const filter = await getHostelFilter(req.user, req.query.hostel);
    const aggFilter = toAggregationFilter(filter);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Week: last 7 days start
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);

    // Month: 1st of current month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      activeStays,
      totalRooms,
      maintenanceRooms,
      checkinsToday,
      checkoutsToday,
      pendingPayments,
      todayPayments,
      todayExpenses,
      weekPayments,
      monthPayments
    ] = await Promise.all([
      Stay.countDocuments({ ...filter, status: { $in: ['Active', 'Checkout Due', 'Overdue'] } }),
      Room.countDocuments({ ...filter, status: { $ne: 'Inactive' } }),
      Room.countDocuments({ ...filter, status: 'Maintenance' }),
      Stay.countDocuments({ ...filter, checkInDate: { $gte: today, $lt: tomorrow } }),
      Stay.countDocuments({ ...filter, expectedCheckOutDate: { $gte: today, $lt: tomorrow }, status: { $ne: 'Checked Out' } }),
      Stay.aggregate([
        { $match: { ...aggFilter, status: { $in: ['Active', 'Checkout Due', 'Overdue'] } } },
        { $project: { pending: { $subtract: ["$totalAmount", "$paidAmount"] } } },
        { $match: { pending: { $gt: 0 } } },
        { $group: { _id: null, totalPending: { $sum: "$pending" } } }
      ]),
      Payment.aggregate([
        { $match: { ...aggFilter, paymentDate: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: "$paymentMethod", total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: { ...aggFilter, expenseDate: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: "$paymentMethod", total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      Payment.aggregate([
        { $match: { ...aggFilter, paymentDate: { $gte: weekStart, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Payment.aggregate([
        { $match: { ...aggFilter, paymentDate: { $gte: monthStart, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    let todayCashCollected = 0;
    let todayUpiCollected = 0;
    let todayTotalCollected = 0;
    todayPayments.forEach(p => {
      const amt = Number(p.total) || 0;
      todayTotalCollected += amt;
      const method = (p._id || '').toLowerCase();
      if (method === 'cash') todayCashCollected += amt;
      else if (method === 'upi') todayUpiCollected += amt;
    });

    let todayCashExpense = 0;
    let todayUpiExpense = 0;
    let todayTotalExpense = 0;
    todayExpenses.forEach(e => {
      const amt = Number(e.total) || 0;
      todayTotalExpense += amt;
      const method = (e._id || '').toLowerCase();
      if (method === 'cash') todayCashExpense += amt;
      else if (method === 'upi') todayUpiExpense += amt;
    });

    const todayNetCashInDrawer = todayCashCollected - todayCashExpense;
    
    const weekRevenue = weekPayments?.[0]?.total || 0;
    const monthRevenue = monthPayments?.[0]?.total || 0;

    const occupiedRooms = activeStays;
    const availableRooms = Math.max(0, totalRooms - occupiedRooms - maintenanceRooms);

    res.status(200).json({
      success: true,
      data: {
        totalRooms,
        maintenanceRooms,
        activeStays,
        availableRooms,
        occupiedRooms,
        checkinsToday,
        checkoutsToday,
        pendingPayments: pendingPayments.length > 0 ? pendingPayments[0].totalPending : 0,
        todayCashCollected,
        todayUpiCollected,
        todayTotalCollected,
        todayCashExpense,
        todayUpiExpense,
        todayTotalExpense,
        todayNetCashInDrawer,
        weekRevenue,
        monthRevenue
      }
    });
  } catch (error) {
    next(error);
  }
};
