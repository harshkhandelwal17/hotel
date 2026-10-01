const Guest = require('../models/Guest');
const Stay = require('../models/Stay');

exports.createGuest = async (req, res, next) => {
  try {
    req.body.hostel = req.user.role === 'admin' ? req.body.hostel : req.user.assignedHostel;
    
    // check for duplicate mobile number
    const existingGuest = await Guest.findOne({ mobileNumber: req.body.mobileNumber });
    if (existingGuest) {
      return res.status(400).json({ success: false, message: 'Guest with this mobile number already exists', data: existingGuest });
    }

    const guest = await Guest.create(req.body);
    res.status(201).json({ success: true, data: guest });
  } catch (error) {
    next(error);
  }
};

exports.getGuests = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
      filter.hostel = req.user.assignedHostel;
    }

    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { fullName: regex },
        { mobileNumber: regex },
        { idProofNumber: regex }
      ];
    }
    
    // Direct mobile lookup for duplicate detection
    if (req.query.mobile) {
      filter.mobileNumber = req.query.mobile;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const guests = await Guest.find(filter)
      .skip(startIndex)
      .limit(limit)
      .sort('-createdAt');
      
    const total = await Guest.countDocuments(filter);

    res.status(200).json({ 
      success: true, 
      count: guests.length, 
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: guests 
    });
  } catch (error) {
    next(error);
  }
};

exports.getGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }
    
    // Find all stays for this guest
    const stays = await Stay.find({ $or: [{ guest: guest._id }, { coGuests: guest._id }] })
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber idProofImage')
      .populate('room', 'roomNumber price24h extraPerPerson24h extraPerPerson12h')
      .populate('hostel', 'name address')
      .sort('-createdAt');
      
    res.status(200).json({ 
      success: true, 
      data: { ...guest.toObject(), stays } 
    });
  } catch (error) {
    next(error);
  }
};

exports.updateGuest = async (req, res, next) => {
  try {
    // Strip immutable / restricted fields from body
    const { _id, __v, createdAt, updatedAt, ...updateData } = req.body;
    
    // Remove empty mobile so it doesn't overwrite with blank
    if (updateData.mobileNumber === '' || updateData.mobileNumber === null) {
      delete updateData.mobileNumber;
    }

    let guest = await Guest.findById(req.params.id);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }
    
    guest = await Guest.findByIdAndUpdate(req.params.id, { $set: updateData }, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({ success: true, data: guest });
  } catch (error) {
    next(error);
  }
};
