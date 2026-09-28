const Room = require('../models/Room');
const Bed = require('../models/Bed');

exports.createRoom = async (req, res, next) => {
  try {
    const { roomNumber, hostel, floor, capacity, roomType, price12h, price24h, extraPerPerson12h, extraPerPerson24h, customRates } = req.body;
    
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
    } else if (req.query.hostel && req.query.hostel !== 'all') {
      filter.hostel = req.query.hostel;
    }

    const rooms = await Room.find(filter).populate('hostel', 'name');
    res.status(200).json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    next(error);
  }
};

exports.getRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).populate('hostel', 'name');
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    
    // Also fetch beds for this room
    const beds = await Bed.find({ room: room._id });
    
    res.status(200).json({ 
      success: true, 
      data: { ...room.toObject(), beds } 
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
