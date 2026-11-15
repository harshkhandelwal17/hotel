const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Stay = require('../models/Stay');
const Payment = require('../models/Payment');
const Room = require('../models/Room');
const SalesLead = require('../models/SalesLead');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

exports.getSystemStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOwners = await User.countDocuments({ role: 'admin' });
    const totalStaff = await User.countDocuments({ role: 'receptionist' });
    const totalSalesAgents = await User.countDocuments({ role: 'sales' });
    const totalHostels = await Hostel.countDocuments();
    const activeHostels = await Hostel.countDocuments({ isActive: true });
    const lockedHostels = await Hostel.countDocuments({ isActive: false });
    const totalStays = await Stay.countDocuments();
    const activeStays = await Stay.countDocuments({ status: 'Active' });
    const totalRooms = await Room.countDocuments();
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStays = await Stay.countDocuments({
      createdAt: { $gte: today }
    });

    // 🎟️ Calculate Real SaaS Platform Subscription Revenue & Plan Breakdown
    const allHostelsForSaas = await Hostel.find().select('plan planStatus planPrice billingCycle planEndDate').lean();
    let totalSaasRevenue = 0;
    let activeSubscriptions = 0;
    let trialSubscriptions = 0;
    let expiredSubscriptions = 0;
    let expiringSoonSubscriptions = 0;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const h of allHostelsForSaas) {
      const price = Number(h.planPrice) || 0;
      totalSaasRevenue += price;
      const endDate = h.planEndDate ? new Date(h.planEndDate) : null;
      const isExpired = h.planStatus === 'expired' || (endDate && endDate < now);

      if (isExpired) {
        expiredSubscriptions++;
      } else if (h.planStatus === 'trial' || h.plan === 'demo') {
        trialSubscriptions++;
      } else {
        activeSubscriptions++;
      }

      if (endDate && endDate >= now && endDate <= sevenDaysFromNow) {
        expiringSoonSubscriptions++;
      }
    }

    // Guest Room Bill Revenue (Hotel industry gross transaction volume)
    const revenue = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalGuestRevenue = revenue[0] ? revenue[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalOwners,
        totalStaff,
        totalSalesAgents,
        totalHostels,
        activeHostels,
        lockedHostels,
        totalStays,
        activeStays,
        todayStays,
        totalRooms,
        totalSaasRevenue,
        activeSubscriptions,
        trialSubscriptions,
        expiredSubscriptions,
        expiringSoonSubscriptions,
        totalRevenue: totalSaasRevenue, // Super Admin primary revenue = SaaS plan subscriptions
        totalGuestRevenue // Guest bills volume
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .populate('assignedHostel', 'name contactNumber owner')
      .select('+password') 
      .sort('-createdAt')
      .lean();

    // Auto-backfill phone & enrich admin owners with their linked properties
    const enrichedUsers = await Promise.all(users.map(async (u) => {
      let phone = u.phone || '';
      if (!phone || phone.trim() === '') {
        if (u.role === 'admin') {
          const hostel = await Hostel.findOne({ 
            owner: u._id, 
            contactNumber: { $exists: true, $nin: ['', 'N/A', null] } 
          }).select('contactNumber');
          if (hostel && hostel.contactNumber) {
            phone = hostel.contactNumber;
            await User.updateOne({ _id: u._id }, { $set: { phone: hostel.contactNumber } });
          }
        } else if (u.role === 'receptionist' && u.assignedHostel) {
          const hostelId = u.assignedHostel._id || u.assignedHostel;
          const hostel = await Hostel.findById(hostelId).select('contactNumber');
          if (hostel && hostel.contactNumber && hostel.contactNumber !== 'N/A') {
            phone = hostel.contactNumber;
            await User.updateOne({ _id: u._id }, { $set: { phone: hostel.contactNumber } });
          }
        }
      }

      if (u.role === 'admin') {
        const ownedHostels = await Hostel.find({ owner: u._id })
          .select('name city address contactNumber plan planStatus planPrice billingCycle planEndDate isActive maxRooms')
          .lean();
        return {
          ...u,
          phone,
          ownedHostels,
          ownedHostelsCount: ownedHostels.length
        };
      }

      return {
        ...u,
        phone
      };
    }));
      
    res.status(200).json({ success: true, data: enrichedUsers });
  } catch (error) {
    next(error);
  }
};

