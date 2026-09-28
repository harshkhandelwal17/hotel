const Hostel = require('../models/Hostel');

exports.createHostel = async (req, res, next) => {
  try {
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
      query = Hostel.find();
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
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }
    res.status(200).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

exports.updateHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }
    res.status(200).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

exports.deleteHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.findByIdAndDelete(req.params.id);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
