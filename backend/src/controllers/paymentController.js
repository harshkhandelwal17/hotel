const Payment = require('../models/Payment');
const Stay = require('../models/Stay');
const Guest = require('../models/Guest');
const GuestLedger = require('../models/GuestLedger');
const { userCanAccessHostel, getHostelFilter } = require('../utils/hostelAccess');
const { recordLedgerImpact } = require('../utils/ledgerHelper');

exports.createPayment = async (req, res, next) => {
  try {
    const { stayId, amount, paymentMethod, note, notes } = req.body;

    const stay = await Stay.findById(stayId);
    if (!stay) return res.status(404).json({ success: false, message: 'Stay not found' });

    if (!(await userCanAccessHostel(req.user, stay.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this payment' });
    }

    if (stay.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot add payment to a cancelled stay' });
    }

    const payAmount = Number(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid amount' });
    }

    const balance = stay.totalAmount - stay.paidAmount;
    if (payAmount > balance + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Amount is more than the balance due (₹${Math.max(0, balance)})`
      });
    }

    // Atomic increment so concurrent payments cannot overpay
    const updated = await Stay.findOneAndUpdate(
      {
        _id: stay._id,
        status: { $ne: 'Cancelled' },
        $expr: {
          $lte: [{ $add: ['$paidAmount', payAmount] }, { $add: ['$totalAmount', 0.01] }]
        }
      },
      { $inc: { paidAmount: payAmount } },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'Could not record payment — balance may have changed. Please refresh and try again.'
      });
    }

    const splitPayments = req.body.splitPayments;
    let createdPayments = [];

    if (Array.isArray(splitPayments) && splitPayments.length > 0) {
      for (const sp of splitPayments) {
        const spAmt = Number(sp.amount);
        if (spAmt > 0) {
          const pMethod = sp.paymentMethod || 'Cash';
          const p = await Payment.create({
            stay: stayId,
            guest: stay.guest,
            hostel: stay.hostel,
            amount: spAmt,
            paymentMethod: pMethod,
            notes: sp.notes || notes || note || 'Payment (Mixed)',
            createdBy: req.user._id
          });
          await recordLedgerImpact({
            guestId: stay.guest,
            hostelId: stay.hostel,
            stayId: stay._id,
            amount: spAmt,
            paymentMethod: pMethod,
            description: sp.notes || notes || note || `Stay payment (${pMethod})`,
            userId: req.user._id
          });
          createdPayments.push(p);
        }
      }
    } else {
      const pMethod = paymentMethod || 'Cash';
      const payment = await Payment.create({
        stay: stayId,
        guest: stay.guest,
        hostel: stay.hostel,
        amount: payAmount,
        paymentMethod: pMethod,
        notes: notes || note || '',
        createdBy: req.user._id
      });
      await recordLedgerImpact({
        guestId: stay.guest,
        hostelId: stay.hostel,
        stayId: stay._id,
        amount: payAmount,
        paymentMethod: pMethod,
        description: notes || note || `Stay payment (${pMethod})`,
        userId: req.user._id
      });
      createdPayments.push(payment);
    }

    res.status(201).json({ success: true, data: createdPayments[0], payments: createdPayments });
  } catch (error) {
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const filter = await getHostelFilter(req.user, req.query.hostel);

    if (req.query.stay) filter.stay = req.query.stay;

    const payments = await Payment.find(filter)
      .populate('guest', 'fullName mobileNumber')
      .populate('hostel', 'name').populate('createdBy', 'name role')
      .populate({
        path: 'stay',
        select: 'checkInDate expectedCheckOutDate room durationOption occupants coGuests bookingSource bookingNumber totalAmount status',
        populate: { path: 'room', select: 'roomNumber roomType' }
      })
      .sort('-paymentDate')
      .limit(3000);

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, notes, paymentDate } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (!(await userCanAccessHostel(req.user, payment.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this payment' });
    }

    if (amount !== undefined) {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt < 0) {
        return res.status(400).json({ success: false, message: 'Please enter a valid amount' });
      }
      payment.amount = amt;
    }

    if (paymentMethod) {
      payment.paymentMethod = paymentMethod;
    }

    if (notes !== undefined) payment.notes = notes;
    if (paymentDate) {
      const pd = new Date(paymentDate);
      if (!isNaN(pd.getTime())) payment.paymentDate = pd;
    }

    await payment.save();

    // Sync stay.paidAmount
    const stay = await Stay.findById(payment.stay);
    if (stay) {
      const payTotal = await Payment.aggregate([
        { $match: { stay: stay._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      stay.paidAmount = payTotal.length > 0 ? payTotal[0].total : 0;
      await stay.save();
    }

    res.status(200).json({ success: true, message: 'Payment updated successfully', data: payment });
  } catch (error) {
    next(error);
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (!(await userCanAccessHostel(req.user, payment.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this payment' });
    }

    const stayId = payment.stay;

    // Reverse ledger impact if payment was from Wallet or Khata
    if ((payment.paymentMethod === 'Wallet' || payment.paymentMethod === 'Khata') && payment.guest) {
      try {
        const guestDoc = await Guest.findById(payment.guest);
        if (guestDoc) {
          const refundAmt = Number(payment.amount) || 0;
          const newBal = Math.round(((Number(guestDoc.ledgerBalance) || 0) + refundAmt) * 100) / 100;
          guestDoc.ledgerBalance = newBal;
          await guestDoc.save();

          await GuestLedger.create({
            guest: guestDoc._id,
            hostel: payment.hostel,
            stay: payment.stay,
            entryType: 'REVERSAL',
            amount: refundAmt,
            balanceAfter: newBal,
            paymentMethod: payment.paymentMethod,
            description: `Payment deleted/reversed: ₹${refundAmt} (${payment.paymentMethod})`,
            createdBy: req.user._id
          });
        }
      } catch (lErr) {
        console.error('Error reversing ledger on payment delete:', lErr);
      }
    }

    await Payment.findByIdAndDelete(id);

    // Sync stay.paidAmount
    const stay = await Stay.findById(stayId);
    if (stay) {
      const payTotal = await Payment.aggregate([
        { $match: { stay: stay._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      stay.paidAmount = payTotal.length > 0 ? payTotal[0].total : 0;
      await stay.save();
    }

    res.status(200).json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    next(error);
  }
};

