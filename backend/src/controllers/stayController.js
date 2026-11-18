const mongoose = require('mongoose');
const Stay = require('../models/Stay');
const Room = require('../models/Room');
const Payment = require('../models/Payment');
const Guest = require('../models/Guest');
const Hostel = require('../models/Hostel');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendWebPushToUsers } = require('../config/webPush');
const { assertHostelAccess, getHostelFilter, userCanAccessHostel } = require('../utils/hostelAccess');
const { recordLedgerImpact } = require('../utils/ledgerHelper');

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
      paymentMethod, splitPayments, durationOption, occupants, coGuests, commissionTo, commissionPhone, commissionAmount,
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

    const parsedCheckIn = new Date(checkInDate);
    if (isNaN(parsedCheckIn.getTime())) {
      throw new Error('Invalid check-in date');
    }

    let parsedExpectedOut = new Date(expectedCheckOutDate);
    if (isNaN(parsedExpectedOut.getTime()) || parsedExpectedOut <= parsedCheckIn) {
      // Auto-fallback: ensure expected checkout is at least 24 hours after check-in
      parsedExpectedOut = new Date(parsedCheckIn.getTime() + 24 * 60 * 60 * 1000);
    }

    const overlapping = await Stay.findOne(
      roomOverlapFilter(room, parsedCheckIn, parsedExpectedOut)
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
      checkInDate: parsedCheckIn,
      expectedCheckOutDate: parsedExpectedOut,
      actualCheckOutDate: parsedActualOut,
      status: isPastCheckout ? 'Checked Out' : 'Active',
      durationOption: durationOption || '24h',
      totalAmount,
      paidAmount: advance,
      occupants: occupants || 1,
      commissionTo: commissionTo || '',
      commissionPhone: (commissionPhone || '').trim(),
      commissionAmount: Number(commissionAmount) || 0,
      gstApplied: Boolean(req.body.gstApplied),
      gstType: req.body.gstType || 'none',
      gstRate: Number(req.body.gstRate) || 0,
      taxAmount: Number(req.body.taxAmount) || 0,
      companyName: (req.body.companyName || guestDoc.companyName || '').trim(),
      gstin: (req.body.gstin || guestDoc.gstin || '').trim().toUpperCase(),
      billingAddress: (req.body.billingAddress || guestDoc.address || '').trim(),
      createdBy: req.user._id
    });

    // If corporate details supplied during stay creation, sync with Guest profile
    if (req.body.companyName || req.body.gstin) {
      const gUpdate = {};
      if (req.body.companyName) gUpdate.companyName = req.body.companyName.trim();
      if (req.body.gstin) gUpdate.gstin = req.body.gstin.trim().toUpperCase();
      if (req.body.billingAddress && !guestDoc.address) gUpdate.address = req.body.billingAddress.trim();
      await Guest.findByIdAndUpdate(guestDoc._id, { $set: gUpdate });
    }

    // Double-check after create to shrink race window for double-booking
    const conflicts = await Stay.find(
      roomOverlapFilter(room, checkInDate, expectedCheckOutDate, stay._id)
    );
    if (conflicts.length > 0) {
      await Stay.deleteOne({ _id: stay._id });
      throw new Error('The selected room is already booked for the requested dates.');
    }

    if (advance > 0) {
      if (Array.isArray(splitPayments) && splitPayments.length > 0) {
        for (const sp of splitPayments) {
          const spAmt = Number(sp.amount);
          if (spAmt > 0) {
            const pMethod = sp.paymentMethod || 'Cash';
            await Payment.create({
              stay: stay._id,
              guest,
              hostel,
              amount: spAmt,
              paymentMethod: pMethod,
              notes: sp.notes || 'Advance Payment',
              createdBy: req.user._id
            });
            await recordLedgerImpact({
              guestId: guest,
              hostelId: hostel,
              stayId: stay._id,
              amount: spAmt,
              paymentMethod: pMethod,
              description: sp.notes || `Advance payment (${pMethod}) for room check-in`,
              userId: req.user._id
            });
          }
        }
      } else {
        const pMethod = paymentMethod || 'Cash';
        await Payment.create({
          stay: stay._id,
          guest,
          hostel,
          amount: advance,
          paymentMethod: pMethod,
          createdBy: req.user._id
        });
        await recordLedgerImpact({
          guestId: guest,
          hostelId: hostel,
          stayId: stay._id,
          amount: advance,
          paymentMethod: pMethod,
          description: `Advance payment (${pMethod}) for room check-in`,
          userId: req.user._id
        });
      }
    }

    // 🛎️ Trigger New Check-In Notification for Property Owner, Admins & All Staff
    try {
      const hostelDoc = await Hostel.findById(hostel).select('name owner createdBy');
      const recipientIds = new Set();
      if (hostelDoc?.owner) recipientIds.add(hostelDoc.owner.toString());
      if (hostelDoc?.createdBy) recipientIds.add(hostelDoc.createdBy.toString());
      if (req.user?._id) recipientIds.add(req.user._id.toString());

      // Also notify all active superadmins and admins
      const adminUsers = await User.find({
        role: { $in: ['superadmin', 'admin'] },
        isActive: { $ne: false }
      }, '_id').lean();
      adminUsers.forEach(u => recipientIds.add(u._id.toString()));

      // Also notify any staff/receptionist assigned to this hostel
      const assignedStaff = await User.find({
        assignedHostel: stay.hostel,
        isActive: { $ne: false }
      }, '_id').lean();
      assignedStaff.forEach(st => recipientIds.add(st._id.toString()));

      const rNum = roomDoc?.roomNumber || 'Room';
      const gName = (guestDoc?.fullName || 'Guest').trim();
      const hName = hostelDoc?.name || 'Hotel';
      const advText = advance > 0 ? ` (Advance: ₹${Number(advance).toLocaleString('en-IN')})` : '';

      // 📲 1. Dispatch Background Web Push IMMEDIATELY (Wakes up mobile even when closed!)
      sendWebPushToUsers(Array.from(recipientIds), {
        title: `🛎️ New Check-In: Room ${rNum}`,
        body: `${hName} • ${gName} checked in (Tariff: ₹${Number(totalAmount).toLocaleString('en-IN')}${advText})`,
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        tag: `checkin-${stay._id}`,
        vibrate: [250, 100, 250, 100, 250],
        data: {
          url: '/checkouts',
          stayId: stay._id.toString(),
          hotelName: hName
        }
      }).catch(err => console.error('[WebPush] Check-in push error:', err));

      // 📥 2. Save in-app notification record for unread bell counts
      for (const recId of recipientIds) {
        try {
          await Notification.create({
            recipient: recId,
            hostel: hostelDoc ? hostelDoc._id : hostel,
            stay: stay._id,
            type: 'checkin',
            title: `🛎️ New Check-In at ${hName}`,
            message: `Room ${rNum} • ${gName} checked in! Tariff: ₹${Number(totalAmount).toLocaleString('en-IN')}${advText}`,
            metadata: {
              hotelName: hName,
              roomNumber: String(rNum),
              guestName: gName,
              guestPhone: guestDoc?.mobileNumber || '',
              totalAmount: Number(totalAmount) || 0,
              paidAmount: Number(advance) || 0,
              stayId: stay._id.toString()
            }
          });
        } catch (singleErr) {
          // Ignore individual duplicate / error
        }
      }
    } catch (notifErr) {
      console.error('Failed to create check-in notification:', notifErr.message);
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
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber address gender dateOfBirth companyName gstin')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber address gender dateOfBirth companyName gstin')
      .populate('room', 'roomNumber price24h extraPerPerson24h')
      .populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix billTerms autoApplyGstOnCheckin')
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
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack address gender dateOfBirth companyName gstin')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack address gender dateOfBirth companyName gstin')
      .populate('room', 'roomNumber price24h extraPerPerson24h')
      .populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix billTerms autoApplyGstOnCheckin');
    const payments = await Payment.find({ stay: stay._id }).sort('paymentDate');
    res.status(200).json({ success: true, data: { stay, payments } });
  } catch (error) {
    sendError(res, next, error);
  }
};

