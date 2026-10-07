const Stay = require('../models/Stay');
const Room = require('../models/Room');
const Bed = require('../models/Bed');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

exports.createStay = async (req, res, next) => {
  try {
    const { guest, room, checkInDate, expectedCheckOutDate, initialPaymentAmount, paymentMethod, durationOption, occupants, coGuests, commissionTo, commissionAmount } = req.body;
    let hostel = req.user.assignedHostel;
    
    if (req.user.role === 'admin') {
      const Hostel = require('../models/Hostel');
      const hostelExists = await Hostel.findOne({ _id: req.body.hostel, owner: req.user.id });
      if (!hostelExists) return res.status(403).json({ success: false, message: 'Not authorized for this hostel' });
      hostel = req.body.hostel;
    }
    
    // Validate overlapping stays for the ROOM (not bed)
    const overlapping = await Stay.findOne({
      room,
      status: { $in: ['Upcoming', 'Active', 'Checkout Due', 'Overdue'] },
      $or: [
        { checkInDate: { $lt: expectedCheckOutDate }, expectedCheckOutDate: { $gt: checkInDate } }
      ]
    });

    if (overlapping) {
      throw new Error('The selected room is already booked for the requested dates.');
    }
    
    // Get Room price
    const roomDoc = await Room.findById(room);
    if (!roomDoc) throw new Error('Room not found');
    if (roomDoc.hostel.toString() !== hostel.toString()) throw new Error('This room does not belong to the selected property');
    if (roomDoc.status !== 'Active') throw new Error(`Room ${roomDoc.roomNumber} is not available (${roomDoc.status})`);
    
    // Runtime manual pricing
    let totalAmount = Number(req.body.totalAmount) || 0;
    totalAmount = Math.max(0, totalAmount);
    if ((Number(initialPaymentAmount) || 0) > totalAmount) {
      throw new Error('Advance payment cannot be more than the total amount');
    }

    const stay = await Stay.create([{
      guest,
      coGuests: coGuests || [],
      hostel,
      room,
      checkInDate,
      expectedCheckOutDate,
      durationOption: durationOption || '24h',
      totalAmount,
      paidAmount: initialPaymentAmount || 0,
      occupants: occupants || 1,
      commissionTo: commissionTo || '',
      commissionAmount: Number(commissionAmount) || 0,
      createdBy: req.user._id
    }]);

    if (initialPaymentAmount > 0) {
      await Payment.create([{
        stay: stay[0]._id,
        guest,
        hostel,
        amount: initialPaymentAmount,
        paymentMethod: paymentMethod || 'Cash',
        createdBy: req.user._id
      }]);
    }

    res.status(201).json({ success: true, data: stay[0] });
  } catch (error) {
    next(error);
  }
};

exports.getStays = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
      filter.hostel = req.user.assignedHostel;
    } else {
      const Hostel = require('../models/Hostel');
      const myHostels = await Hostel.find({ owner: req.user.id }).select('_id');
      const hostelIds = myHostels.map(h => h._id);
      
      if (req.query.hostel && req.query.hostel !== 'all') {
        if (!hostelIds.some(id => id.toString() === req.query.hostel)) {
          return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        filter.hostel = req.query.hostel;
      } else {
        filter.hostel = { $in: hostelIds };
      }
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const stays = await Stay.find(filter)
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack')
      .populate('room', 'roomNumber price24h extraPerPerson24h')
      .populate('hostel', 'name address')
      .sort('expectedCheckOutDate');
      
    res.status(200).json({ success: true, count: stays.length, data: stays });
  } catch (error) {
    next(error);
  }
};


// ---------------------------------------------------------------------------
// Helper: load a stay and make sure the logged-in user is allowed to touch it.
//  - admin        -> stay's hostel must be owned by this admin
//  - receptionist -> stay's hostel must be their assigned hostel
// ---------------------------------------------------------------------------
const loadAuthorizedStay = async (req) => {
  const stay = await Stay.findById(req.params.id);
  if (!stay) {
    const err = new Error('Stay not found');
    err.statusCode = 404;
    throw err;
  }

  let allowed = false;
  if (req.user.role === 'admin') {
    const Hostel = require('../models/Hostel');
    allowed = !!(await Hostel.exists({ _id: stay.hostel, owner: req.user.id }));
  } else {
    allowed = !!req.user.assignedHostel && stay.hostel.toString() === req.user.assignedHostel.toString();
  }

  if (!allowed) {
    const err = new Error('Not authorized for this stay');
    err.statusCode = 403;
    throw err;
  }
  return stay;
};

const sendError = (res, next, error) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  return next(error);
};

const OPEN_STATUSES = ['Active', 'Checkout Due', 'Overdue'];

