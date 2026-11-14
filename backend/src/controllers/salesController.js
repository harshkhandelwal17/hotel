const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Stay = require('../models/Stay');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * 📊 Get Logged-in Sales Executive's Personal Performance Metrics
 * (STRICT PRIVACY: Shows only this agent's numbers, never total company revenue)
 */
exports.getSalesStats = async (req, res, next) => {
  try {
    const salesUserId = req.user.id;

    const [myHotels, myActiveHotels, myTrialHotels] = await Promise.all([
      Hostel.find({ onboardedBy: salesUserId }).select('plan planStatus planPrice createdAt name'),
      Hostel.countDocuments({ onboardedBy: salesUserId, planStatus: 'active' }),
      Hostel.countDocuments({
        onboardedBy: salesUserId,
        $or: [{ planStatus: 'trial' }, { plan: 'demo' }]
      })
    ]);

    // Calculate this sales person's total generated revenue from active paid subscriptions
    const myTotalRevenue = myHotels
      .filter(h => h.planStatus === 'active')
      .reduce((sum, h) => sum + (Number(h.planPrice) || 0), 0);

    // Get recent 5 onboardings
    const recentHotels = await Hostel.find({ onboardedBy: salesUserId })
      .populate('owner', 'name email phone')
      .sort('-createdAt')
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        myHotelsCount: myHotels.length,
        myActivePaidCount: myActiveHotels,
        myTrialCount: myTrialHotels,
        myTotalRevenue,
        recentOnboardings: recentHotels
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🏨 Get Hotels Directory for Sales (View and Troubleshoot)
 */
exports.getSalesHotels = async (req, res, next) => {
  try {
    const salesUserId = req.user.id;
    const { mineOnly, search } = req.query;

    const query = {};
    if (mineOnly === 'true') {
      query.onboardedBy = salesUserId;
    }

    if (search && search.trim() !== '') {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [
        { name: regex },
        { address: regex },
        { contactNumber: regex }
      ];
    }

    const hostels = await Hostel.find(query)
      .populate('owner', 'name email phone')
      .populate('onboardedBy', 'name email')
      .sort('-createdAt')
      .lean();

    const now = new Date();

    const enriched = await Promise.all(
      hostels.map(async (h) => {
        const [roomCount, staffMembers] = await Promise.all([
          Room.countDocuments({ hostel: h._id }),
          User.find({ assignedHostel: h._id, role: 'receptionist' })
            .select('name email phone isActive')
            .lean()
        ]);

        const endDate = h.planEndDate ? new Date(h.planEndDate) : null;
        const isExpired = h.planStatus === 'expired' || (endDate && endDate < now);
        const daysRemaining = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;
        const isMine = h.onboardedBy?._id?.toString() === salesUserId || h.onboardedBy?.toString() === salesUserId;

        return {
          ...h,
          roomCount,
          staffCount: staffMembers.length,
          staffMembers,
          isExpired: Boolean(isExpired),
          daysRemaining,
          isMine
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🚀 1-Step Onsite Onboarding: Register Hotel Owner + Hotel Property
 */
exports.onboardHotelClient = async (req, res, next) => {
  try {
    const salesUserId = req.user.id;
    const {
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerPassword,
      hotelName,
      hotelAddress,
      hotelContact,
      plan = 'demo',
      planPrice = 0,
      billingCycle = 'monthly',
      maxRooms = 20
    } = req.body;

    if (!ownerName || !ownerEmail) {
      return res.status(400).json({ success: false, message: 'Owner name and email are required' });
    }
    if (!hotelName) {
      return res.status(400).json({ success: false, message: 'Hotel/Property name is required' });
    }

    // 1. Check or Create Owner (Admin)
    let owner = await User.findOne({ email: ownerEmail.toLowerCase().trim() });
    if (!owner) {
      owner = await User.create({
        name: ownerName.trim(),
        email: ownerEmail.toLowerCase().trim(),
        password: ownerPassword || 'hotel123456',
        phone: ownerPhone || hotelContact || '',
        role: 'admin',
        onboardedBy: salesUserId
      });
    } else {
      // If owner exists, update phone if empty
      if (!owner.phone && (ownerPhone || hotelContact)) {
        owner.phone = ownerPhone || hotelContact;
        await owner.save();
      }
    }

    // Calculate default trial / plan dates (14 days for demo, 30 days for others)
    const durationDays = plan === 'demo' ? 14 : (billingCycle === 'yearly' ? 365 : 30);
    const planStartDate = new Date();
    const planEndDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // 2. Register Property attached to Owner & tagged with Sales Person
    const hostel = await Hostel.create({
      name: hotelName.trim(),
      address: hotelAddress || 'N/A',
      contactNumber: hotelContact || ownerPhone || 'N/A',
      email: ownerEmail.toLowerCase().trim(),
      owner: owner._id,
      onboardedBy: salesUserId,
      plan,
      planStatus: plan === 'demo' ? 'trial' : 'active',
      planPrice: Number(planPrice) || (plan === 'demo' ? 0 : 2499),
      billingCycle,
      planStartDate,
      planEndDate,
      maxRooms: Number(maxRooms) || 20,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: `✅ Hotel "${hostel.name}" and Owner "${owner.name}" successfully onboarded!`,
      data: {
        owner: {
          _id: owner._id,
          name: owner.name,
          email: owner.email,
          phone: owner.phone
        },
        hostel
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ⚡ 1-Click Launch Demo / Support Mode (Sales Impersonation)
 */
exports.salesImpersonate = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const user = await User.findById(userId).populate('assignedHostel', 'name');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Sales person cannot impersonate another superadmin or sales agent
    if (user.role === 'superadmin' || user.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Not authorized to impersonate this role' });
    }

    if (user.isActive === false) {
      return res.status(400).json({ success: false, message: 'This user account is currently deactivated.' });
    }

    const token = jwt.sign(
      {
        id: user._id,
        tokenVersion: user.tokenVersion || 0
      },
      env.jwtSecret,
      {
        expiresIn: '24h'
      }
    );

    res.status(200).json({
      success: true,
      token,
      returnUrl: '/sales',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedHostel: user.assignedHostel ? user.assignedHostel._id : null,
        hostelName: user.assignedHostel ? user.assignedHostel.name : null
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🔑 Reset Client Password During On-site Support / Demo
 */
exports.resetClientPassword = async (req, res, next) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ success: false, message: 'User ID and new password are required' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Only allow resetting admin or receptionist accounts
    if (targetUser.role !== 'admin' && targetUser.role !== 'receptionist') {
      return res.status(403).json({ success: false, message: 'Cannot reset passwords for this user role' });
    }

    targetUser.password = newPassword;
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1; // Invalidate previous sessions
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `Password reset successfully for ${targetUser.name}`
    });
  } catch (err) {
    next(err);
  }
};