exports.addCharge = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    // 🔒 Enforce active subscription plan!
    await assertHostelAccess(req.user, stay.hostel, true);
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
    // 🔒 Enforce active subscription plan!
    await assertHostelAccess(req.user, stay.hostel, true);
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

    const splitPayments = req.body.splitPayments;
    if (Array.isArray(splitPayments) && splitPayments.length > 0) {
      for (const sp of splitPayments) {
        const spAmt = Number(sp.amount);
        if (spAmt > 0) {
          const pMethod = sp.paymentMethod || 'Cash';
          await Payment.create({
            stay: stay._id,
            guest: stay.guest,
            hostel: stay.hostel,
            amount: spAmt,
            paymentMethod: pMethod,
            notes: sp.notes || req.body.notes || 'Payment',
            createdBy: req.user._id
          });
          await recordLedgerImpact({
            guestId: stay.guest,
            hostelId: stay.hostel,
            stayId: stay._id,
            amount: spAmt,
            paymentMethod: pMethod,
            description: sp.notes || req.body.notes || `Stay payment (${pMethod})`,
            userId: req.user._id
          });
        }
      }
    } else {
      const pMethod = req.body.paymentMethod || 'Cash';
      await Payment.create({
        stay: stay._id,
        guest: stay.guest,
        hostel: stay.hostel,
        amount,
        paymentMethod: pMethod,
        notes: req.body.notes,
        createdBy: req.user._id
      });
      await recordLedgerImpact({
        guestId: stay.guest,
        hostelId: stay.hostel,
        stayId: stay._id,
        amount,
        paymentMethod: pMethod,
        description: req.body.notes || `Stay payment (${pMethod})`,
        userId: req.user._id
      });
    }

    res.status(201).json({ success: true, data: updated });
  } catch (error) {
    sendError(res, next, error);
  }
};