// GET /api/stays/:id  -> full detail (guest, room, charges, payments, history)
exports.getStay = async (req, res, next) => {
  try {
    const authorized = await loadAuthorizedStay(req);
    const stay = await Stay.findById(authorized._id)
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber')
      .populate('coGuests', 'fullName mobileNumber')
      .populate('room', 'roomNumber price24h extraPerPerson24h')
      .populate('hostel', 'name address');
    const payments = await Payment.find({ stay: stay._id }).sort('paymentDate');
    res.status(200).json({ success: true, data: { stay, payments } });
  } catch (error) {
    sendError(res, next, error);
  }
};

// POST /api/stays/:id/charges  { description, category, quantity, rate | amount }
exports.addCharge = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    if (!OPEN_STATUSES.includes(stay.status)) throw new Error('Charges can only be added to a guest who is still staying');

    const { description, category } = req.body;
    const quantity = Math.max(1, Number(req.body.quantity) || 1);
    const rate = Number(req.body.rate);
    const amount = Number.isFinite(rate) && req.body.rate !== undefined && req.body.rate !== ''
      ? rate * quantity
      : Number(req.body.amount);

    if (!description || !String(description).trim()) throw new Error('Please enter what the charge is for');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Please enter a valid amount');

    stay.charges.push({
      description: String(description).trim(),
      category: category || 'Other',
      quantity,
      amount,
      addedBy: req.user._id
    });
    stay.additionalCharges = (stay.additionalCharges || 0) + amount;
    stay.totalAmount += amount;
    await stay.save();

    res.status(201).json({ success: true, data: stay });
  } catch (error) {
    sendError(res, next, error);
  }
};

// DELETE /api/stays/:id/charges/:chargeId  (mistake correction)
exports.removeCharge = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    if (!OPEN_STATUSES.includes(stay.status)) throw new Error('Cannot edit charges of a checked-out stay');

    const charge = stay.charges.id(req.params.chargeId);
    if (!charge) throw new Error('Charge not found');

    stay.additionalCharges = Math.max(0, (stay.additionalCharges || 0) - charge.amount);
    stay.totalAmount = Math.max(0, stay.totalAmount - charge.amount);
    charge.deleteOne();
    await stay.save();

    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    sendError(res, next, error);
  }
};

// POST /api/stays/:id/payments  { amount, paymentMethod, notes }  (part payment during the stay)
exports.addPayment = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    if (stay.status === 'Cancelled') throw new Error('Stay is cancelled');

    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Please enter a valid amount');

    const balance = stay.totalAmount - stay.paidAmount;
    if (amount > balance) throw new Error(`Amount is more than the balance due (₹${balance})`);

    await Payment.create({
      stay: stay._id,
      guest: stay.guest,
      hostel: stay.hostel,
      amount,
      paymentMethod: req.body.paymentMethod || 'Cash',
      notes: req.body.notes,
      createdBy: req.user._id
    });
    stay.paidAmount += amount;
    await stay.save();

    res.status(201).json({ success: true, data: stay });
  } catch (error) {
    sendError(res, next, error);
  }
};

exports.checkout = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    if (stay.status === 'Checked Out') throw new Error('Stay is already checked out');

    const additionalCharges = Number(req.body.additionalCharges) || 0;
    const checkoutPayment = Number(req.body.checkoutPayment) || 0;
    const { paymentMethod, additionalChargesNote } = req.body;

    if (checkoutPayment > stay.totalAmount + additionalCharges - stay.paidAmount) {
      throw new Error('Payment is more than the balance due');
    }

    if (req.body.chargesList && Array.isArray(req.body.chargesList) && req.body.chargesList.length > 0) {
      let totalNewCharges = 0;
      for (const charge of req.body.chargesList) {
        const amt = Number(charge.amount) || 0;
        if (amt > 0) {
          stay.charges.push({
            description: (charge.reason && charge.reason.trim()) || 'Extra charge',
            category: 'Other',
            quantity: 1,
            amount: amt,
            addedBy: req.user._id
          });
          totalNewCharges += amt;
        }
      }
      stay.additionalCharges = (stay.additionalCharges || 0) + totalNewCharges;
      stay.totalAmount += totalNewCharges;
    } else if (additionalCharges > 0) {
      stay.charges.push({
        description: (additionalChargesNote && additionalChargesNote.trim()) || 'Checkout charges',
        category: 'Other',
        quantity: 1,
        amount: additionalCharges,
        addedBy: req.user._id
      });
      stay.additionalCharges = (stay.additionalCharges || 0) + additionalCharges;
      stay.totalAmount += additionalCharges;
    }

    if (checkoutPayment > 0) {
      stay.paidAmount += checkoutPayment;
      await Payment.create([{
        stay: stay._id,
        guest: stay.guest,
        hostel: stay.hostel,
        amount: checkoutPayment,
        paymentMethod: paymentMethod || 'Cash',
        createdBy: req.user._id
      }]);
    }

    stay.status = 'Checked Out';
    stay.actualCheckOutDate = new Date();
    await stay.save();

    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    sendError(res, next, error);
  }
};

