const Guest = require('../models/Guest');
const GuestLedger = require('../models/GuestLedger');
const { assertHostelAccess, getHostelFilter, userCanAccessHostel } = require('../utils/hostelAccess');

// Helper: send error response safely
const sendError = (res, next, error) => {
  if (error && error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  next(error);
};

/**
 * Add Advance Deposit into Guest's Wallet / Khata account (+ balance)
 * POST /api/guests/:id/ledger/deposit
 */
exports.addDeposit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, description, date } = req.body;

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid deposit amount greater than 0' });
    }

    const guest = await Guest.findById(id);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    await assertHostelAccess(req.user, guest.hostel, true);

    const prevBalance = Number(guest.ledgerBalance) || 0;
    const newBalance = Math.round((prevBalance + amt) * 100) / 100;

    guest.ledgerBalance = newBalance;
    await guest.save();

    const ledgerEntry = await GuestLedger.create({
      guest: guest._id,
      hostel: guest.hostel,
      entryType: 'DEPOSIT',
      amount: amt,
      balanceAfter: newBalance,
      paymentMethod: paymentMethod || 'Cash',
      description: (description && description.trim()) || 'Advance Deposit (अग्रिम राशि जमा)',
      date: date ? new Date(date) : new Date(),
      createdBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: `₹${amt.toLocaleString('en-IN')} deposited successfully to guest advance ledger`,
      data: {
        guest,
        ledgerEntry
      }
    });
  } catch (error) {
    sendError(res, next, error);
  }
};

/**
 * Record Payment against Guest's Khata / Pending Due (+ balance)
 * POST /api/guests/:id/ledger/payment
 */
exports.recordPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, description, date } = req.body;

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid payment amount greater than 0' });
    }

    const guest = await Guest.findById(id);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    await assertHostelAccess(req.user, guest.hostel, true);

    const prevBalance = Number(guest.ledgerBalance) || 0;
    const newBalance = Math.round((prevBalance + amt) * 100) / 100;

    guest.ledgerBalance = newBalance;
    await guest.save();

    const ledgerEntry = await GuestLedger.create({
      guest: guest._id,
      hostel: guest.hostel,
      entryType: 'PAYMENT',
      amount: amt,
      balanceAfter: newBalance,
      paymentMethod: paymentMethod || 'Cash',
      description: (description && description.trim()) || 'Khata Payment Received (उधार भुगतान प्राप्त)',
      date: date ? new Date(date) : new Date(),
      createdBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: `₹${amt.toLocaleString('en-IN')} payment recorded successfully`,
      data: {
        guest,
        ledgerEntry
      }
    });
  } catch (error) {
    sendError(res, next, error);
  }
};

/**
 * Get full ledger transaction history (passbook) for a guest
 * GET /api/guests/:id/ledger
 */
exports.getGuestLedger = async (req, res, next) => {
  try {
    const { id } = req.params;

    const guest = await Guest.findById(id).select('-idProofImage -idProofImageBack');
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    if (!(await userCanAccessHostel(req.user, guest.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this guest' });
    }

    const entries = await GuestLedger.find({ guest: id })
      .populate('stay', 'room totalAmount paidAmount checkInDate expectedCheckOutDate actualCheckOutDate status')
      .populate('createdBy', 'name email')
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        guest,
        entries
      }
    });
  } catch (error) {
    sendError(res, next, error);
  }
};

/**
 * Get aggregate Khata & Credit summary across the property
 * GET /api/guests/khata/summary
 */
exports.getKhataSummary = async (req, res, next) => {
  try {
    const filter = await getHostelFilter(req.user, req.query.hostel);

    // Fetch all guests in this hostel who have a non-zero ledger balance or have had ledger entries
    const search = req.query.search;
    const guestQuery = { ...filter };

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      guestQuery.$or = [
        { fullName: regex },
        { mobileNumber: regex },
        { idProofNumber: regex }
      ];
    } else {
      // Use indexed ledgerBalance to only fetch guests with active credit / advance
      guestQuery.ledgerBalance = { $ne: 0 };
    }

    const allGuests = await Guest.find(guestQuery)
      .select('fullName mobileNumber idProofType idProofNumber address ledgerBalance hostel createdAt')
      .populate('hostel', 'name')
      .sort({ updatedAt: -1 })
      .lean();

    let totalMarketDue = 0;
    let totalAdvanceHeld = 0;
    let dueGuestsCount = 0;
    let advanceGuestsCount = 0;

    const creditCustomers = [];

    for (const g of allGuests) {
      const bal = Number(g.ledgerBalance) || 0;
      if (bal < 0) {
        totalMarketDue += Math.abs(bal);
        dueGuestsCount += 1;
        creditCustomers.push({ ...g, status: 'DUE', dueAmount: Math.abs(bal), advanceAmount: 0 });
      } else if (bal > 0) {
        totalAdvanceHeld += bal;
        advanceGuestsCount += 1;
        creditCustomers.push({ ...g, status: 'ADVANCE', dueAmount: 0, advanceAmount: bal });
      } else if (search) {
        // If searching specifically, show even settled guests
        creditCustomers.push({ ...g, status: 'SETTLED', dueAmount: 0, advanceAmount: 0 });
      }
    }

    // Sort credit customers: highest dues first, then highest advances
    creditCustomers.sort((a, b) => {
      if (a.dueAmount > 0 && b.dueAmount > 0) return b.dueAmount - a.dueAmount;
      if (a.dueAmount > 0) return -1;
      if (b.dueAmount > 0) return 1;
      return b.advanceAmount - a.advanceAmount;
    });

    res.status(200).json({
      success: true,
      data: {
        totalMarketDue: Math.round(totalMarketDue * 100) / 100,
        totalAdvanceHeld: Math.round(totalAdvanceHeld * 100) / 100,
        netBalance: Math.round((totalAdvanceHeld - totalMarketDue) * 100) / 100,
        dueGuestsCount,
        advanceGuestsCount,
        totalCreditAccounts: dueGuestsCount + advanceGuestsCount,
        customers: creditCustomers
      }
    });
  } catch (error) {
    sendError(res, next, error);
  }
};

/**
 * Get all ledger transactions across property with guest and staff details
 * GET /api/guests/khata/transactions
 */
exports.getAllLedgerTransactions = async (req, res, next) => {
  try {
    const filter = await getHostelFilter(req.user, req.query.hostel);
    const entries = await GuestLedger.find(filter)
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber')
      .populate('createdBy', 'name role')
      .populate('hostel', 'name')
      .populate({
        path: 'stay',
        select: 'checkInDate expectedCheckOutDate room',
        populate: { path: 'room', select: 'roomNumber' }
      })
      .sort({ date: -1, createdAt: -1 })
      .limit(3000)
      .lean();

    res.status(200).json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    sendError(res, next, error);
  }
};

