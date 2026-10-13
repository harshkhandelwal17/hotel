const Guest = require('../models/Guest');
const Stay = require('../models/Stay');
const { assertHostelAccess, getHostelFilter, userCanAccessHostel } = require('../utils/hostelAccess');

exports.createGuest = async (req, res, next) => {
  try {
    let hostel = req.user.assignedHostel;

    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      if (!req.body.hostel) {
        return res.status(400).json({ success: false, message: 'Hostel is required' });
      }
      await assertHostelAccess(req.user, req.body.hostel);
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
      existingGuest = await Guest.findOne({ mobileNumber: payload.mobileNumber, hostel: hostel });
    }

    // If no mobile but idProof is provided, check by idProofNumber
    if (!existingGuest && payload.idProofNumber && payload.idProofNumber.trim() !== '') {
      existingGuest = await Guest.findOne({ idProofNumber: payload.idProofNumber, hostel: hostel });
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
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.getGuests = async (req, res, next) => {
  try {
    const filter = await getHostelFilter(req.user, req.query.hostel);

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
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.getGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findById(req.params.id);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    if (!(await userCanAccessHostel(req.user, guest.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this guest' });
    }

    // Find all stays for this guest (scoped to accessible hostels)
    const hostelFilter = await getHostelFilter(req.user);
    const stays = await Stay.find({
      $and: [
        { $or: [{ guest: guest._id }, { coGuests: guest._id }] },
        hostelFilter.hostel !== undefined ? { hostel: hostelFilter.hostel } : {}
      ]
    })
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
    // Strip immutable / restricted fields from body (including hostel reassignment)
    const { _id, __v, createdAt, updatedAt, hostel, ...updateData } = req.body;

    // Remove empty mobile so it doesn't overwrite with blank
    if (updateData.mobileNumber === '' || updateData.mobileNumber === null) {
      delete updateData.mobileNumber;
    }

    let guest = await Guest.findById(req.params.id);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    if (!(await userCanAccessHostel(req.user, guest.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this guest' });
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
