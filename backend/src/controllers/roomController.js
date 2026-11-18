const Room = require('../models/Room');
const Bed = require('../models/Bed');
const Stay = require('../models/Stay');

exports.createRoom = async (req, res, next) => {
  try {
    const { roomNumber, hostel, floor, capacity, roomType, price12h, price24h, extraPerPerson12h, extraPerPerson24h, customRates, gstRate } = req.body;
    
    const Hostel = require('../models/Hostel');
    const targetHostel = await Hostel.findById(hostel);
    if (!targetHostel) return res.status(404).json({ success: false, message: 'Hostel/Property not found' });

    if (req.user.role === 'admin' && String(targetHostel.owner) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to add room to this hostel' });
    }

    if (req.user.role !== 'superadmin') {
      if (targetHostel.isActive === false || targetHostel.planStatus === 'expired' || (targetHostel.planEndDate && new Date(targetHostel.planEndDate) < new Date())) {
        return res.status(403).json({ success: false, message: 'Subscription plan has expired for this property. Please contact Super Admin to renew.' });
      }
    }

    // 🔒 Enforce subscription plan room limit!
    const currentRoomCount = await Room.countDocuments({ hostel });
    const maxAllowedRooms = targetHostel.maxRooms || 20;
    if (currentRoomCount >= maxAllowedRooms) {
      return res.status(403).json({
        success: false,
        message: `Plan room limit reached! Your active plan allows up to ${maxAllowedRooms} rooms (Currently: ${currentRoomCount}). Please contact administrator to upgrade your plan.`
      });
    }

    const room = await Room.create({
      roomNumber, hostel, floor, capacity, roomType,
      price12h: Number(price12h) || 0,
      price24h: Number(price24h) || 0,
      extraPerPerson12h: Number(extraPerPerson12h) || 0,
      extraPerPerson24h: Number(extraPerPerson24h) || 0,
      customRates: customRates || [],
      gstRate: (gstRate !== undefined && gstRate !== '' && gstRate !== null) ? Number(gstRate) : null
    });
    
    // Create beds automatically based on capacity
    const bedsToCreate = [];
    for (let i = 1; i <= capacity; i++) {
      bedsToCreate.push({
        bedNumber: `${roomNumber}-${i}`,
        room: room._id,
        hostel: hostel
      });
    }
    
    await Bed.insertMany(bedsToCreate);
    
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

exports.getRooms = async (req, res, next) => {
  try {
    const { getHostelFilter } = require('../utils/hostelAccess');
    const filter = await getHostelFilter(req.user, req.query.hostel);

    const rooms = await Room.find(filter)
      .populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix autoApplyGstOnCheckin aiOcrEnabled whatsappSyncEnabled')
      .lean();

    // Only load open stays for the same hostel scope (not globally)
    const stayFilter = {
      status: { $in: ['Active', 'Upcoming', 'Checkout Due', 'Overdue'] }
    };
    if (filter.hostel !== undefined) {
      stayFilter.hostel = filter.hostel;
    }
    const activeStays = await Stay.find(stayFilter).select('room').lean();
    const occupiedRoomIds = new Set(
      activeStays
        .filter(s => s.room)
        .map(s => (s.room?._id || s.room).toString())
    );

    let roomsWithStatus = rooms.map(room => ({
      ...room,
      isOccupied: occupiedRoomIds.has(room._id.toString())
    }));

    if (req.query.vacantOnly === 'true') {
      roomsWithStatus = roomsWithStatus.filter(r => !r.isOccupied);
    }

    res.status(200).json({ success: true, count: roomsWithStatus.length, data: roomsWithStatus });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};


// ---------------------------------------------------------------------------
// Helper: load a room and make sure the logged-in user may touch it.
//  admin -> room's hostel must be owned by them; staff -> their assigned hostel
// ---------------------------------------------------------------------------
const loadAuthorizedRoom = async (req) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    const err = new Error('Room not found');
    err.statusCode = 404;
    throw err;
  }
  let allowed = false;
  if (req.user.role === 'admin') {
    const Hostel = require('../models/Hostel');
    allowed = !!(await Hostel.exists({ _id: room.hostel, owner: req.user.id }));
  } else if (req.user.role === 'superadmin') {
    allowed = true;
  } else {
    allowed = !!req.user.assignedHostel && room.hostel.toString() === req.user.assignedHostel.toString();
  }
  if (!allowed) {
    const err = new Error('Not authorized for this room');
    err.statusCode = 403;
    throw err;
  }
  return room;
};

const sendError = (res, next, error) => {
  if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
  return next(error);
};

const BLOCKING_STATUSES = ['Upcoming', 'Active', 'Checkout Due', 'Overdue'];

exports.getRoom = async (req, res, next) => {
  try {
    const authorized = await loadAuthorizedRoom(req);
    const room = await Room.findById(authorized._id).populate('hostel', 'name address contactNumber email upiId upiPayeeName gstEnabled gstin taxInclusive gstRate hsnSacCode state stateCode invoicePrefix autoApplyGstOnCheckin');
    const beds = await Bed.find({ room: room._id });
    res.status(200).json({ success: true, data: { ...room.toObject(), beds } });
  } catch (error) {
    sendError(res, next, error);
  }
};

exports.updateRoom = async (req, res, next) => {
  try {
    const existing = await loadAuthorizedRoom(req);

    // These can never be changed through a plain edit
    const body = { ...req.body };
    delete body.hostel;
    delete body.maintenanceReason;
    delete body.maintenanceSince;
    delete body.maintenanceHistory;
    if (body.status === 'Maintenance') {
      return res.status(400).json({ success: false, message: 'Use the Maintenance option to block a room' });
    }
    if (body.status && body.status !== existing.status && existing.status === 'Maintenance') {
      return res.status(400).json({ success: false, message: 'Mark the room as repaired first' });
    }

    const room = await Room.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    sendError(res, next, error);
  }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await loadAuthorizedRoom(req);
    const busy = await Stay.exists({ room: room._id, status: { $in: BLOCKING_STATUSES } });
    if (busy) {
      return res.status(400).json({ success: false, message: 'This room has a guest or booking. Check out / shift the guest first.' });
    }
    await room.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    sendError(res, next, error);
  }
};

