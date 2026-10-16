const Stay = require('../models/Stay');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const Guest = require('../models/Guest');
const { assertHostelAccess, getHostelFilter, userCanAccessHostel } = require('../utils/hostelAccess');

const OPEN_STATUSES = ['Upcoming', 'Active', 'Checkout Due', 'Overdue'];

const roomOverlapFilter = (roomId, checkInDate, expectedCheckOutDate, excludeStayId) => {
  const filter = {
    room: roomId,
    status: { $in: OPEN_STATUSES },
    checkInDate: { $lt: expectedCheckOutDate },
    expectedCheckOutDate: { $gt: checkInDate }
  };
  if (excludeStayId) filter._id = { $ne: excludeStayId };
  return filter;
};

exports.createStay = async (req, res, next) => {
  try {
    const {
      guest, room, checkInDate, expectedCheckOutDate, initialPaymentAmount,
      paymentMethod, durationOption, occupants, coGuests, commissionTo, commissionAmount,
      isAlreadyCheckedOut, actualCheckOutDate
    } = req.body;

    let hostel = req.user.assignedHostel;

    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      if (!req.body.hostel) throw new Error('Hostel is required');
      await assertHostelAccess(req.user, req.body.hostel, true);
      hostel = req.body.hostel;
    } else {
      await assertHostelAccess(req.user, hostel, true);
    }

    if (!guest || !room || !checkInDate || !expectedCheckOutDate) {
      throw new Error('Guest, room, check-in and check-out dates are required');
    }

    const guestDoc = await Guest.findById(guest);
    if (!guestDoc) throw new Error('Guest not found');
    if (guestDoc.hostel.toString() !== hostel.toString()) {
      throw new Error('Guest does not belong to this property');
    }

    const coGuestIds = Array.isArray(coGuests) ? coGuests : [];
    if (coGuestIds.length > 0) {
      const coGuestDocs = await Guest.find({ _id: { $in: coGuestIds } });
      if (coGuestDocs.length !== coGuestIds.length) {
        throw new Error('One or more co-guests were not found');
      }
      for (const cg of coGuestDocs) {
        if (cg.hostel.toString() !== hostel.toString()) {
          throw new Error('Co-guest does not belong to this property');
        }
      }
    }

    const overlapping = await Stay.findOne(
      roomOverlapFilter(room, checkInDate, expectedCheckOutDate)
    );
    if (overlapping) {
      throw new Error('The selected room is already booked for the requested dates.');
    }

    const roomDoc = await Room.findById(room);
    if (!roomDoc) throw new Error('Room not found');
    if (roomDoc.hostel.toString() !== hostel.toString()) {
      throw new Error('This room does not belong to the selected property');
    }
    if (roomDoc.status !== 'Active') {
      throw new Error(`Room ${roomDoc.roomNumber} is not available (${roomDoc.status})`);
    }

    let totalAmount = Number(req.body.totalAmount) || 0;
    totalAmount = Math.max(0, totalAmount);
    const advance = Number(initialPaymentAmount) || 0;
    if (advance > totalAmount) {
      throw new Error('Advance payment cannot be more than the total amount');
    }

    const isPastCheckout = Boolean(isAlreadyCheckedOut);
    const parsedActualOut = isPastCheckout 
      ? new Date(actualCheckOutDate || expectedCheckOutDate) 
      : undefined;

    const stay = await Stay.create({
      guest,
      coGuests: coGuestIds,
      hostel,
      room,
      checkInDate: new Date(checkInDate),
      expectedCheckOutDate: new Date(expectedCheckOutDate),
      actualCheckOutDate: parsedActualOut,
      status: isPastCheckout ? 'Checked Out' : 'Active',
      durationOption: durationOption || '24h',
      totalAmount,
      paidAmount: advance,
      occupants: occupants || 1,
      commissionTo: commissionTo || '',
      commissionAmount: Number(commissionAmount) || 0,
      createdBy: req.user._id
    });

    // Double-check after create to shrink race window for double-booking
    const conflicts = await Stay.find(
      roomOverlapFilter(room, checkInDate, expectedCheckOutDate, stay._id)
    );
    if (conflicts.length > 0) {
      await Stay.deleteOne({ _id: stay._id });
      throw new Error('The selected room is already booked for the requested dates.');
    }

    if (advance > 0) {
      await Payment.create({
        stay: stay._id,
        guest,
        hostel,
        amount: advance,
        paymentMethod: paymentMethod || 'Cash',
        createdBy: req.user._id
      });
    }

    res.status(201).json({ success: true, data: stay });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.getStays = async (req, res, next) => {
  try {
    const filter = await getHostelFilter(req.user, req.query.hostel);

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const stays = await Stay.find(filter)
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack address gender dateOfBirth')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack address gender dateOfBirth')
      .populate('room', 'roomNumber price24h extraPerPerson24h')
      .populate('hostel', 'name address contactNumber')
      .populate('createdBy', 'name role')
      .sort('-expectedCheckOutDate')
      .lean();

    res.status(200).json({ success: true, count: stays.length, data: stays });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// ---------------------------------------------------------------------------
// Helper: load a stay and make sure the logged-in user is allowed to touch it.
// ---------------------------------------------------------------------------
const loadAuthorizedStay = async (req) => {
  const stay = await Stay.findById(req.params.id);
  if (!stay) {
    const err = new Error('Stay not found');
    err.statusCode = 404;
    throw err;
  }

  if (!(await userCanAccessHostel(req.user, stay.hostel))) {
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

// GET /api/stays/:id
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

exports.addCharge = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    if (!OPEN_STATUSES.includes(stay.status)) throw new Error('Charges can only be added to a guest who is still staying');

    const items = req.body.charges && Array.isArray(req.body.charges) ? req.body.charges : [req.body];
    let totalAdded = 0;

    for (const item of items) {
      const { description, category } = item;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const rate = Number(item.rate);
      const amount = Number.isFinite(rate) && item.rate !== undefined && item.rate !== ''
        ? rate * quantity
        : Number(item.amount);

      if (!description || !String(description).trim()) throw new Error('Please enter what the charge is for');
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Please enter a valid amount');

      stay.charges.push({
        description: String(description).trim(),
        category: category || 'Other',
        quantity,
        amount,
        addedBy: req.user._id
      });
      totalAdded += amount;
    }

    stay.additionalCharges = (stay.additionalCharges || 0) + totalAdded;
    stay.totalAmount += totalAdded;
    await stay.save();

    res.status(201).json({ success: true, data: stay });
  } catch (error) {
    sendError(res, next, error);
  }
};

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

exports.addPayment = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    if (stay.status === 'Cancelled') throw new Error('Stay is cancelled');

    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Please enter a valid amount');

    const balance = stay.totalAmount - stay.paidAmount;
    if (amount > balance + 0.01) throw new Error(`Amount is more than the balance due (₹${Math.max(0, balance)})`);

    const updated = await Stay.findOneAndUpdate(
      {
        _id: stay._id,
        status: { $ne: 'Cancelled' },
        $expr: {
          $lte: [{ $add: ['$paidAmount', amount] }, { $add: ['$totalAmount', 0.01] }]
        }
      },
      { $inc: { paidAmount: amount } },
      { new: true }
    );

    if (!updated) {
      const err = new Error('Could not record payment — balance may have changed. Please refresh and try again.');
      err.statusCode = 409;
      throw err;
    }

    await Payment.create({
      stay: stay._id,
      guest: stay.guest,
      hostel: stay.hostel,
      amount,
      paymentMethod: req.body.paymentMethod || 'Cash',
      notes: req.body.notes,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: updated });
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

    if (checkoutPayment < 0 || !Number.isFinite(checkoutPayment)) {
      throw new Error('Invalid payment amount');
    }

    // Apply checkout charges first (on the in-memory doc), then compute required payment
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

    const balanceDue = stay.totalAmount - stay.paidAmount;
    if (checkoutPayment > balanceDue + 0.01) {
      throw new Error('Payment is more than the balance due');
    }

    // Require full settlement (matches frontend CheckoutModal)
    if (checkoutPayment + 0.01 < balanceDue) {
      throw new Error(`Full payment required to checkout. Balance due: ₹${Math.max(0, balanceDue)}`);
    }

    // Atomic status flip — prevents double checkout
    const flipped = await Stay.findOneAndUpdate(
      { _id: stay._id, status: { $ne: 'Checked Out' } },
      {
        $set: {
          status: 'Checked Out',
          actualCheckOutDate: new Date(),
          charges: stay.charges,
          additionalCharges: stay.additionalCharges,
          totalAmount: stay.totalAmount,
          paidAmount: stay.paidAmount + checkoutPayment
        }
      },
      { new: true }
    );

    if (!flipped) {
      throw new Error('Stay is already checked out');
    }

    if (checkoutPayment > 0) {
      await Payment.create({
        stay: stay._id,
        guest: stay.guest,
        hostel: stay.hostel,
        amount: checkoutPayment,
        paymentMethod: paymentMethod || 'Cash',
        createdBy: req.user._id
      });
    }

    const payments = await Payment.find({ stay: stay._id }).sort('paymentDate');

    res.status(200).json({ success: true, data: flipped, payments });
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

    const oldOutDate = new Date(stay.expectedCheckOutDate);
    if (newOutDate <= oldOutDate) throw new Error('New checkout date must be after current checkout date');

    // Proper interval overlap vs other open stays on this room
    const overlapping = await Stay.findOne(
      roomOverlapFilter(stay.room, stay.checkInDate, newOutDate, stay._id)
    );
    if (overlapping) throw new Error('Cannot extend. Room is booked by another guest for the requested dates.');

    const additionalCost = Math.max(0, Number(req.body.additionalRent) || 0);
    const pay = Math.max(0, Number(extensionPayment) || 0);
    if (pay > stay.totalAmount + additionalCost - stay.paidAmount + 0.01) {
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
      await Payment.create({
        stay: stay._id,
        guest: stay.guest,
        hostel: stay.hostel,
        amount: pay,
        paymentMethod: paymentMethod || 'Cash',
        createdBy: req.user._id
      });
    }

    await stay.save();

    // Post-save overlap re-check
    const conflicts = await Stay.find(
      roomOverlapFilter(stay.room, stay.checkInDate, newOutDate, stay._id)
    );
    if (conflicts.length > 0) {
      stay.expectedCheckOutDate = oldOutDate;
      stay.totalAmount -= additionalCost;
      if (pay > 0) stay.paidAmount -= pay;
      await stay.save();
      throw new Error('Cannot extend. Room is booked by another guest for the requested dates.');
    }

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

    const overlapping = await Stay.findOne(
      roomOverlapFilter(newRoomId, new Date(), stay.expectedCheckOutDate, stay._id)
    );
    if (overlapping) throw new Error('New room is already booked for these dates');

    const oldRoom = await Room.findById(stay.room);
    const oldRoomNumber = oldRoom ? oldRoom.roomNumber : 'Unknown';
    const previousRoomId = stay.room;

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

    const conflicts = await Stay.find(
      roomOverlapFilter(newRoomId, new Date(), stay.expectedCheckOutDate, stay._id)
    );
    if (conflicts.length > 0) {
      stay.room = previousRoomId;
      if (priceAdjustment) stay.totalAmount = Math.max(0, stay.totalAmount - priceAdjustment);
      stay.roomHistory.pop();
      await stay.save();
      throw new Error('New room is already booked for these dates');
    }

    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    sendError(res, next, error);
  }
};

exports.deleteStay = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete stay' });
    }
    const stay = await loadAuthorizedStay(req);
    await Payment.deleteMany({ stay: stay._id });
    await stay.deleteOne();
    res.status(200).json({ success: true, message: 'Stay deleted successfully' });
  } catch (error) {
    sendError(res, next, error);
  }
};