exports.extendStay = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    if (!OPEN_STATUSES.includes(stay.status)) throw new Error('Only a guest who is still staying can be extended');

    const { newCheckOutDate, extensionPayment, paymentMethod } = req.body;
    const newOutDate = new Date(newCheckOutDate);
    if (isNaN(newOutDate.getTime())) throw new Error('Invalid new checkout date');

    // Verify no overlaps for the room
    const overlapping = await Stay.findOne({
      room: stay.room,
      _id: { $ne: stay._id },
      status: { $in: ['Upcoming', 'Active'] },
      checkInDate: { $lt: newOutDate, $gte: stay.checkInDate }
    });
    if (overlapping) throw new Error('Cannot extend. Room is booked by another guest for the requested dates.');

    const oldOutDate = new Date(stay.expectedCheckOutDate);
    if (newOutDate <= oldOutDate) throw new Error('New checkout date must be after current checkout date');

    const additionalCost = Math.max(0, Number(req.body.additionalRent) || 0);
    const pay = Math.max(0, Number(extensionPayment) || 0);
    if (pay > stay.totalAmount + additionalCost - stay.paidAmount) {
      throw new Error('Payment is more than the balance due');
    }
    stay.totalAmount += additionalCost;
    stay.expectedCheckOutDate = newOutDate;
    if (stay.status === 'Overdue' || stay.status === 'Checkout Due') stay.status = 'Active';

    const stamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const note = `[${stamp}] Stay extended till ${newOutDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. Extra rent: ₹${additionalCost}.`;
    stay.notes = stay.notes ? `${stay.notes}\n${note}` : note;

    if (pay > 0) {
      stay.paidAmount += pay;
      await Payment.create([{
        stay: stay._id,
        guest: stay.guest,
        hostel: stay.hostel,
        amount: pay,
        paymentMethod: paymentMethod || 'Cash',
        createdBy: req.user._id
      }]);
    }

    await stay.save();
    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    sendError(res, next, error);
  }
};

exports.shiftRoom = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    if (!OPEN_STATUSES.includes(stay.status)) throw new Error('Can only shift a guest who is still staying');

    const { newRoomId, reason } = req.body;
    const priceAdjustment = Number(req.body.priceAdjustment) || 0;

    const newRoom = await Room.findById(newRoomId);
    if (!newRoom) throw new Error('New room not found');
    if (newRoom.hostel.toString() !== stay.hostel.toString()) {
      throw new Error('Cannot shift to a room in a different property');
    }
    if (newRoom._id.toString() === stay.room.toString()) {
      throw new Error('Guest is already in this room');
    }
    if (newRoom.status !== 'Active') {
      throw new Error(`Room ${newRoom.roomNumber} is not available (${newRoom.status})`);
    }

    // Is the new room free right now / for the rest of this stay?
    const overlapping = await Stay.findOne({
      room: newRoomId,
      _id: { $ne: stay._id },
      status: { $in: ['Upcoming', 'Active', 'Checkout Due', 'Overdue'] },
      checkInDate: { $lt: stay.expectedCheckOutDate },
      expectedCheckOutDate: { $gt: new Date() }
    });
    if (overlapping) throw new Error('New room is already booked for these dates');

    const oldRoom = await Room.findById(stay.room);
    const oldRoomNumber = oldRoom ? oldRoom.roomNumber : 'Unknown';

    stay.roomHistory.push({
      fromRoom: stay.room,
      toRoom: newRoom._id,
      fromRoomNumber: oldRoomNumber,
      toRoomNumber: newRoom.roomNumber,
      reason: reason || '',
      priceAdjustment,
      shiftedBy: req.user._id
    });

    stay.room = newRoom._id;
    if (priceAdjustment) {
      stay.totalAmount = Math.max(0, stay.totalAmount + priceAdjustment);
    }

    const shiftNote = `[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] Shifted from Room ${oldRoomNumber} to ${newRoom.roomNumber}. Reason: ${reason || 'N/A'}. Price Adjustment: ₹${priceAdjustment}.`;
    stay.notes = stay.notes ? `${stay.notes}\n${shiftNote}` : shiftNote;

    await stay.save();
    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    sendError(res, next, error);
  }
};
