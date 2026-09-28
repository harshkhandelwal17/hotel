const Stay = require('../models/Stay');
const Room = require('../models/Room');
const Bed = require('../models/Bed');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

exports.createStay = async (req, res, next) => {
  try {
    const { guest, room, checkInDate, expectedCheckOutDate, initialPaymentAmount, paymentMethod, durationOption, discountAmount, occupants, coGuests } = req.body;
    const hostel = req.user.role === 'admin' ? req.body.hostel : req.user.assignedHostel;
    
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
    
    const numOccupants = Number(occupants) || 1;
    const extraPersons = Math.max(0, numOccupants - 1); // people beyond the first
    
    let basePrice = 0;
    let totalAmount = 0;
    
    if (durationOption === '12h') {
      basePrice = roomDoc.price12h;
      const extraCharge = extraPersons * (roomDoc.extraPerPerson12h || 0);
      totalAmount = basePrice + extraCharge;
    } else if (durationOption === '24h') {
      basePrice = roomDoc.price24h;
      const nights = Math.ceil((new Date(expectedCheckOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));
      if (nights <= 0) throw new Error('Checkout date must be after check-in date');
      const extraChargePerNight = extraPersons * (roomDoc.extraPerPerson24h || 0);
      totalAmount = (basePrice + extraChargePerNight) * nights;
    } else if (durationOption.startsWith('custom_')) {
      const hours = parseInt(durationOption.split('_')[1], 10);
      const rate = roomDoc.customRates?.find(r => r.hours === hours);
      basePrice = rate ? rate.price : 0;
      totalAmount = basePrice; // Extra persons ignored for custom hourly, managed via initialPayment/discount manually
    } else {
      basePrice = roomDoc.price24h;
      totalAmount = basePrice;
    }
    
    const finalDiscount = Number(discountAmount) || 0;
    totalAmount = Math.max(0, totalAmount - finalDiscount);

    const stay = await Stay.create([{
      guest,
      coGuests: coGuests || [],
      hostel,
      room,
      checkInDate,
      expectedCheckOutDate,
      durationOption: durationOption || '24h',
      basePrice,
      discountAmount: finalDiscount,
      totalAmount,
      paidAmount: initialPaymentAmount || 0,
      occupants: occupants || 1,
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
    } else if (req.query.hostel && req.query.hostel !== 'all') {
      filter.hostel = req.query.hostel;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const stays = await Stay.find(filter)
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber idProofImage')
      .populate('room', 'roomNumber price24h extraPerPerson24h')
      .populate('hostel', 'name address')
      .sort('expectedCheckOutDate');
      
    res.status(200).json({ success: true, count: stays.length, data: stays });
  } catch (error) {
    next(error);
  }
};

exports.checkout = async (req, res, next) => {
  
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) throw new Error('Stay not found');
    if (stay.status === 'Checked Out') throw new Error('Stay is already checked out');
    
    const { additionalCharges, checkoutPayment, paymentMethod } = req.body;
    
    if (additionalCharges) {
      stay.additionalCharges += additionalCharges;
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
    
    // Release Bed
    
    
    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    next(error);
  }
};

exports.extendStay = async (req, res, next) => {
  
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) throw new Error('Stay not found');
    
    const { newCheckOutDate, extensionPayment, paymentMethod } = req.body;
    
    // Verify no overlaps for the room
    const overlapping = await Stay.findOne({
      room: stay.room,
      _id: { $ne: stay._id },
      status: { $in: ['Upcoming', 'Active'] },
      checkInDate: { $lt: new Date(newCheckOutDate) }
    });

    if (overlapping) throw new Error('Cannot extend. Room is booked by another guest for the requested dates.');
    
    const oldOutDate = new Date(stay.expectedCheckOutDate);
    const newOutDate = new Date(newCheckOutDate);
    const additionalNights = Math.ceil((newOutDate - oldOutDate) / (1000 * 60 * 60 * 24));
    
    if (additionalNights <= 0) throw new Error('New checkout date must be after current checkout date');
    
    // Fetch room to get proper extra per person rates
    const roomDoc = await Room.findById(stay.room);
    const numOccupants = stay.occupants || 1;
    const extraPersons = Math.max(0, numOccupants - 1);
    
    let additionalCost = 0;
    if (stay.durationOption === '12h') {
       // 12h extending logic is tricky, usually you extend by another 12h/24h block, but let's assume they are converting to a 24h stay for additional nights.
       const effectiveNightly = roomDoc.price24h + (extraPersons * (roomDoc.extraPerPerson24h || 0));
       additionalCost = effectiveNightly * additionalNights;
    } else {
       const effectiveNightly = roomDoc.price24h + (extraPersons * (roomDoc.extraPerPerson24h || 0));
       additionalCost = effectiveNightly * additionalNights;
    }

    stay.totalAmount += additionalCost;
    stay.expectedCheckOutDate = newOutDate;
    
    if (extensionPayment > 0) {
      stay.paidAmount += extensionPayment;
      await Payment.create([{
        stay: stay._id,
        guest: stay.guest,
        hostel: stay.hostel,
        amount: extensionPayment,
        paymentMethod: paymentMethod || 'Cash',
        createdBy: req.user._id
      }]);
    }
    
    await stay.save();
    
    
    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    next(error);
  }
};


exports.shiftRoom = async (req, res, next) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) throw new Error('Stay not found');
    if (stay.status !== 'Active') throw new Error('Can only shift active stays');

    const { newRoomId, priceAdjustment, reason } = req.body;
    
    // Check if new room exists and belongs to same hostel
    const Room = require('../models/Room');
    const newRoom = await Room.findById(newRoomId);
    if (!newRoom) throw new Error('New room not found');
    if (newRoom.hostel.toString() !== stay.hostel.toString()) {
      throw new Error('Cannot shift to a room in a different property');
    }

    // Check availability of new room
    const overlapping = await Stay.findOne({
      room: newRoomId,
      status: { $in: ['Upcoming', 'Active', 'Checkout Due', 'Overdue'] },
      $or: [
        { checkInDate: { $lt: stay.expectedCheckOutDate }, expectedCheckOutDate: { $gt: stay.checkInDate } }
      ]
    });

    if (overlapping) {
      throw new Error('New room is already booked for these dates');
    }

    // Get old room details for the note
    const oldRoom = await Room.findById(stay.room);
    const oldRoomNumber = oldRoom ? oldRoom.roomNumber : 'Unknown';

    // Apply changes
    stay.room = newRoomId;
    if (priceAdjustment) {
      stay.totalAmount += Number(priceAdjustment);
    }
    
    // Add to notes
    const shiftNote = `[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] Shifted from Room ${oldRoomNumber} to ${newRoom.roomNumber}. Reason: ${reason || 'N/A'}. Price Adjustment: ₹${Number(priceAdjustment) || 0}.`;
    stay.notes = stay.notes ? `${stay.notes}\n${shiftNote}` : shiftNote;

    await stay.save();
    
    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    next(error);
  }
};