exports.checkout = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    // 🔒 Enforce active subscription plan for checkout!
    await assertHostelAccess(req.user, stay.hostel, true);
    if (stay.status === 'Checked Out') throw new Error('Stay is already checked out');

    const additionalCharges = Number(req.body.additionalCharges) || 0;
    const checkoutPayment = Number(req.body.checkoutPayment) || 0;
    const { paymentMethod, splitPayments, additionalChargesNote } = req.body;

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

    const actualOut = req.body.actualCheckOutDate ? new Date(req.body.actualCheckOutDate) : new Date();
    const resolvedActualOut = isNaN(actualOut.getTime()) ? new Date() : actualOut;

    // Atomic status flip — prevents double checkout
    const flipped = await Stay.findOneAndUpdate(
      { _id: stay._id, status: { $ne: 'Checked Out' } },
      {
        $set: {
          status: 'Checked Out',
          actualCheckOutDate: resolvedActualOut,
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
      if (Array.isArray(splitPayments) && splitPayments.length > 0) {
        for (const sp of splitPayments) {
          const spAmt = Number(sp.amount);
          if (spAmt > 0) {
            const pMethod = sp.paymentMethod || 'Cash';
            await Payment.create({
              stay: stay._id,
              guest: stay.guest,
              hostel: stay.hostel,
              amount: spAmt,
              paymentMethod: pMethod,
              notes: sp.notes || 'Checkout Payment',
              createdBy: req.user._id
            });
            await recordLedgerImpact({
              guestId: stay.guest,
              hostelId: stay.hostel,
              stayId: stay._id,
              amount: spAmt,
              paymentMethod: pMethod,
              description: sp.notes || `Checkout payment (${pMethod})`,
              userId: req.user._id
            });
          }
        }
      } else {
        const pMethod = paymentMethod || 'Cash';
        await Payment.create({
          stay: stay._id,
          guest: stay.guest,
          hostel: stay.hostel,
          amount: checkoutPayment,
          paymentMethod: pMethod,
          createdBy: req.user._id
        });
        await recordLedgerImpact({
          guestId: stay.guest,
          hostelId: stay.hostel,
          stayId: stay._id,
          amount: checkoutPayment,
          paymentMethod: pMethod,
          description: `Checkout payment (${pMethod})`,
          userId: req.user._id
        });
      }
    }

    const payments = await Payment.find({ stay: stay._id }).sort('paymentDate');

    const populated = await Stay.findById(flipped._id)
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack address gender dateOfBirth companyName gstin')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack address gender dateOfBirth companyName gstin')
      .populate('room', 'roomNumber price24h extraPerPerson24h')
      .populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix billTerms autoApplyGstOnCheckin');

    // 🚪 Trigger Check-Out Notification for Property Owner & Admins
    try {
      const hostelDoc = await Hostel.findById(stay.hostel).select('name owner createdBy');
      const recipientIds = new Set();
      if (hostelDoc?.owner) recipientIds.add(hostelDoc.owner.toString());
      if (hostelDoc?.createdBy) recipientIds.add(hostelDoc.createdBy.toString());
      if (req.user?._id) recipientIds.add(req.user._id.toString());

      // Also notify all active superadmins and admins
      const adminUsers = await User.find({
        role: { $in: ['superadmin', 'admin'] },
        isActive: { $ne: false }
      }, '_id').lean();
      adminUsers.forEach(u => recipientIds.add(u._id.toString()));

      // Also notify any staff/receptionist assigned to this hostel
      const assignedStaff = await User.find({
        assignedHostel: stay.hostel,
        isActive: { $ne: false }
      }, '_id').lean();
      assignedStaff.forEach(st => recipientIds.add(st._id.toString()));

      const rNum = populated?.room?.roomNumber || 'Room';
      const gName = (populated?.guest?.fullName || 'Guest').trim();
      const hName = hostelDoc?.name || 'Hotel';
      const settledAmount = Number(checkoutPayment) || 0;
      const settText = settledAmount > 0 ? ` • Settled ₹${settledAmount.toLocaleString('en-IN')}` : ' • Settled';

      // 📲 1. Dispatch Background Web Push IMMEDIATELY (Wakes up mobile even when closed!)
      sendWebPushToUsers(Array.from(recipientIds), {
        title: `🚪 Check-Out: Room ${rNum}`,
        body: `${hName} • Room ${rNum} checked out by ${gName}${settText}`,
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        tag: `checkout-${stay._id}`,
        vibrate: [250, 100, 250, 100, 250],
        data: {
          url: '/checkouts',
          stayId: stay._id.toString(),
          hotelName: hName
        }
      }).catch(err => console.error('[WebPush] Checkout push error:', err));

      // 📥 2. Save in-app notification record for unread bell counts
      for (const recId of recipientIds) {
        try {
          await Notification.create({
            recipient: recId,
            hostel: hostelDoc ? hostelDoc._id : stay.hostel,
            stay: stay._id,
            type: 'checkout',
            title: `🚪 Check-Out: ${hName}`,
            message: `Room ${rNum} checked out by ${gName}${settText}`,
            metadata: {
              hotelName: hName,
              roomNumber: String(rNum),
              guestName: gName,
              guestPhone: populated?.guest?.mobileNumber || '',
              totalAmount: Number(stay.totalAmount) || 0,
              paidAmount: settledAmount,
              stayId: stay._id.toString()
            }
          });
        } catch (singleErr) {
          // Ignore individual duplicate / error
        }
      }
    } catch (notifErr) {
      console.error('Failed to create check-out notification:', notifErr.message);
    }

    res.status(200).json({ success: true, data: populated || flipped, payments });
  } catch (error) {
    sendError(res, next, error);
  }
};

