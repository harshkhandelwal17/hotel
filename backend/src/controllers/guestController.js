const Guest = require('../models/Guest');
const Stay = require('../models/Stay');

exports.createGuest = async (req, res, next) => {
  try {
    let hostel = req.user.assignedHostel;
    
    if (req.user.role === 'admin') {
      const Hostel = require('../models/Hostel');
      const hostelExists = await Hostel.findOne({ _id: req.body.hostel, owner: req.user.id });
      if (!hostelExists) return res.status(403).json({ success: false, message: 'Not authorized for this hostel' });
      hostel = req.body.hostel;
    }
    
    // Strip immutable fields
    const { _id, __v, createdAt, updatedAt, isSearching, ...payload } = { ...req.body, hostel };
    
    // Remove empty mobile
    if (payload.mobileNumber === '' || payload.mobileNumber === null) {
      delete payload.mobileNumber;
    }

    // If mobile provided, check if guest already exists → UPDATE instead of CREATE
    let existingGuest = null;
    if (payload.mobileNumber) {
      existingGuest = await Guest.findOne({ mobileNumber: payload.mobileNumber });
    }
    
    // If no mobile but idProof is provided, check by idProofNumber
    if (!existingGuest && payload.idProofNumber && payload.idProofNumber.trim() !== '') {
      existingGuest = await Guest.findOne({ idProofNumber: payload.idProofNumber });
    }

    if (existingGuest) {
      // Update with any new info (name, idProof, image etc) and return
      const updated = await Guest.findByIdAndUpdate(
        existingGuest._id,
        { $set: payload },
        { new: true, runValidators: false }
      );
      return res.status(200).json({ success: true, data: updated });
    }

    // Truly new guest — create
    const guest = await Guest.create(payload);
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
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber idProofImage idProofImageBack')
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
