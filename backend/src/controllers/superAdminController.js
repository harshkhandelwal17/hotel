const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Stay = require('../models/Stay');
const Payment = require('../models/Payment');
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

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
      .populate('assignedHostel', 'name contactNumber')
      .select('+password') 
      .sort('-createdAt');

    // Auto-backfill phone from linked properties if user phone is blank
    for (const u of users) {
      if (!u.phone || u.phone.trim() === '') {
        if (u.role === 'admin') {
          const hostel = await Hostel.findOne({ 
            owner: u._id, 
            contactNumber: { $exists: true, $nin: ['', 'N/A', null] } 
          }).select('contactNumber');
          if (hostel && hostel.contactNumber) {
            u.phone = hostel.contactNumber;
            await User.updateOne({ _id: u._id }, { $set: { phone: hostel.contactNumber } });
          }
        } else if (u.role === 'receptionist' && u.assignedHostel) {
          const hostelId = u.assignedHostel._id || u.assignedHostel;
          const hostel = await Hostel.findById(hostelId).select('contactNumber');
          if (hostel && hostel.contactNumber && hostel.contactNumber !== 'N/A') {
            u.phone = hostel.contactNumber;
            await User.updateOne({ _id: u._id }, { $set: { phone: hostel.contactNumber } });
          }
        }
      }
    }
      
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
    
    const token = jwt.sign({
      id: user._id,
      tokenVersion: user.tokenVersion || 0
    }, env.jwtSecret, {
      expiresIn: env.jwtExpire || '7d'
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
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all active sessions across all devices
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
    user.tokenVersion = (user.tokenVersion || 0) + 1; // ⚡ Invalidate all active sessions across all devices immediately
    await user.save();
    
    res.status(200).json({ success: true, message: 'Password reset successfully. All active sessions logged out.' });
  } catch (error) {
    next(error);
  }
};


exports.getAllHostels = async (req, res, next) => {
  try {
    const hostels = await Hostel.find()
      .populate('owner', 'name email phone')
      .sort('-createdAt');
    res.status(200).json({ success: true, data: hostels });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, assignedHostel } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      role: role || 'admin',
      assignedHostel: assignedHostel || null
    });

    res.status(201).json({
      success: true,
      message: `${user.role === 'admin' ? 'Hotel Owner (Admin)' : 'User'} created successfully`,
      data: user
    });
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
    if (user.role === 'superadmin' && user._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own superadmin account' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, assignedHostel } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone.trim();
    if (role) user.role = role;
    if (assignedHostel !== undefined) user.assignedHostel = assignedHostel || null;

    await user.save({ validateBeforeSave: false });
    await user.populate('assignedHostel', 'name contactNumber');

    res.status(200).json({
      success: true,
      message: 'User details updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleHostelAiOcr = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Property not found' });

    hostel.aiOcrEnabled = !hostel.aiOcrEnabled;
    await hostel.save();

    res.status(200).json({ 
      success: true, 
      message: `AI Scanner ${hostel.aiOcrEnabled ? 'enabled' : 'disabled'} for ${hostel.name}`,
      data: hostel 
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleHostelWhatsAppSync = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Property not found' });

    hostel.whatsappSyncEnabled = !hostel.whatsappSyncEnabled;
    if (!hostel.whatsappSyncEnabled) {
      hostel.whatsappStatus = 'disconnected';
    }
    await hostel.save();

    res.status(200).json({ 
      success: true, 
      message: `WhatsApp Sync ${hostel.whatsappSyncEnabled ? 'enabled' : 'disabled'} for ${hostel.name}`,
      data: hostel 
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleHostelStatus = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Property not found' });

    hostel.isActive = !hostel.isActive;
    await hostel.save();

    res.status(200).json({
      success: true,
      message: `Property ${hostel.isActive ? 'activated' : 'deactivated'} successfully`,
      data: hostel
    });
  } catch (error) {
    next(error);
  }
};
exports.updateHostelPlan = async (req, res, next) => {
  try {
    const { plan, planStatus, planStartDate, planEndDate, planPrice, billingCycle, maxRooms, planNotes } = req.body;
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Property not found' });

    if (plan !== undefined) hostel.plan = plan;
    if (planStatus !== undefined) hostel.planStatus = planStatus;
    if (planStartDate !== undefined) hostel.planStartDate = planStartDate;
    if (planEndDate !== undefined) hostel.planEndDate = planEndDate;
    if (planPrice !== undefined) hostel.planPrice = planPrice;
    if (billingCycle !== undefined) hostel.billingCycle = billingCycle;
    if (maxRooms !== undefined) hostel.maxRooms = maxRooms;
    if (planNotes !== undefined) hostel.planNotes = planNotes;

    await hostel.save();

    res.status(200).json({
      success: true,
      message: `Plan updated successfully for ${hostel.name}`,
      data: hostel
    });
  } catch (error) {
    next(error);
  }
};
