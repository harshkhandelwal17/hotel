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

/**
 * Resolve recipients strictly belonging to THIS specific hotel property.
 * Prevents cross-property leakage so other hotel owners (role: 'admin') NEVER receive alerts of another hotel!
 */
const getHotelPropertyNotificationRecipients = async (hostelId, reqUser = null) => {
  const recipientIds = new Set();
  try {
    const rawId = typeof hostelId === 'object' && hostelId !== null
      ? (hostelId._id || hostelId)
      : hostelId;

    const hostelDoc = await Hostel.findById(rawId).select('name owner createdBy');
    if (hostelDoc?.owner) recipientIds.add(hostelDoc.owner.toString());
    if (hostelDoc?.createdBy) recipientIds.add(hostelDoc.createdBy.toString());

    // Staff / receptionists assigned strictly to THIS hotel
    const staff = await User.find({
      assignedHostel: rawId,
      isActive: { $ne: false }
    }, '_id').lean();
    staff.forEach(s => recipientIds.add(s._id.toString()));

    // User who performed the check-in / check-out
    if (reqUser?._id) {
      recipientIds.add(reqUser._id.toString());
    }

    // Platform Super Admin (platform master overseer only - NEVER other hotel admins!)
    const superAdmins = await User.find({
      role: 'superadmin',
      isActive: { $ne: false }
    }, '_id').lean();
    superAdmins.forEach(sa => recipientIds.add(sa._id.toString()));

    return {
      recipientIds: Array.from(recipientIds),
      hostelDoc
    };
  } catch (err) {
    console.warn('Error resolving hotel notification recipients:', err.message);
    return { recipientIds: [], hostelDoc: null };
  }
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

    const isPastCheckout = Boolean(isAlreadyCheckedOut);
    const parsedActualOut = isPastCheckout 
      ? new Date(actualCheckOutDate || expectedCheckOutDate) 
      : undefined;

    if (isPastCheckout && parsedActualOut && !isNaN(parsedActualOut.getTime())) {
      parsedExpectedOut = parsedActualOut;
    }

    const overlapEnd = isPastCheckout && parsedActualOut ? parsedActualOut : parsedExpectedOut;
    const overlapping = await Stay.findOne(
      roomOverlapFilter(room, parsedCheckIn, overlapEnd)
    );
    if (overlapping) {
      throw new Error('The selected room is already booked for the requested dates.');
    }

    const roomDoc = await Room.findById(room);
    if (!roomDoc) throw new Error('Room not found');
    if (roomDoc.hostel.toString() !== hostel.toString()) {
      throw new Error('This room does not belong to the selected property');
    }
    if (!isPastCheckout && roomDoc.status !== 'Active') {
      throw new Error(`Room ${roomDoc.roomNumber} is not available (${roomDoc.status})`);
    }

    let totalAmount = Number(req.body.totalAmount) || 0;
    totalAmount = Math.max(0, totalAmount);
    const advance = Number(initialPaymentAmount) || 0;
    if (advance > totalAmount) {
      throw new Error('Advance payment cannot be more than the total amount');
    }

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
      roomOverlapFilter(room, parsedCheckIn, overlapEnd, stay._id)
    );
    if (conflicts.length > 0) {
      await Stay.deleteOne({ _id: stay._id });
      throw new Error('The selected room is already booked for the requested dates.');
    }

    if (advance > 0) {
      const payDate = isPastCheckout && parsedActualOut ? parsedActualOut : new Date();
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
              paymentDate: payDate,
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
          paymentDate: payDate,
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

    // 🛎️ Trigger New Check-In Notification strictly for THIS Property's Owner & Staff
    try {
      const { recipientIds, hostelDoc } = await getHotelPropertyNotificationRecipients(hostel, req.user);

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

// ---------------------------------------------------------------------------
// Helper: detect if a group's payments are skewed (e.g. leader has all advance)
// ---------------------------------------------------------------------------
const checkGroupNeedsRebalance = (items) => {
  if (!items || items.length <= 1) return false;
  const hasOverpaid = items.some(s => (Number(s.paidAmount) || 0) > (Number(s.totalAmount) || 0));
  const singleHoldingAll = items.filter(s => (Number(s.paidAmount) || 0) > 0).length === 1 &&
    items.some(s => (Number(s.paidAmount) || 0) === 0);
  const hasZeroTariffSkew = items.some(s => (Number(s.totalAmount) || 0) === 0) &&
    items.some(s => (Number(s.totalAmount) || 0) > 0);
  return hasOverpaid || singleHoldingAll || hasZeroTariffSkew;
};

// ---------------------------------------------------------------------------
// Helper: evenly & proportionately distribute advance across rooms in a group
// ---------------------------------------------------------------------------
const autoRebalanceGroupStays = async (groupId) => {
  if (!groupId) return;
  try {
    const groupStays = await Stay.find({ groupId }).lean();
    if (!groupStays || groupStays.length <= 1) return;

    if (!checkGroupNeedsRebalance(groupStays)) return;

    const groupPayments = await Payment.find({
      $or: [{ groupId }, { stay: { $in: groupStays.map(s => s._id) } }]
    }).lean();

    const totalPaid = groupPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    let totalTariff = groupStays.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);

    // If some rooms in this group have totalAmount === 0 while group totalTariff > 0,
    // rebalance totalAmount equally across all rooms so no room gets 0 tariff
    const hasZeroTariffSkew = groupStays.some(s => (Number(s.totalAmount) || 0) === 0) && totalTariff > 0;
    if (hasZeroTariffSkew) {
      const baseTariff = Math.floor(totalTariff / groupStays.length);
      const remTariff = totalTariff % groupStays.length;
      for (let i = 0; i < groupStays.length; i++) {
        const newTariff = (i === groupStays.length - 1) ? baseTariff + remTariff : baseTariff;
        groupStays[i].totalAmount = newTariff;
        await Stay.findByIdAndUpdate(groupStays[i]._id, { $set: { totalAmount: newTariff } });
      }
    }

    let allocated = 0;
    for (let i = 0; i < groupStays.length; i++) {
      const gs = groupStays[i];
      let newPaid = 0;
      if (totalPaid >= totalTariff) {
        newPaid = Number(gs.totalAmount) || 0;
      } else if (totalTariff > 0) {
        if (i === groupStays.length - 1) {
          newPaid = Math.max(0, totalPaid - allocated);
        } else {
          newPaid = Math.min(Number(gs.totalAmount) || 0, Math.round(((Number(gs.totalAmount) || 0) / totalTariff) * totalPaid));
          allocated += newPaid;
        }
      }
      await Stay.findByIdAndUpdate(gs._id, { $set: { paidAmount: newPaid } });

      const existingPay = await Payment.findOne({ stay: gs._id });
      if (!existingPay && newPaid > 0) {
        await Payment.create({
          stay: gs._id,
          groupId,
          guest: gs.guest,
          hostel: gs.hostel,
          amount: newPaid,
          paymentMethod: groupPayments[0]?.paymentMethod || 'Cash',
          notes: `Group Advance (${groupStays[0].groupName || 'Group'})`,
          createdBy: groupPayments[0]?.createdBy
        });
        await recordLedgerImpact({
          guestId: gs.guest,
          hostelId: gs.hostel,
          stayId: gs._id,
          amount: newPaid,
          paymentMethod: groupPayments[0]?.paymentMethod || 'Cash',
          description: `Group Advance (${groupStays[0].groupName || 'Group'})`,
          userId: groupPayments[0]?.createdBy
        });
      } else if (existingPay && Number(existingPay.amount) !== newPaid) {
        await Payment.findByIdAndUpdate(existingPay._id, { $set: { amount: newPaid } });
      }
    }
  } catch (err) {
    console.warn('Auto-rebalance group stays error:', err.message);
  }
};

exports.getStays = async (req, res, next) => {
  try {
    const filter = await getHostelFilter(req.user, req.query.hostel);

    if (req.query.status) {
      filter.status = req.query.status;
    }

    let stays = await Stay.find(filter)
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber address gender dateOfBirth companyName gstin')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber address gender dateOfBirth companyName gstin')
      .populate('room', 'roomNumber price24h extraPerPerson24h')
      .populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix billTerms autoApplyGstOnCheckin')
      .populate('createdBy', 'name role')
      .sort('-expectedCheckOutDate')
      .lean();

    if (stays.some(s => s.groupId)) {
      const gIds = Array.from(new Set(stays.filter(s => s.groupId).map(s => s.groupId)));
      let rebalancedAny = false;
      for (const gId of gIds) {
        const groupItems = stays.filter(s => s.groupId === gId);
        if (checkGroupNeedsRebalance(groupItems)) {
          await autoRebalanceGroupStays(gId);
          rebalancedAny = true;
        }
      }
      if (rebalancedAny) {
        stays = await Stay.find(filter)
          .populate('guest', 'fullName mobileNumber idProofType idProofNumber address gender dateOfBirth companyName gstin')
          .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber address gender dateOfBirth companyName gstin')
          .populate('room', 'roomNumber price24h extraPerPerson24h')
          .populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix billTerms autoApplyGstOnCheckin')
          .populate('createdBy', 'name role')
          .sort('-expectedCheckOutDate')
          .lean();
      }
    }

    res.status(200).json({ success: true, count: stays.length, data: stays });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

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

// GET /api/stays/:id (Blazing fast parallel lookup)
exports.getStay = async (req, res, next) => {
  try {
    const stayId = req.params.id;
    let [stay, payments] = await Promise.all([
      Stay.findById(stayId)
        .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack address gender dateOfBirth companyName gstin')
        .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber address gender dateOfBirth companyName gstin')
        .populate('room', 'roomNumber price24h extraPerPerson24h')
        .populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix billTerms autoApplyGstOnCheckin')
        .lean(),
      Payment.find({ stay: stayId }).sort('paymentDate').lean()
    ]);

    if (!stay) {
      return res.status(404).json({ success: false, message: 'Stay not found' });
    }
    const hostelId = stay.hostel?._id || stay.hostel;
    if (!(await userCanAccessHostel(req.user, hostelId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this stay' });
    }

    if (stay.groupId) {
      await autoRebalanceGroupStays(stay.groupId);
      const refreshed = await Stay.findById(stayId)
        .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack address gender dateOfBirth companyName gstin')
        .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber address gender dateOfBirth companyName gstin')
        .populate('room', 'roomNumber price24h extraPerPerson24h')
        .populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix billTerms autoApplyGstOnCheckin')
        .lean();
      if (refreshed) stay = refreshed;
      payments = await Payment.find({ stay: stayId }).sort('paymentDate').lean();
    }

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

    const rawBalanceDue = stay.totalAmount - stay.paidAmount;
    if (rawBalanceDue > 0) {
      if (checkoutPayment > rawBalanceDue + 0.01) {
        throw new Error('Payment is more than the balance due');
      }

      // Require full settlement (matches frontend CheckoutModal)
      if (checkoutPayment + 0.01 < rawBalanceDue) {
        throw new Error(`Full payment required to checkout. Balance due: ₹${Math.max(0, rawBalanceDue)}`);
      }
    } else {
      if (checkoutPayment > 0.01) {
        throw new Error('No additional payment is required for this stay');
      }
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
              paymentDate: resolvedActualOut,
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
          paymentDate: resolvedActualOut,
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

    // 🚪 Trigger Check-Out Notification strictly for THIS Property's Owner & Staff
    try {
      const { recipientIds, hostelDoc } = await getHotelPropertyNotificationRecipients(stay.hostel, req.user);

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
    const currentDue = Math.max(0, stay.totalAmount + additionalCost - stay.paidAmount);
    if (pay > currentDue + 0.01) {
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

      if (stay.groupId) {
        const remainingCount = await Stay.countDocuments({
          groupId: stay.groupId,
          _id: { $ne: stay._id },
          status: { $ne: 'Cancelled' }
        });
        await Stay.updateMany(
          { groupId: stay.groupId },
          { $set: { groupTotalRooms: remainingCount } }
        ).catch(() => {});
      }

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

    if (stay.groupId) {
      const remainingCount = await Stay.countDocuments({
        groupId: stay.groupId,
        status: { $ne: 'Cancelled' }
      });
      await Stay.updateMany(
        { groupId: stay.groupId },
        { $set: { groupTotalRooms: remainingCount } }
      ).catch(() => {});
    }

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

// ===========================================================================
// GROUP BOOKINGS (Multi-Room Corporate & Family Check-In / Management / Checkout)
// ===========================================================================

/**
 * @desc    Check-in multiple rooms simultaneously under a single Group Folio
 * @route   POST /api/stays/group-checkin
 * @access  Private (Receptionist, Admin, Superadmin)
 */
exports.createGroupStay = async (req, res, next) => {
  try {
    const {
      rooms, primaryGuest, groupName, groupType, checkInDate, expectedCheckOutDate,
      durationOption, initialPaymentAmount, paymentMethod, splitPayments,
      gstApplied, gstType, gstRate, companyName, gstin, billingAddress,
      commissionTo, commissionPhone, commissionAmount, notes,
      isAlreadyCheckedOut, actualCheckOutDate
    } = req.body;

    let hostel = req.user.assignedHostel;
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      if (!req.body.hostel && Array.isArray(rooms) && rooms.length > 0) {
        const firstRoomId = rooms[0].room || rooms[0].roomId;
        const firstRoomDoc = await Room.findById(firstRoomId).select('hostel');
        if (firstRoomDoc?.hostel) {
          req.body.hostel = firstRoomDoc.hostel;
        }
      }
      if (!req.body.hostel) throw new Error('Hostel is required');
      await assertHostelAccess(req.user, req.body.hostel, true);
      hostel = req.body.hostel;
    } else {
      await assertHostelAccess(req.user, hostel, true);
    }

    if (!Array.isArray(rooms) || rooms.length === 0) {
      throw new Error('At least one room must be selected for group check-in');
    }

    if (!primaryGuest || !primaryGuest.fullName || !primaryGuest.mobileNumber) {
      throw new Error('Primary booker full name and mobile number are required');
    }

    const parsedCheckIn = new Date(checkInDate);
    if (isNaN(parsedCheckIn.getTime())) {
      throw new Error('Invalid check-in date');
    }

    let parsedExpectedOut = new Date(expectedCheckOutDate);
    if (isNaN(parsedExpectedOut.getTime()) || parsedExpectedOut <= parsedCheckIn) {
      parsedExpectedOut = new Date(parsedCheckIn.getTime() + 24 * 60 * 60 * 1000);
    }

    const isPastCheckout = Boolean(isAlreadyCheckedOut);
    const parsedActualOut = isPastCheckout 
      ? new Date(actualCheckOutDate || expectedCheckOutDate) 
      : undefined;

    if (isPastCheckout && parsedActualOut && !isNaN(parsedActualOut.getTime())) {
      parsedExpectedOut = parsedActualOut;
    }

    // 1. Validate all rooms and check for overlapping reservations
    const roomIds = rooms.map(r => r.room || r.roomId);
    const uniqueRoomIds = new Set(roomIds.map(id => id.toString()));
    if (uniqueRoomIds.size !== roomIds.length) {
      throw new Error('Duplicate rooms selected in the group');
    }

    const roomDocs = await Room.find({ _id: { $in: roomIds } });
    if (roomDocs.length !== roomIds.length) {
      throw new Error('One or more selected rooms were not found');
    }

    const overlapEnd = isPastCheckout && parsedActualOut ? parsedActualOut : parsedExpectedOut;

    for (const rDoc of roomDocs) {
      if (rDoc.hostel.toString() !== hostel.toString()) {
        throw new Error(`Room ${rDoc.roomNumber} does not belong to this property`);
      }
      if (!isPastCheckout && rDoc.status !== 'Active') {
        throw new Error(`Room ${rDoc.roomNumber} is currently not available (${rDoc.status})`);
      }
      const overlapping = await Stay.findOne(
        roomOverlapFilter(rDoc._id, parsedCheckIn, overlapEnd)
      );
      if (overlapping) {
        throw new Error(`Room ${rDoc.roomNumber} is already booked for the selected dates`);
      }
    }

    // 2. Resolve / Create Primary Guest
    let primaryGuestDoc;
    if (primaryGuest._id) {
      primaryGuestDoc = await Guest.findById(primaryGuest._id);
    }
    if (!primaryGuestDoc && primaryGuest.mobileNumber) {
      primaryGuestDoc = await Guest.findOne({
        mobileNumber: primaryGuest.mobileNumber.trim(),
        hostel
      });
    }

    const primaryGuestPayload = {
      fullName: primaryGuest.fullName.trim(),
      mobileNumber: primaryGuest.mobileNumber.trim(),
      email: primaryGuest.email ? primaryGuest.email.trim() : undefined,
      idProofType: primaryGuest.idProofType || 'Aadhaar',
      idProofNumber: primaryGuest.idProofNumber ? primaryGuest.idProofNumber.trim() : '',
      idProofImage: primaryGuest.idProofImage || '',
      idProofImageBack: primaryGuest.idProofImageBack || '',
      address: (primaryGuest.address || billingAddress || '').trim(),
      gender: primaryGuest.gender || '',
      dateOfBirth: primaryGuest.dateOfBirth || '',
      companyName: (companyName || primaryGuest.companyName || '').trim(),
      gstin: (gstin || primaryGuest.gstin || '').trim().toUpperCase(),
      hostel
    };

    if (primaryGuestDoc) {
      Object.assign(primaryGuestDoc, primaryGuestPayload);
      await primaryGuestDoc.save();
    } else {
      primaryGuestDoc = await Guest.create(primaryGuestPayload);
    }

    // 3. Generate Unique Group Identifier
    const timestampStr = Date.now().toString(36).toUpperCase();
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const groupId = `GRP-${timestampStr}-${randSuffix}`;
    const resolvedGroupName = (groupName && groupName.trim()) || `${primaryGuestDoc.fullName}'s Group`;

    // 4. Calculate tariffs & distribute advance proportionately across all rooms
    const advance = Math.max(0, Number(initialPaymentAmount) || 0);
    let roomRates = rooms.map(roomItem => {
      const rId = roomItem.room || roomItem.roomId;
      const rDoc = roomDocs.find(d => d._id.toString() === rId.toString());
      return Math.max(0, Number(roomItem.rate ?? roomItem.price ?? rDoc?.price24h) || 0);
    });
    const groupGrandTotal = roomRates.reduce((sum, r) => sum + r, 0);

    // If total tariff > 0, but any room is 0 (unconfigured price or skewed allocation),
    // rebalance rates equally so no room receives 0 tariff
    if (groupGrandTotal > 0 && roomRates.some(r => r === 0) && rooms.length > 1) {
      const basePerRoom = Math.floor(groupGrandTotal / rooms.length);
      const rem = groupGrandTotal % rooms.length;
      roomRates = roomRates.map((_, idx) => (idx === rooms.length - 1 ? basePerRoom + rem : basePerRoom));
    }

    let allocatedAdvance = 0;
    const createdStays = [];

    for (let i = 0; i < rooms.length; i++) {
      const roomItem = rooms[i];
      const rId = roomItem.room || roomItem.roomId;
      const rDoc = roomDocs.find(d => d._id.toString() === rId.toString());

      // Resolve room guest (either specific guest or default to primaryGuest)
      let roomGuestId = primaryGuestDoc._id;
      if (roomItem.guest && roomItem.guest.fullName && roomItem.guest.fullName !== primaryGuestDoc.fullName) {
        let subGuest;
        if (roomItem.guest._id) {
          subGuest = await Guest.findById(roomItem.guest._id);
        } else if (roomItem.guest.mobileNumber) {
          subGuest = await Guest.findOne({ mobileNumber: roomItem.guest.mobileNumber.trim(), hostel });
        }
        if (!subGuest) {
          subGuest = await Guest.create({
            fullName: roomItem.guest.fullName.trim(),
            mobileNumber: (roomItem.guest.mobileNumber || primaryGuestDoc.mobileNumber).trim(),
            idProofType: roomItem.guest.idProofType || 'Aadhaar',
            idProofNumber: roomItem.guest.idProofNumber || '',
            address: roomItem.guest.address || primaryGuestDoc.address || '',
            hostel
          });
        }
        roomGuestId = subGuest._id;
      }

      const roomRate = roomRates[i];

      // Distribute group advance proportionately across each room
      let stayPaid = 0;
      if (advance > 0) {
        if (groupGrandTotal > 0) {
          if (i === rooms.length - 1) {
            stayPaid = Math.max(0, advance - allocatedAdvance);
          } else {
            stayPaid = Math.min(roomRate, Math.round((roomRate / groupGrandTotal) * advance));
            allocatedAdvance += stayPaid;
          }
        } else {
          stayPaid = i === rooms.length - 1 ? (advance - allocatedAdvance) : Math.floor(advance / rooms.length);
          allocatedAdvance += stayPaid;
        }
      }

      // Calculate GST if applied
      let taxAmount = 0;
      if (gstApplied && Number(gstRate) > 0) {
        if (gstType === 'inclusive') {
          taxAmount = Math.round((roomRate - (roomRate / (1 + Number(gstRate) / 100))) * 100) / 100;
        } else {
          taxAmount = Math.round((roomRate * (Number(gstRate) / 100)) * 100) / 100;
        }
      }

      const isLeader = (i === 0);

      const stay = await Stay.create({
        guest: roomGuestId,
        hostel,
        room: rDoc._id,
        occupants: Math.max(1, Number(roomItem.occupants) || 1),
        coGuests: Array.isArray(roomItem.coGuests) ? roomItem.coGuests : [],
        checkInDate: parsedCheckIn,
        expectedCheckOutDate: parsedExpectedOut,
        actualCheckOutDate: parsedActualOut,
        status: isPastCheckout ? 'Checked Out' : 'Active',
        durationOption: durationOption || '24h',
        totalAmount: roomRate,
        paidAmount: stayPaid,
        // Group linkage
        groupId,
        groupName: resolvedGroupName,
        groupType: groupType || 'Corporate',
        isGroupLeader: isLeader,
        groupTotalRooms: rooms.length,
        billingType: 'group_master',
        // GST & Corporate details
        gstApplied: Boolean(gstApplied),
        gstType: gstType || 'none',
        gstRate: Number(gstRate) || 0,
        taxAmount,
        companyName: (companyName || '').trim(),
        gstin: (gstin || '').trim().toUpperCase(),
        billingAddress: (billingAddress || '').trim(),
        commissionTo: isLeader ? (commissionTo || '').trim() : '',
        commissionPhone: isLeader ? (commissionPhone || '').trim() : '',
        commissionAmount: isLeader ? (Number(commissionAmount) || 0) : 0,
        notes: (notes || '').trim(),
        createdBy: req.user._id
      });

      createdStays.push(stay);
    }

    const leaderStay = createdStays[0];

    // 5. Record Advance Payment for each room
    if (advance > 0) {
      const pMethod = paymentMethod === 'Mixed' ? 'Mixed' : (paymentMethod || 'Cash');
      const payDate = isPastCheckout && parsedActualOut ? parsedActualOut : new Date();
      for (const st of createdStays) {
        if (st.paidAmount > 0) {
          await Payment.create({
            stay: st._id,
            groupId,
            guest: st.guest,
            hostel,
            amount: st.paidAmount,
            paymentMethod: pMethod,
            paymentDate: payDate,
            notes: `Group Advance (${resolvedGroupName})`,
            createdBy: req.user._id
          });
          await recordLedgerImpact({
            guestId: st.guest,
            hostelId: hostel,
            stayId: st._id,
            amount: st.paidAmount,
            paymentMethod: pMethod,
            description: `Group Advance payment (${pMethod}) for ${resolvedGroupName}`,
            userId: req.user._id
          });
        }
      }
    }

    // 6. Dispatch Web Push Notifications strictly to THIS Property's Staff & Owner
    try {
      const { recipientIds, hostelDoc } = await getHotelPropertyNotificationRecipients(hostel, req.user);

      const roomNumbersList = roomDocs.map(r => r.roomNumber).join(', ');
      const hName = hostelDoc?.name || 'Hotel';
      const advText = advance > 0 ? ` • Advance: ₹${Number(advance).toLocaleString('en-IN')}` : '';

      sendWebPushToUsers(Array.from(recipientIds), {
        title: `🏢 Group Check-In: ${resolvedGroupName} (${rooms.length} Rooms)`,
        body: `${hName} • Rooms: ${roomNumbersList} • Total: ₹${Number(groupGrandTotal).toLocaleString('en-IN')}${advText}`,
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        tag: `grp-checkin-${groupId}`,
        vibrate: [250, 100, 250, 100, 250],
        data: { url: '/receptionist/rooms' }
      }).catch(err => console.warn('Group WebPush failed:', err.message));

      // Save in-app notification record for bell counts
      for (const recId of recipientIds) {
        try {
          await Notification.create({
            recipient: recId,
            hostel,
            stay: leaderStay._id,
            type: 'checkin',
            title: `🏢 Group Check-In: ${resolvedGroupName}`,
            message: `${hName} • Rooms: ${roomNumbersList} • Total: ₹${Number(groupGrandTotal).toLocaleString('en-IN')}${advText}`,
            metadata: {
              hotelName: hName,
              groupName: resolvedGroupName,
              totalAmount: Number(groupGrandTotal) || 0,
              paidAmount: Number(advance) || 0,
              roomCount: rooms.length,
              stayId: leaderStay._id.toString()
            }
          });
        } catch (singleErr) {}
      }
    } catch (notifErr) {
      console.warn('Group notification dispatch warning:', notifErr.message);
    }

    // Return populated response
    const populatedStays = await Stay.find({ groupId })
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber address gender dateOfBirth companyName gstin')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber address gender dateOfBirth companyName gstin')
      .populate('room', 'roomNumber price24h extraPerPerson24h')
      .populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix billTerms autoApplyGstOnCheckin')
      .populate('createdBy', 'name role')
      .lean();

    res.status(201).json({
      success: true,
      message: `Group check-in completed for ${rooms.length} rooms successfully!`,
      data: {
        groupId,
        groupName: resolvedGroupName,
        groupType: groupType || 'Corporate',
        totalRooms: rooms.length,
        groupGrandTotal,
        advancePaid: advance,
        balanceDue: Math.max(0, groupGrandTotal - advance),
        stays: populatedStays
      }
    });
  } catch (error) {
    sendError(res, next, error);
  }
};

/**
 * @desc    Fetch all stays and payments associated with a group
 * @route   GET /api/stays/group/:groupId
 * @access  Private (Receptionist, Admin, Superadmin)
 */
exports.getGroupStays = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    if (!groupId) {
      return res.status(400).json({ success: false, message: 'Group ID is required' });
    }

    await autoRebalanceGroupStays(groupId);

    const stays = await Stay.find({ groupId })
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack address gender dateOfBirth companyName gstin')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber address gender dateOfBirth companyName gstin')
      .populate('room', 'roomNumber price24h extraPerPerson24h')
      .populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix billTerms autoApplyGstOnCheckin')
      .populate('createdBy', 'name role')
      .sort('createdAt')
      .lean();

    if (!stays || stays.length === 0) {
      return res.status(404).json({ success: false, message: 'No stays found for this group ID' });
    }

    // Verify hostel access
    const hostelId = stays[0].hostel?._id || stays[0].hostel;
    if (!(await userCanAccessHostel(req.user, hostelId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this property group' });
    }

    const stayIds = stays.map(s => s._id);
    const payments = await Payment.find({
      $or: [{ groupId }, { stay: { $in: stayIds } }]
    }).sort('paymentDate').lean();

    // Calculate aggregated totals
    let totalTariff = 0;
    let totalAdditionalCharges = 0;
    let totalStayAmount = 0;
    let totalPaidFromPayments = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    for (const s of stays) {
      totalStayAmount += (Number(s.totalAmount) || 0);
      totalAdditionalCharges += (Number(s.additionalCharges) || 0);
    }

    const balanceDue = Math.max(0, totalStayAmount - totalPaidFromPayments);

    res.status(200).json({
      success: true,
      data: {
        groupId,
        groupName: stays[0].groupName || 'Group',
        groupType: stays[0].groupType || 'Corporate',
        roomCount: stays.length,
        stays,
        payments,
        summary: {
          totalStayAmount,
          totalAdditionalCharges,
          totalPaid: totalPaidFromPayments,
          balanceDue,
          allCheckedOut: stays.every(s => s.status === 'Checked Out' || s.status === 'Cancelled')
        }
      }
    });
  } catch (error) {
    sendError(res, next, error);
  }
};

/**
 * @desc    Simultaneously check-out all active rooms in a group and settle master bill
 * @route   POST /api/stays/group/:groupId/checkout
 * @access  Private (Receptionist, Admin, Superadmin)
 */
exports.groupCheckout = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { checkoutPayment, paymentMethod, splitPayments, notes } = req.body;

    const stays = await Stay.find({ groupId });
    if (!stays || stays.length === 0) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const hostelId = stays[0].hostel;
    await assertHostelAccess(req.user, hostelId, true);

    const activeStays = stays.filter(s => OPEN_STATUSES.includes(s.status));
    if (activeStays.length === 0) {
      return res.status(400).json({ success: false, message: 'All rooms in this group are already checked out' });
    }

    const leaderStay = stays.find(s => s.isGroupLeader) || stays[0];
    const payAmt = Math.max(0, Number(checkoutPayment) || 0);

    const actualOut = req.body.actualCheckOutDate ? new Date(req.body.actualCheckOutDate) : new Date();
    const checkOutTimestamp = isNaN(actualOut.getTime()) ? new Date() : actualOut;

    // 1. Record checkout settlement payment if any
    if (payAmt > 0) {
      if (Array.isArray(splitPayments) && splitPayments.length > 0) {
        for (const sp of splitPayments) {
          const spAmt = Number(sp.amount);
          if (spAmt > 0) {
            const pMethod = sp.paymentMethod || 'Cash';
            await Payment.create({
              stay: leaderStay._id,
              groupId,
              guest: leaderStay.guest,
              hostel: hostelId,
              amount: spAmt,
              paymentMethod: pMethod,
              paymentDate: checkOutTimestamp,
              notes: sp.notes || notes || `Group Checkout Settlement (${leaderStay.groupName})`,
              createdBy: req.user._id
            });
            await recordLedgerImpact({
              guestId: leaderStay.guest,
              hostelId,
              stayId: leaderStay._id,
              amount: spAmt,
              paymentMethod: pMethod,
              description: sp.notes || `Group Checkout payment (${pMethod}) for ${leaderStay.groupName}`,
              userId: req.user._id
            });
          }
        }
      } else {
        const pMethod = paymentMethod || 'Cash';
        await Payment.create({
          stay: leaderStay._id,
          groupId,
          guest: leaderStay.guest,
          hostel: hostelId,
          amount: payAmt,
          paymentMethod: pMethod,
          paymentDate: checkOutTimestamp,
          notes: notes || `Group Checkout Settlement (${leaderStay.groupName})`,
          createdBy: req.user._id
        });
        await recordLedgerImpact({
          guestId: leaderStay.guest,
          hostelId,
          stayId: leaderStay._id,
          amount: payAmt,
          paymentMethod: pMethod,
          description: `Group Checkout payment (${pMethod}) for ${leaderStay.groupName}`,
          userId: req.user._id
        });
      }
    }

    // 2. Mark all active stays in this group as 'Checked Out'
    const activeStayIds = activeStays.map(s => s._id);
    await Stay.updateMany(
      { _id: { $in: activeStayIds } },
      {
        $set: {
          status: 'Checked Out',
          actualCheckOutDate: checkOutTimestamp
        }
      }
    );

    // Distribute settlement payment across active stays to clear their pending balances
    if (payAmt > 0) {
      let remainingSettlement = payAmt;
      for (const st of activeStays) {
        const roomDue = Math.max(0, (Number(st.totalAmount) || 0) - (Number(st.paidAmount) || 0));
        if (roomDue > 0 && remainingSettlement > 0) {
          const alloc = Math.min(roomDue, remainingSettlement);
          await Stay.findByIdAndUpdate(st._id, { $inc: { paidAmount: alloc } });
          remainingSettlement -= alloc;
        }
      }
      if (remainingSettlement > 0) {
        await Stay.findByIdAndUpdate(leaderStay._id, { $inc: { paidAmount: remainingSettlement } });
      }
    }

    // 3. Dispatch Web Push for Group Checkout strictly to THIS Property's Staff & Owner
    try {
      const { recipientIds, hostelDoc } = await getHotelPropertyNotificationRecipients(hostelId, req.user);

      const hName = hostelDoc?.name || 'Hotel';
      const gName = leaderStay.groupName || 'Group';

      sendWebPushToUsers(Array.from(recipientIds), {
        title: `🚪 Group Check-Out: ${gName} (${activeStays.length} Rooms)`,
        body: `${hName} • Checked out ${activeStays.length} rooms • Payment received: ₹${Number(payAmt).toLocaleString('en-IN')}`,
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        tag: `grp-checkout-${groupId}`,
        vibrate: [250, 100, 250, 100, 250],
        data: { url: '/receptionist/rooms' }
      }).catch(err => console.warn('Group Checkout Push failed:', err.message));

      // Save in-app notification record for bell counts
      for (const recId of recipientIds) {
        try {
          await Notification.create({
            recipient: recId,
            hostel: hostelId,
            stay: leaderStay._id,
            type: 'checkout',
            title: `🚪 Group Check-Out: ${gName}`,
            message: `${hName} • Checked out ${activeStays.length} rooms • Payment: ₹${Number(payAmt).toLocaleString('en-IN')}`,
            metadata: {
              hotelName: hName,
              groupName: gName,
              roomCount: activeStays.length,
              settledAmount: Number(payAmt) || 0,
              stayId: leaderStay._id.toString()
            }
          });
        } catch (singleErr) {}
      }
    } catch (notifErr) {
      console.warn('Group checkout notification warning:', notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Group check-out completed for ${activeStays.length} rooms successfully!`,
      data: {
        groupId,
        checkedOutRoomsCount: activeStays.length,
        settlementPayment: payAmt
      }
    });
  } catch (error) {
    sendError(res, next, error);
  }
};

