const Payment = require('../models/Payment');
const Stay = require('../models/Stay');

exports.createPayment = async (req, res, next) => {
  try {
    const { stayId, amount, paymentMethod, note } = req.body;
    
    const stay = await Stay.findById(stayId);
    if (!stay) return res.status(404).json({ success: false, message: 'Stay not found' });
    
    if (req.user.role === 'admin') {
      const Hostel = require('../models/Hostel');
      const hostelExists = await Hostel.findOne({ _id: stay.hostel, owner: req.user.id });
      if (!hostelExists) return res.status(403).json({ success: false, message: 'Not authorized for this payment' });
    } else if (req.user.assignedHostel.toString() !== stay.hostel.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this payment' });
    }
    
    const payment = await Payment.create({
      stay: stayId,
      guest: stay.guest,
      hostel: stay.hostel,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'Cash',
      note: note || '',
      createdBy: req.user._id
    });
    
    // Update stay's paid amount
    stay.paidAmount += Number(amount);
    await stay.save();
    
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
      filter.hostel = req.user.assignedHostel;
    } else {
      const Hostel = require('../models/Hostel');
      const myHostels = await Hostel.find({ owner: req.user.id }).select('_id');
      const hostelIds = myHostels.map(h => h._id);
      filter.hostel = { $in: hostelIds };
    }
    
    if (req.query.stay) filter.stay = req.query.stay;

    const payments = await Payment.find(filter)
      .populate('guest', 'fullName mobileNumber')
      .populate('hostel', 'name')
      .populate({
        path: 'stay',
        select: 'checkInDate expectedCheckOutDate room durationOption',
        populate: { path: 'room', select: 'roomNumber roomType' }
      })
      .sort('-paymentDate')
      .limit(3000); // Optimized for UI performance

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    next(error);
  }
};
