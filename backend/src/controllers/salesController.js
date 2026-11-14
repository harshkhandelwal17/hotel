const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Stay = require('../models/Stay');
const SalesLead = require('../models/SalesLead');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * 📊 Get Logged-in Sales Executive's Personal Performance Metrics
 * (STRICT PRIVACY: Shows only this agent's numbers, never total company revenue)
 */
exports.getSalesStats = async (req, res, next) => {
  try {
    const salesUserId = req.user.id;

    const agentUser = await User.findById(salesUserId).select('name email phone monthlyTargetHotels commissionRate').lean();
    const monthlyTarget = agentUser?.monthlyTargetHotels || 10;
    const commissionRate = agentUser?.commissionRate || 15;

    // Current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      myHotels, 
      myActiveHotels, 
      myTrialHotels, 
      thisMonthOnboarded,
      totalLeads,
      activeLeads,
      demoLeads,
      wonLeads
    ] = await Promise.all([
      Hostel.find({ onboardedBy: salesUserId }).select('plan planStatus planPrice createdAt name'),
      Hostel.countDocuments({ onboardedBy: salesUserId, planStatus: 'active' }),
      Hostel.countDocuments({
        onboardedBy: salesUserId,
        $or: [{ planStatus: 'trial' }, { plan: 'demo' }]
      }),
      Hostel.countDocuments({
        onboardedBy: salesUserId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      SalesLead.countDocuments({ salesAgent: salesUserId }),
      SalesLead.countDocuments({ salesAgent: salesUserId, status: { $nin: ['won', 'lost'] } }),
      SalesLead.countDocuments({ salesAgent: salesUserId, status: { $in: ['demo_scheduled', 'demo_completed'] } }),
      SalesLead.countDocuments({ salesAgent: salesUserId, status: 'won' })
    ]);

    // Calculate this sales person's total generated revenue from active paid subscriptions
    const myTotalRevenue = myHotels
      .filter(h => h.planStatus === 'active')
      .reduce((sum, h) => sum + (Number(h.planPrice) || 0), 0);

    const estimatedCommission = Math.round((myTotalRevenue * commissionRate) / 100);
    const targetProgressPct = Math.min(100, Math.round((thisMonthOnboarded / monthlyTarget) * 100));

    // Get recent 5 onboardings
    const recentHotels = await Hostel.find({ onboardedBy: salesUserId })
      .populate('owner', 'name email phone')
      .sort('-createdAt')
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        agent: {
          name: agentUser?.name,
          monthlyTarget,
          commissionRate
        },
        myHotelsCount: myHotels.length,
        myActivePaidCount: myActiveHotels,
        myTrialCount: myTrialHotels,
        myTotalRevenue,
        estimatedCommission,
        thisMonthOnboarded,
        targetProgressPct,
        pipeline: {
          totalLeads,
          activeLeads,
          demoLeads,
          wonLeads
        },
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
      maxRooms = 20,
      leadId
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

    // 3. If attached to a Sales Lead, mark lead as WON
    if (leadId) {
      await SalesLead.findByIdAndUpdate(leadId, {
        status: 'won',
        convertedHostel: hostel._id,
        convertedAt: new Date()
      });
    }

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
 * ⚡ Sales Impersonation: 1-Click Launch into Client Hotel for Live Demo or Support
 */
exports.salesImpersonate = async (req, res, next) => {
  try {
    const { hostelId, userId } = req.body;
    if (!hostelId && !userId) {
      return res.status(400).json({ success: false, message: 'Hostel ID or User ID is required' });
    }

    let hostel = null;
    let targetUser = null;

    if (hostelId) {
      hostel = await Hostel.findById(hostelId).populate('owner');
      if (hostel) {
        targetUser = hostel.owner;
      }
    } else if (userId) {
      targetUser = await User.findById(userId);
      if (targetUser) {
        hostel = await Hostel.findOne({ owner: targetUser._id }) || await Hostel.findById(targetUser.assignedHostel);
      }
    }

    if (!hostel && !targetUser) {
      return res.status(404).json({ success: false, message: 'Target property or user not found' });
    }

    // Fallback if targetUser not found on hostel
    if (!targetUser && hostel) {
      targetUser = await User.findOne({ assignedHostel: hostel._id, role: 'receptionist' });
    }

    if (!targetUser) {
      targetUser = await User.create({
        name: `Demo Staff (${hostel.name})`,
        email: `demo.${Date.now()}@${hostel._id}.internal`,
        password: `demo${Math.random().toString(36).substring(7)}`,
        role: 'receptionist',
        assignedHostel: hostel._id,
        phone: hostel.contactNumber || ''
      });
    }

    // Generate valid JWT token for target user
    const token = jwt.sign(
      { id: targetUser._id, role: targetUser.role },
      env.jwtSecret,
      { expiresIn: '12h' }
    );

    res.status(200).json({
      success: true,
      message: `⚡ Demo/Support Mode launched for ${hostel.name}`,
      token,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        assignedHostel: hostel._id
      },
      hostel: {
        _id: hostel._id,
        name: hostel.name
      },
      returnUrl: '/sales'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🔑 Reset Client Hotel Owner Password
 */
exports.resetClientPassword = async (req, res, next) => {
  try {
    const { ownerId, newPassword } = req.body;
    if (!ownerId) {
      return res.status(400).json({ success: false, message: 'Owner ID is required' });
    }

    const targetUser = await User.findById(ownerId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot reset superadmin password' });
    }

    targetUser.password = newPassword || 'password123';
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `✅ Password for ${targetUser.name} successfully updated to: ${newPassword || 'password123'}`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 📋 CRM Leads Pipeline: Get Leads
 */
exports.getSalesLeads = async (req, res, next) => {
  try {
    const salesUserId = req.user.id;
    const { status, priority, search } = req.query;

    const query = { salesAgent: salesUserId };
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;

    if (search && search.trim() !== '') {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [
        { hotelName: regex },
        { contactPerson: regex },
        { phone: regex },
        { city: regex }
      ];
    }

    const leads = await SalesLead.find(query).sort('-createdAt').lean();
    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ➕ Add New Sales Prospect / Field Lead
 */
exports.createSalesLead = async (req, res, next) => {
  try {
    const salesUserId = req.user.id;
    const {
      hotelName,
      contactPerson,
      phone,
      email,
      city,
      address,
      roomCount,
      currentSystem,
      status,
      priority,
      nextFollowUpDate,
      notes,
      estimatedValue
    } = req.body;

    if (!hotelName || !contactPerson || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hotel Name, Contact Person Name, and Phone are required' 
      });
    }

    const lead = await SalesLead.create({
      salesAgent: salesUserId,
      hotelName: hotelName.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      city: city ? city.trim() : undefined,
      address: address ? address.trim() : undefined,
      roomCount: Number(roomCount) || 15,
      currentSystem: currentSystem || 'Paper Register',
      status: status || 'new',
      priority: priority || 'medium',
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
      notes: notes ? notes.trim() : undefined,
      estimatedValue: Number(estimatedValue) || 2499
    });

    res.status(201).json({
      success: true,
      message: `✅ Prospect lead for "${lead.hotelName}" created!`,
      data: lead
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✏️ Update Lead Status, Notes, or Follow-up
 */
exports.updateSalesLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await SalesLead.findOne({ _id: id, salesAgent: req.user.id });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found or unauthorized' });
    }

    const updated = await SalesLead.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    res.status(200).json({
      success: true,
      message: '✅ Lead updated successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🗑️ Delete Lead
 */
exports.deleteSalesLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await SalesLead.findOne({ _id: id, salesAgent: req.user.id });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found or unauthorized' });
    }

    await SalesLead.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: '✅ Lead removed'
    });
  } catch (err) {
    next(err);
  }
};