exports.impersonateUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId).populate('assignedHostel', 'name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    if (user.isActive === false) {
      return res.status(400).json({ success: false, message: 'Cannot login: User account is currently deactivated or locked.' });
    }

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
      .populate('assignedSalesAgent', 'name email phone role')
      .populate('onboardedBy', 'name email phone role')
      .sort('-createdAt')
      .lean();

    const now = new Date();

    // Enrich each property with rooms count, active stays count, assigned staff & plan metrics
    const enrichedHostels = await Promise.all(hostels.map(async (h) => {
      const [roomCount, activeStaysCount, staffMembers] = await Promise.all([
        Room.countDocuments({ hostel: h._id }),
        Stay.countDocuments({ hostel: h._id, status: 'Active' }),
        User.find({ assignedHostel: h._id, role: { $ne: 'superadmin' } })
          .select('name email phone role isActive lastLogin createdAt')
          .lean()
      ]);

      const endDate = h.planEndDate ? new Date(h.planEndDate) : null;
      const isExpired = h.planStatus === 'expired' || (endDate && endDate < now);
      const daysRemaining = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;

      return {
        ...h,
        roomCount,
        activeStaysCount,
        staffCount: staffMembers.length,
        staffMembers,
        isExpired: Boolean(isExpired),
        daysRemaining
      };
    }));

    res.status(200).json({ success: true, data: enrichedHostels });
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

