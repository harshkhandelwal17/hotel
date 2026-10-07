const Room = require('../models/Room');
const Bed = require('../models/Bed');
const Stay = require('../models/Stay');

exports.createRoom = async (req, res, next) => {
  try {
    const { roomNumber, hostel, floor, capacity, roomType, price12h, price24h, extraPerPerson12h, extraPerPerson24h, customRates } = req.body;
    
    if (req.user.role === 'admin') {
      const Hostel = require('../models/Hostel');
      const hostelExists = await Hostel.findOne({ _id: hostel, owner: req.user.id });
      if (!hostelExists) return res.status(403).json({ success: false, message: 'Not authorized to add room to this hostel' });
    }

    const room = await Room.create({
      roomNumber, hostel, floor, capacity, roomType,
      price12h: Number(price12h) || 0,
      price24h: Number(price24h) || 0,
      extraPerPerson12h: Number(extraPerPerson12h) || 0,
      extraPerPerson24h: Number(extraPerPerson24h) || 0,
      customRates: customRates || []
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

    const rooms = await Room.find(filter).populate('hostel', 'name');

    // Find all currently active/booked room IDs
    const activeStays = await Stay.find({
      status: { $in: ['Active', 'Upcoming', 'Checkout Due', 'Overdue'] }
    }).select('room');
    const occupiedRoomIds = new Set(activeStays.map(s => s.room.toString()));

    // Add isOccupied flag to each room
    const roomsWithStatus = rooms.map(room => ({
      ...room.toObject(),
      isOccupied: occupiedRoomIds.has(room._id.toString())
    }));

    res.status(200).json({ success: true, count: rooms.length, data: roomsWithStatus });
  } catch (error) {
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
    const room = await Room.findById(authorized._id).populate('hostel', 'name');
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
