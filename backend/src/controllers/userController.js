const User = require('../models/User');
const Hostel = require('../models/Hostel');
const { userId } = require('../utils/hostelAccess');

exports.getUsers = async (req, res, next) => {
  try {
    const myHostels = await Hostel.find({ owner: userId(req.user) }).select('_id');
    const hostelIds = myHostels.map((h) => h._id);

    const users = await User.find({
      role: 'receptionist',
      assignedHostel: { $in: hostelIds }
    }).populate('assignedHostel', 'name');

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, assignedHostel, phone } = req.body;

    // Check if admin owns this hostel
    const hostel = await Hostel.findOne({ _id: assignedHostel, owner: userId(req.user) });
    if (!hostel) {
      return res.status(403).json({ success: false, message: 'Not authorized to assign staff to this hostel' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      phone: phone || '',
      password,
      role: 'receptionist',
      assignedHostel
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'receptionist') {
      return res.status(403).json({ success: false, message: 'Only receptionists can be deleted from here' });
    }

    if (!user.assignedHostel) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this user' });
    }

    const ownsHostel = await Hostel.exists({
      _id: user.assignedHostel,
      owner: userId(req.user)
    });
    if (!ownsHostel) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this user' });
    }

    await user.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