exports.toggleHostelLaundry = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Property not found' });

    hostel.laundryEnabled = !hostel.laundryEnabled;
    await hostel.save();

    res.status(200).json({ 
      success: true, 
      message: `Laundry Management ${hostel.laundryEnabled ? 'enabled' : 'disabled'} for ${hostel.name}`,
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

/**
 * 💼 Super Admin Sales Team Leaderboard & Performance Overview
 */
exports.getSalesTeamPerformance = async (req, res, next) => {
  try {
    const salesAgents = await User.find({ role: 'sales' })
      .select('name email phone isActive createdAt monthlyTargetHotels commissionRate')
      .sort('-createdAt')
      .lean();

    const teamPerformance = await Promise.all(
      salesAgents.map(async (agent) => {
        const [hotels, totalLeads, wonLeads] = await Promise.all([
          Hostel.find({ $or: [{ onboardedBy: agent._id }, { assignedSalesAgent: agent._id }] })
            .select('name address plan planStatus planPrice createdAt contactNumber onboardedBy assignedSalesAgent')
            .lean(),
          SalesLead.countDocuments({ salesAgent: agent._id }),
          SalesLead.countDocuments({ salesAgent: agent._id, status: 'won' })
        ]);

        const enrichedHotels = hotels.map(h => ({
          ...h,
          isOnboardedByAgent: (h.onboardedBy?._id || h.onboardedBy)?.toString() === agent._id.toString(),
          isAssignedByAdmin: (h.assignedSalesAgent?._id || h.assignedSalesAgent)?.toString() === agent._id.toString() &&
                             (h.onboardedBy?._id || h.onboardedBy)?.toString() !== agent._id.toString()
        }));

        const totalRevenue = enrichedHotels
          .filter(h => h.planStatus === 'active')
          .reduce((sum, h) => sum + (Number(h.planPrice) || 0), 0);

        const activeHotels = enrichedHotels.filter(h => h.planStatus === 'active').length;
        const trialHotels = enrichedHotels.filter(h => h.planStatus === 'trial' || h.plan === 'demo').length;
        const commissionRate = agent.commissionRate || 15;
        const monthlyTarget = agent.monthlyTargetHotels || 10;
        const commissionEarned = Math.round((totalRevenue * commissionRate) / 100);

        return {
          agent,
          monthlyTarget,
          commissionRate,
          commissionEarned,
          hotelsCount: enrichedHotels.length,
          activeHotelsCount: activeHotels,
          trialHotelsCount: trialHotels,
          onboardedCount: enrichedHotels.filter(h => h.isOnboardedByAgent).length,
          assignedCount: enrichedHotels.filter(h => h.isAssignedByAdmin).length,
          totalRevenueGenerated: totalRevenue,
          leadsCount: totalLeads,
          wonLeadsCount: wonLeads,
          conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
          hotels: enrichedHotels
        };
      })
    );

    // Sort leaderboard by highest revenue generated first
    teamPerformance.sort((a, b) => b.totalRevenueGenerated - a.totalRevenueGenerated);

    const totalSalesRevenue = teamPerformance.reduce((sum, p) => sum + p.totalRevenueGenerated, 0);
    const totalHotelsBySales = teamPerformance.reduce((sum, p) => sum + p.hotelsCount, 0);
    const totalCommissionPayout = teamPerformance.reduce((sum, p) => sum + p.commissionEarned, 0);
    const totalTeamLeads = teamPerformance.reduce((sum, p) => sum + p.leadsCount, 0);
    const totalTeamWon = teamPerformance.reduce((sum, p) => sum + p.wonLeadsCount, 0);
    const overallConversion = totalTeamLeads > 0 ? Math.round((totalTeamWon / totalTeamLeads) * 100) : 0;

    const allLeads = await SalesLead.find()
      .populate('salesAgent', 'name email phone')
      .sort('-updatedAt')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        totalAgents: salesAgents.length,
        totalSalesRevenue,
        totalHotelsBySales,
        totalCommissionPayout,
        pipeline: {
          totalTeamLeads,
          totalTeamWon,
          overallConversion
        },
        leaderboard: teamPerformance,
        allLeads
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ⚙️ Update Sales Agent Target, Commission, or Status
 */
exports.updateSalesAgentSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { monthlyTargetHotels, commissionRate, isActive } = req.body;

    const agent = await User.findById(id);
    if (!agent || agent.role !== 'sales') {
      return res.status(404).json({ success: false, message: 'Sales executive not found' });
    }

    if (monthlyTargetHotels !== undefined) agent.monthlyTargetHotels = Number(monthlyTargetHotels);
    if (commissionRate !== undefined) agent.commissionRate = Number(commissionRate);
    if (isActive !== undefined) agent.isActive = Boolean(isActive);

    await agent.save();

    res.status(200).json({
      success: true,
      message: `✅ Settings updated for ${agent.name}`,
      data: agent
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 💼 Super Admin Assign or Reassign Sales Representative to a Hotel
 */
exports.assignHostelSalesAgent = async (req, res, next) => {
  try {
    const { salesAgentId } = req.body;
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Property not found' });

    if (salesAgentId && salesAgentId !== 'unassigned') {
      const salesUser = await User.findById(salesAgentId);
      if (!salesUser) {
        return res.status(404).json({ success: false, message: 'Sales agent not found' });
      }
      hostel.assignedSalesAgent = salesUser._id;
    } else {
      hostel.assignedSalesAgent = null;
    }

    await hostel.save();
    await hostel.populate('assignedSalesAgent', 'name email phone role');
    await hostel.populate('onboardedBy', 'name email phone role');
    await hostel.populate('owner', 'name email phone');

    res.status(200).json({
      success: true,
      message: hostel.assignedSalesAgent ? `Property assigned to ${hostel.assignedSalesAgent.name}` : 'Sales assignment cleared (Direct/No Sales Rep)',
      data: hostel
    });
  } catch (err) {
    next(err);
  }
};