exports.extendStay = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    if (!OPEN_STATUSES.includes(stay.status)) throw new Error('Only a guest who is still staying can be extended');

    const { newCheckOutDate, extensionPayment, paymentMethod, splitPayments } = req.body;
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
      if (Array.isArray(splitPayments) && splitPayments.length > 0) {
        for (const sp of splitPayments) {
          const spAmt = Number(sp.amount);
          if (spAmt > 0) {
            const pMethod = sp.paymentMethod || 'Cash';
            await Payment.create({
              stay: stay._id,
              guest: stay.guest,
              hostel: stay.hostel,
              amount: spAmt,
              paymentMethod: pMethod,
              notes: sp.notes || 'Extension Payment',
              createdBy: req.user._id
            });
            await recordLedgerImpact({
              guestId: stay.guest,
              hostelId: stay.hostel,
              stayId: stay._id,
              amount: spAmt,
              paymentMethod: pMethod,
              description: sp.notes || `Extension payment (${pMethod})`,
              userId: req.user._id
            });
          }
        }
      } else {
        const pMethod = paymentMethod || 'Cash';
        await Payment.create({
          stay: stay._id,
          guest: stay.guest,
          hostel: stay.hostel,
          amount: pay,
          paymentMethod: pMethod,
          createdBy: req.user._id
        });
        await recordLedgerImpact({
          guestId: stay.guest,
          hostelId: stay.hostel,
          stayId: stay._id,
          amount: pay,
          paymentMethod: pMethod,
          description: `Extension payment (${pMethod})`,
          userId: req.user._id
        });
      }
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

