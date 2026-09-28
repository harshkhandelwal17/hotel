const Stay = require('../models/Stay');
const Guest = require('../models/Guest');
const Payment = require('../models/Payment');
const Room = require('../models/Room');
const Bed = require('../models/Bed');
const mongoose = require('mongoose');

exports.getDashboardStats = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
      filter.hostel = req.user.assignedHostel;
    } else if (req.query.hostel && req.query.hostel !== 'all') {
      filter.hostel = new mongoose.Types.ObjectId(req.query.hostel);
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      activeStays,
      totalRooms,
      checkinsToday,
      checkoutsToday,
      pendingPayments
    ] = await Promise.all([
      Stay.countDocuments({ ...filter, status: { $in: ['Active', 'Checkout Due', 'Overdue'] } }),
      Room.countDocuments({ ...filter, status: 'Active' }),
      Stay.countDocuments({ ...filter, checkInDate: { $gte: today, $lt: tomorrow } }),
      Stay.countDocuments({ ...filter, expectedCheckOutDate: { $gte: today, $lt: tomorrow }, status: { $ne: 'Checked Out' } }),
      Stay.aggregate([
        { $match: filter },
        { $project: { pending: { $subtract: ["$totalAmount", "$paidAmount"] } } },
        { $match: { pending: { $gt: 0 } } },
        { $group: { _id: null, totalPending: { $sum: "$pending" } } }
      ])
    ]);
    
    const occupiedRooms = activeStays; // Using same variable names for frontend compat for now
    const availableRooms = Math.max(0, totalRooms - activeStays);

    res.status(200).json({
      success: true,
      data: {
        activeStays,
        availableRooms,
        occupiedRooms,
        checkinsToday,
        checkoutsToday,
        pendingPayments: pendingPayments.length > 0 ? pendingPayments[0].totalPending : 0
      }
    });
  } catch (error) {
    next(error);
  }
};