// POST /api/rooms/:id/maintenance  { reason }
exports.startMaintenance = async (req, res, next) => {
  try {
    const room = await loadAuthorizedRoom(req);
    const reason = String(req.body.reason || '').trim();

    if (room.status === 'Maintenance') throw new Error('Room is already under maintenance');
    if (reason.length < 3) throw new Error('Please tell what the problem is (e.g. AC not working)');

    const busy = await Stay.findOne({ room: room._id, status: { $in: BLOCKING_STATUSES } }).populate('guest', 'fullName');
    if (busy) {
      throw new Error(`Room ${room.roomNumber} has ${busy.guest?.fullName || 'a guest'} / a booking. Shift the guest to another room first.`);
    }

    room.status = 'Maintenance';
    room.maintenanceReason = reason;
    room.maintenanceSince = new Date();
    room.maintenanceHistory.push({ reason, startedBy: req.user._id });
    await room.save();

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    sendError(res, next, error);
  }
};

// POST /api/rooms/:id/maintenance/resolve  { note }
exports.endMaintenance = async (req, res, next) => {
  try {
    const room = await loadAuthorizedRoom(req);
    if (room.status !== 'Maintenance') throw new Error('Room is not under maintenance');

    const open = [...room.maintenanceHistory].reverse().find((h) => !h.endedAt);
    if (open) {
      open.endedAt = new Date();
      open.endedBy = req.user._id;
      open.note = String(req.body.note || '').trim();
    }

    room.status = 'Active';
    room.maintenanceReason = undefined;
    room.maintenanceSince = undefined;
    await room.save();

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    sendError(res, next, error);
  }
};

// PATCH /api/rooms/:id/housekeeping  { status: 'clean' | 'dirty' | 'in_progress' }
exports.updateHousekeepingStatus = async (req, res, next) => {
  try {
    const room = await loadAuthorizedRoom(req);
    const { status } = req.body;
    if (!['clean', 'dirty', 'in_progress'].includes(status)) {
      throw new Error('Invalid housekeeping status');
    }

    room.housekeepingStatus = status;
    if (status === 'clean') {
      room.lastCleanedAt = new Date();
      room.cleanedBy = req.user._id;
    }
    await room.save();

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    sendError(res, next, error);
  }
};

// POST /api/rooms/seed-starter
exports.seedStarterRooms = async (req, res, next) => {
  try {
    const Hostel = require('../models/Hostel');
    let hostelId = req.body.hostelId || req.query.hostelId || req.user.assignedHostel;
    if (!hostelId && req.user.role === 'admin') {
      const firstHostel = await Hostel.findOne({ owner: req.user._id });
      if (firstHostel) hostelId = firstHostel._id;
    }
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return res.status(404).json({ success: false, message: 'Property not found' });

    const existingCount = await Room.countDocuments({ hostel: hostelId });
    if (existingCount > 0) {
      return res.status(400).json({ success: false, message: 'Property already has rooms configured' });
    }

    const starterRooms = [
      { roomNumber: '101', floor: '1st Floor', roomType: 'Deluxe', capacity: 2, price12h: 1200, price24h: 1800, hostel: hostelId, status: 'Active', housekeepingStatus: 'clean' },
      { roomNumber: '102', floor: '1st Floor', roomType: 'Deluxe', capacity: 2, price12h: 1200, price24h: 1800, hostel: hostelId, status: 'Active', housekeepingStatus: 'clean' },
      { roomNumber: '103', floor: '1st Floor', roomType: 'Standard Double', capacity: 2, price12h: 900, price24h: 1400, hostel: hostelId, status: 'Active', housekeepingStatus: 'clean' },
      { roomNumber: '104', floor: '1st Floor', roomType: 'Standard Double', capacity: 2, price12h: 900, price24h: 1400, hostel: hostelId, status: 'Active', housekeepingStatus: 'clean' },
      { roomNumber: '201', floor: '2nd Floor', roomType: 'Suite', capacity: 3, price12h: 1800, price24h: 2800, hostel: hostelId, status: 'Active', housekeepingStatus: 'clean' },
      { roomNumber: '202', floor: '2nd Floor', roomType: 'Family Room', capacity: 4, price12h: 2200, price24h: 3500, hostel: hostelId, status: 'Active', housekeepingStatus: 'clean' }
    ];

    const created = await Room.insertMany(starterRooms);
    res.status(201).json({
      success: true,
      message: '✅ 6 starter rooms successfully generated!',
      data: created
    });
  } catch (error) {
    next(error);
  }
};
