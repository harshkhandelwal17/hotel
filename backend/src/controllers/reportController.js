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

// GET /api/reports/gst - GST Output Tax Ledger & GSTR-1 Report
exports.getGstReport = async (req, res, next) => {
  try {
    const filter = await getHostelFilter(req.user, req.query.hostel);
    const { startDate, endDate, clientType, rate } = req.query;

    const query = { ...filter };

    // Date range filter based on checkInDate or createdAt
    if (startDate || endDate) {
      query.checkInDate = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.checkInDate.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.checkInDate.$lte = e;
      }
    }

    const stays = await Stay.find(query)
      .populate('guest', 'fullName mobileNumber companyName gstin address')
      .populate('room', 'roomNumber category')
      .populate('hostel', 'name gstin state invoicePrefix')
      .sort({ checkInDate: -1 });

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;
    let totalInvoiceAmount = 0;

    let b2bCount = 0;
    let b2bTaxable = 0;
    let b2bTax = 0;

    let b2cCount = 0;
    let b2cTaxable = 0;
    let b2cTax = 0;

    const slabs = {
      5: { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 },
      12: { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 },
      18: { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 },
      other: { count: 0, taxable: 0, tax: 0 }
    };

    const records = [];

    for (const stay of stays) {
      const hostel = stay.hostel || {};
      const guest = stay.guest || {};

      const gstApplied = stay.gstApplied || Boolean(stay.taxAmount > 0) || Boolean(stay.gstRate > 0) || Boolean(hostel.gstEnabled);
      if (!gstApplied && !req.query.includeAll) {
        continue; // Only include GST registered folios in GST tax ledger by default
      }

      const companyName = (stay.companyName || guest.companyName || '').trim();
      const gstin = (stay.gstin || guest.gstin || '').trim().toUpperCase();
      const isB2B = Boolean(gstin && gstin.length >= 15);

      if (clientType === 'b2b' && !isB2B) continue;
      if (clientType === 'b2c' && isB2B) continue;

      const rateVal = Number(stay.gstRate || (gstApplied ? 12 : 0));
      if (rate && Number(rate) !== rateVal) continue;

      const totalBilled = Number(stay.totalAmount) || 0;
      const taxInclusive = stay.gstType !== 'exclusive';

      let taxableAmount = totalBilled;
      let totalGstAmt = Number(stay.taxAmount) || 0;

      if (rateVal > 0) {
        if (taxInclusive) {
          taxableAmount = Math.round((totalBilled / (1 + rateVal / 100)) * 100) / 100;
          totalGstAmt = Math.round((totalBilled - taxableAmount) * 100) / 100;
        } else {
          taxableAmount = totalBilled;
          totalGstAmt = Math.round((taxableAmount * (rateVal / 100)) * 100) / 100;
        }
      }

      // Check Inter-State vs Intra-State (State code check)
      const hotelGstin = (hostel.gstin || '').trim().toUpperCase();
      const hotelStateCode = hotelGstin.slice(0, 2);
      const guestStateCode = gstin.slice(0, 2);
      const isInterState = Boolean(hotelStateCode && guestStateCode && hotelStateCode !== guestStateCode);

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = totalGstAmt;
      } else {
        cgst = Math.round((totalGstAmt / 2) * 100) / 100;
        sgst = Math.round((totalGstAmt - cgst) * 100) / 100;
      }

      const grossAmount = taxInclusive ? totalBilled : (taxableAmount + totalGstAmt);
      const invoiceTotal = Math.round(grossAmount);
      const roundOff = Math.round((invoiceTotal - grossAmount) * 100) / 100;

      totalTaxable += taxableAmount;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      totalTax += totalGstAmt;
      totalInvoiceAmount += invoiceTotal;

      if (isB2B) {
        b2bCount += 1;
        b2bTaxable += taxableAmount;
        b2bTax += totalGstAmt;
      } else {
        b2cCount += 1;
        b2cTaxable += taxableAmount;
        b2cTax += totalGstAmt;
      }

      if (slabs[rateVal]) {
        slabs[rateVal].count += 1;
        slabs[rateVal].taxable += taxableAmount;
        slabs[rateVal].cgst += cgst;
        slabs[rateVal].sgst += sgst;
        slabs[rateVal].igst += igst;
        slabs[rateVal].tax += totalGstAmt;
      } else {
        slabs.other.count += 1;
        slabs.other.taxable += taxableAmount;
        slabs.other.tax += totalGstAmt;
      }

      const prefix = hostel.invoicePrefix || 'INV';
      const stayDate = stay.createdAt ? new Date(stay.createdAt) : new Date();
      const dateStr = stayDate.toISOString().slice(0, 10).replace(/-/g, '');
      const roomStr = stay.room?.roomNumber || 'RM';
      const idStr = stay._id.toString().slice(-4).toUpperCase();
      const invoiceNumber = `${prefix}-${dateStr}-${roomStr}-${idStr}`;

      records.push({
        _id: stay._id,
        invoiceNumber,
        invoiceDate: stay.checkInDate || stay.createdAt,
        clientName: companyName || guest.fullName || 'Guest',
        companyName,
        guestName: guest.fullName || 'Guest',
        mobileNumber: guest.mobileNumber || '',
        gstin,
        isB2B,
        isInterState,
        roomNumber: stay.room?.roomNumber || 'N/A',
        roomCategory: stay.room?.category || 'Standard',
        gstRate: rateVal,
        gstType: stay.gstType || (taxInclusive ? 'inclusive' : 'exclusive'),
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        igst: Math.round(igst * 100) / 100,
        totalTax: Math.round(totalGstAmt * 100) / 100,
        roundOff,
        invoiceTotal,
        paidAmount: stay.paidAmount || 0,
        status: stay.status
      });
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalInvoices: records.length,
          totalTaxable: Math.round(totalTaxable * 100) / 100,
          totalCgst: Math.round(totalCgst * 100) / 100,
          totalSgst: Math.round(totalSgst * 100) / 100,
          totalIgst: Math.round(totalIgst * 100) / 100,
          totalTax: Math.round(totalTax * 100) / 100,
          totalInvoiceAmount: Math.round(totalInvoiceAmount),
          b2b: {
            count: b2bCount,
            taxable: Math.round(b2bTaxable * 100) / 100,
            tax: Math.round(b2bTax * 100) / 100
          },
          b2c: {
            count: b2cCount,
            taxable: Math.round(b2cTaxable * 100) / 100,
            tax: Math.round(b2cTax * 100) / 100
          },
          slabs: {
            rate5: { ...slabs[5], taxable: Math.round(slabs[5].taxable * 100) / 100, tax: Math.round(slabs[5].tax * 100) / 100 },
            rate12: { ...slabs[12], taxable: Math.round(slabs[12].taxable * 100) / 100, tax: Math.round(slabs[12].tax * 100) / 100 },
            rate18: { ...slabs[18], taxable: Math.round(slabs[18].taxable * 100) / 100, tax: Math.round(slabs[18].tax * 100) / 100 }
          }
        },
        records
      }
    });
  } catch (error) {
    next(error);
  }
};
