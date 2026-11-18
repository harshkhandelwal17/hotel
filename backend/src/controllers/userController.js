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
    }).populate('assignedHostel', 'name contactNumber');

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

// @desc    Update/Reset receptionist staff password by property owner
// @route   PUT /api/users/:id/password
// @access  Private (Admin, Superadmin)
exports.updateStaffPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const targetUser = await User.findById(id).select('+password');
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }

    if (targetUser.role !== 'receptionist') {
      return res.status(403).json({ success: false, message: 'Only receptionist passwords can be changed from here' });
    }

    // Verify admin owns the property where this staff is assigned
    if (req.user.role !== 'superadmin') {
      if (!targetUser.assignedHostel) {
        return res.status(403).json({ success: false, message: 'Staff has no assigned property' });
      }
      const ownsHostel = await Hostel.exists({
        _id: targetUser.assignedHostel,
        owner: userId(req.user)
      });
      if (!ownsHostel) {
        return res.status(403).json({ success: false, message: 'Not authorized to change password for staff of another property' });
      }
    }

    targetUser.password = newPassword;
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1; // Invalidate previous session
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `Password for ${targetUser.name} updated successfully!`
    });
  } catch (error) {
    next(error);
  }
};