// @desc    Delete or cancel a stay entry (Mistake correction)
// @route   DELETE /api/stays/:id?mode=history_only|full
// @access  Private (Admin, Superadmin, Receptionist)
exports.deleteStay = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    await assertHostelAccess(req.user, stay.hostel, true);

    const mode = (req.query.mode || req.body?.mode || 'full').toLowerCase();

    if (mode === 'history_only' || mode === 'soft') {
      // MODE 1: Only remove stay from history / active list, but PRESERVE financial ledger records & payments
      stay.status = 'Cancelled';
      stay.notes = (stay.notes ? stay.notes + ' | ' : '') + `[Cancelled by ${req.user.name || req.user.email} on ${new Date().toLocaleString('en-IN')}]`;
      await stay.save();

      // Clean notifications for this stay
      await Notification.deleteMany({ stay: stay._id }).catch(() => {});

      return res.status(200).json({
        success: true,
        mode: 'history_only',
        message: 'Stay successfully removed from active history. Financial transactions were preserved.'
      });
    }

    // MODE 2: Complete Wipeout (Delete stay + all payments + revert ledger + cleanup)
    // 1. Revert any Ledger entries (Wallet / Khata) created for this stay
    try {
      const GuestLedger = require('../models/GuestLedger');
      const ledgerEntries = await GuestLedger.find({ stay: stay._id });
      for (const entry of ledgerEntries) {
        if (entry.guest && entry.amount) {
          const gDoc = await Guest.findById(entry.guest);
          if (gDoc) {
            // Revert deduction: add the amount back to ledgerBalance
            gDoc.ledgerBalance = Math.round(((Number(gDoc.ledgerBalance) || 0) + entry.amount) * 100) / 100;
            await gDoc.save().catch(() => {});
          }
        }
      }
      await GuestLedger.deleteMany({ stay: stay._id }).catch(() => {});
    } catch (ledgerErr) {
      console.warn('[deleteStay] Ledger reversal warning:', ledgerErr.message);
    }

    // 2. Delete all payments associated with this stay
    await Payment.deleteMany({ stay: stay._id }).catch(() => {});

    // 3. Delete laundry orders if any
    try {
      const LaundryOrder = require('../models/LaundryOrder');
      await LaundryOrder.deleteMany({ stay: stay._id }).catch(() => {});
    } catch (_) {}

    // 4. Delete notifications tied to this stay
    await Notification.deleteMany({ stay: stay._id }).catch(() => {});

    // 5. Delete the stay document itself
    await stay.deleteOne();

    return res.status(200).json({
      success: true,
      mode: 'full',
      message: 'Stay and all associated financial & ledger records completely wiped out.'
    });
  } catch (error) {
    sendError(res, next, error);
  }
};

