const Hostel = require('../models/Hostel');

exports.createHostel = async (req, res, next) => {
  try {
    req.body.owner = req.user.id;
    const hostel = await Hostel.create(req.body);
    res.status(201).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

exports.getHostels = async (req, res, next) => {
  try {
    let query;
    if (req.user.role === 'admin') {
      // Find hostels owned by this admin
      query = Hostel.find({ owner: req.user.id });
    } else {
      query = Hostel.find({ _id: req.user.assignedHostel });
    }
    const hostels = await query;
    res.status(200).json({ success: true, data: hostels });
  } catch (error) {
    next(error);
  }
};

exports.getHostel = async (req, res, next) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role === 'admin') {
      query.owner = req.user.id;
    } else {
      // Receptionist can only access their assigned hostel
      if (req.user.assignedHostel.toString() !== req.params.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to access this hostel' });
      }
    }
    
    const hostel = await Hostel.findOne(query);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found or not owned by you' });
    }
    res.status(200).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

exports.updateHostel = async (req, res, next) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role === 'admin') {
      query.owner = req.user.id;
    }
    const hostel = await Hostel.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true
    });
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found or not owned by you' });
    }
    res.status(200).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

exports.deleteHostel = async (req, res, next) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role === 'admin') {
      query.owner = req.user.id;
    }
    const hostel = await Hostel.findOneAndDelete(query);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found or not owned by you' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
