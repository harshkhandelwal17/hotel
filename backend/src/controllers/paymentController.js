const Payment = require('../models/Payment');
const Stay = require('../models/Stay');
const { userCanAccessHostel, getHostelFilter } = require('../utils/hostelAccess');

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

    const payment = await Payment.create({
      stay: stayId,
      guest: stay.guest,
      hostel: stay.hostel,
      amount: payAmount,
      paymentMethod: paymentMethod || 'Cash',
      notes: notes || note || '',
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: payment });
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
        select: 'checkInDate expectedCheckOutDate room durationOption',
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