// PUT /api/stays/:id - Edit Stay & Guest details
exports.updateStay = async (req, res, next) => {
  try {
    const stay = await loadAuthorizedStay(req);
    await assertHostelAccess(req.user, stay.hostel, true);

    const {
      checkInDate,
      expectedCheckOutDate,
      actualCheckOutDate,
      totalAmount,
      occupants,
      commissionTo,
      commissionPhone,
      commissionAmount,
      notes,
      guestData,
      payments: editedPayments,
      newPayment
    } = req.body;

    // 1. Update Stay Fields
    if (checkInDate) {
      const parsedIn = new Date(checkInDate);
      if (!isNaN(parsedIn.getTime())) {
        stay.checkInDate = parsedIn;
      }
    }

    if (expectedCheckOutDate) {
      const parsedOut = new Date(expectedCheckOutDate);
      if (!isNaN(parsedOut.getTime()) && parsedOut > stay.checkInDate) {
        stay.expectedCheckOutDate = parsedOut;
      }
    }

    if (actualCheckOutDate !== undefined) {
      if (actualCheckOutDate) {
        const parsedActual = new Date(actualCheckOutDate);
        if (!isNaN(parsedActual.getTime())) {
          stay.actualCheckOutDate = parsedActual;
        }
      } else {
        stay.actualCheckOutDate = undefined;
      }
    }

    if (totalAmount !== undefined && totalAmount !== '') {
      const amt = Number(totalAmount);
      if (Number.isFinite(amt) && amt >= 0) {
        stay.totalAmount = amt;
      }
    }

    if (occupants !== undefined) {
      const occ = Number(occupants);
      if (Number.isFinite(occ) && occ >= 1) {
        stay.occupants = occ;
      }
    }

    if (commissionTo !== undefined) stay.commissionTo = commissionTo;
    if (commissionPhone !== undefined) stay.commissionPhone = (commissionPhone || '').trim();
    if (commissionAmount !== undefined) stay.commissionAmount = Number(commissionAmount) || 0;
    if (notes !== undefined) stay.notes = notes;
    if (req.body.companyName !== undefined) stay.companyName = (req.body.companyName || '').trim();
    if (req.body.gstin !== undefined) stay.gstin = (req.body.gstin || '').trim().toUpperCase();
    if (req.body.billingAddress !== undefined) stay.billingAddress = (req.body.billingAddress || '').trim();
    if (req.body.gstApplied !== undefined) stay.gstApplied = Boolean(req.body.gstApplied);
    if (req.body.gstRate !== undefined) stay.gstRate = Number(req.body.gstRate) || 0;
    if (req.body.gstType !== undefined) stay.gstType = req.body.gstType;
    if (req.body.taxAmount !== undefined) stay.taxAmount = Number(req.body.taxAmount) || 0;

    await stay.save();

    // Sync corporate company details with Guest profile if provided
    if (req.body.companyName || req.body.gstin) {
      const gUpdate = {};
      if (req.body.companyName) gUpdate.companyName = (req.body.companyName || '').trim();
      if (req.body.gstin) gUpdate.gstin = (req.body.gstin || '').trim().toUpperCase();
      if (req.body.billingAddress) gUpdate.address = (req.body.billingAddress || '').trim();
      if (stay.guest) {
        await Guest.findByIdAndUpdate(stay.guest, { $set: gUpdate });
      }
    }

    // 2. Update Associated Guest if guestData provided
    if (guestData && typeof guestData === 'object' && stay.guest) {
      const allowedGuestFields = [
        'fullName', 'mobileNumber', 'idProofType', 'idProofNumber',
        'idProofImage', 'idProofImageBack', 'address', 'gender', 'dateOfBirth',
        'companyName', 'gstin'
      ];
      const guestUpdate = {};
      for (const field of allowedGuestFields) {
        if (guestData[field] !== undefined) {
          guestUpdate[field] = guestData[field];
        }
      }
      if (Object.keys(guestUpdate).length > 0) {
        await Guest.findByIdAndUpdate(stay.guest, { $set: guestUpdate });
      }
    }

    // 3. Update Payments & Mode (Cash, UPI, Card)
    if (Array.isArray(editedPayments)) {
      for (const p of editedPayments) {
        if (!p._id) continue;
        const existing = await Payment.findOne({ _id: p._id, stay: stay._id });
        if (existing) {
          if (p.amount !== undefined) {
            const amt = Number(p.amount);
            if (Number.isFinite(amt) && amt >= 0) existing.amount = amt;
          }
          if (p.paymentMethod) {
            existing.paymentMethod = p.paymentMethod;
          }
          if (p.notes !== undefined) existing.notes = p.notes;
          await existing.save();
        }
      }
    }

    if (newPayment && Number(newPayment.amount) > 0) {
      if (Array.isArray(newPayment.splitPayments) && newPayment.splitPayments.length > 0) {
        for (const sp of newPayment.splitPayments) {
          const spAmt = Number(sp.amount);
          if (spAmt > 0) {
            await Payment.create({
              stay: stay._id,
              guest: stay.guest,
              hostel: stay.hostel,
              amount: spAmt,
              paymentMethod: sp.paymentMethod || 'Cash',
              notes: sp.notes || newPayment.notes || 'Recorded via Edit (Mixed)',
              createdBy: req.user._id
            });
          }
        }
      } else {
        await Payment.create({
          stay: stay._id,
          guest: stay.guest,
          hostel: stay.hostel,
          amount: Number(newPayment.amount),
          paymentMethod: newPayment.paymentMethod || 'Cash',
          notes: newPayment.notes || 'Recorded via Edit',
          createdBy: req.user._id
        });
      }
    }

    // Recalculate and sync stay.paidAmount from actual payments
    const payTotal = await Payment.aggregate([
      { $match: { stay: stay._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    stay.paidAmount = payTotal.length > 0 ? payTotal[0].total : 0;
    await stay.save();

    // Return fresh populated stay
    const updatedStay = await Stay.findById(stay._id)
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack address gender dateOfBirth companyName gstin')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack address gender dateOfBirth companyName gstin')
      .populate('room', 'roomNumber price24h extraPerPerson24h')
      .populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix billTerms autoApplyGstOnCheckin');

    res.status(200).json({
      success: true,
      message: 'Stay, Guest, and Payment details updated successfully',
      data: updatedStay
    });
  } catch (error) {
    sendError(res, next, error);
  }
};

// @desc    Get aggregated list of all brokers / auto drivers / agents with contact and commission totals
// @route   GET /api/stays/brokers/summary
// @access  Private (Staff, Admin, SuperAdmin)
exports.getBrokersSummary = async (req, res, next) => {
  try {
    const hostelFilter = await getHostelFilter(req.user, req.query.hostel);

    let matchQuery = {
      ...hostelFilter,
      $or: [
        { commissionTo: { $exists: true, $ne: '' } },
        { commissionPhone: { $exists: true, $ne: '' } }
      ]
    };

    const stays = await Stay.find(matchQuery)
      .populate('guest', 'fullName mobileNumber')
      .populate('room', 'roomNumber')
      .populate('hostel', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const brokerMap = {};

    for (const s of stays) {
      const rawName = (s.commissionTo || '').trim();
      const rawPhone = (s.commissionPhone || '').trim();
      if (!rawName && !rawPhone) continue;

      const lowerName = rawName.toLowerCase();
      const invalidNames = ['none', 'na', 'n/a', 'no', '0', 'self', 'direct', '-', 'nil', 'null', 'false'];
      if (!rawPhone && invalidNames.includes(lowerName)) continue;

      // Group key: prefer normalized 10-digit phone, otherwise lowercase name
      const cleanPhoneDigits = rawPhone.replace(/\D/g, '').slice(-10);
      const key = cleanPhoneDigits ? `p_${cleanPhoneDigits}` : `n_${lowerName}`;

      if (!brokerMap[key]) {
        brokerMap[key] = {
          name: rawName || 'Auto / Agent',
          phone: rawPhone || '',
          totalStays: 0,
          totalCommission: 0,
          totalRevenue: 0,
          lastActive: s.createdAt || s.checkInDate,
          hostels: [],
          hostelNames: [],
          recentStays: []
        };
      }

      const b = brokerMap[key];
      if (rawName && (!b.name || b.name === 'Auto / Agent') && !invalidNames.includes(lowerName)) {
        b.name = rawName;
      }
      if (rawPhone && !b.phone) b.phone = rawPhone;
      b.totalStays += 1;
      b.totalBookings = b.totalStays;
      b.totalCommission += (Number(s.commissionAmount) || 0);
      b.totalRevenue += (Number(s.totalAmount) || 0);
      b.totalHotelRevenue = b.totalRevenue;

      const hId = s.hostel?._id ? s.hostel._id.toString() : (s.hostel ? s.hostel.toString() : '');
      const hName = s.hostel?.name || '';
      if (hId && !b.hostels.includes(hId)) {
        b.hostels.push(hId);
      }
      if (hName && !b.hostelNames.includes(hName)) {
        b.hostelNames.push(hName);
      }

      const stayDate = s.checkInDate || s.createdAt;
      if (stayDate && new Date(stayDate) > new Date(b.lastActive)) {
        b.lastActive = stayDate;
      }

      if (b.recentStays.length < 8) {
        b.recentStays.push({
          stayId: s._id,
          bookingNumber: s.bookingNumber,
          guestName: s.guest?.fullName || 'Guest',
          guestPhone: s.guest?.mobileNumber || '',
          roomNumber: s.room?.roomNumber || '—',
          checkInDate: s.checkInDate || s.createdAt,
          commission: Number(s.commissionAmount) || 0,
          totalAmount: Number(s.totalAmount) || 0,
          hostelName: s.hostel?.name || ''
        });
      }
    }

    const brokersList = Object.values(brokerMap).sort((a, b) => b.totalStays - a.totalStays);

    res.status(200).json({
      success: true,
      data: {
        totalBrokers: brokersList.length,
        totalCommission: brokersList.reduce((acc, b) => acc + b.totalCommission, 0),
        totalCommissionPaid: brokersList.reduce((acc, b) => acc + b.totalCommission, 0),
        totalBookings: brokersList.reduce((acc, b) => acc + b.totalStays, 0),
        totalBookingsReferred: brokersList.reduce((acc, b) => acc + b.totalStays, 0),
        totalHotelRevenue: brokersList.reduce((acc, b) => acc + b.totalRevenue, 0),
        brokers: brokersList
      }
    });
  } catch (error) {
    sendError(res, next, error);
  }
};

