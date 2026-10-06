const User = require('../models/User');

exports.getUsers = async (req, res, next) => {
  try {
    const Hostel = require('../models/Hostel');
    const myHostels = await Hostel.find({ owner: req.user.id }).select('_id');
    const hostelIds = myHostels.map(h => h._id);

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
    const { name, email, password, assignedHostel } = req.body;
    
    // Check if admin owns this hostel
    const Hostel = require('../models/Hostel');
    const hostel = await Hostel.findOne({ _id: assignedHostel, owner: req.user.id });
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
    await user.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
