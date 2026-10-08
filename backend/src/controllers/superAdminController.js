const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Stay = require('../models/Stay');
const Payment = require('../models/Payment');
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');

exports.getSystemStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalHostels = await Hostel.countDocuments();
    const totalStays = await Stay.countDocuments();
    const totalRooms = await Room.countDocuments();
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStays = await Stay.countDocuments({
      createdAt: { $gte: today }
    });

    const revenue = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenue[0] ? revenue[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalHostels,
        totalStays,
        totalRooms,
        totalRevenue,
        todayStays
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('assignedHostel', 'name')
      .select('+password') 
      .sort('-createdAt');
      
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

exports.impersonateUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId).populate('assignedHostel', 'name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret123', {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    });
    
    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedHostel: user.assignedHostel ? user.assignedHostel._id : null,
        hostelName: user.assignedHostel ? user.assignedHostel.name : null
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'superadmin' && user._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot disable your own superadmin account' });
    }
    
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false }); // skip password validation
    
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const newPassword = req.body.password || '123456';
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};


exports.getAllHostels = async (req, res, next) => {
  try {
    const hostels = await Hostel.find()
      .populate('owner', 'name email')
      .sort('-createdAt');
    res.status(200).json({ success: true, data: hostels });
  } catch (error) {
    next(error);
  }
};
