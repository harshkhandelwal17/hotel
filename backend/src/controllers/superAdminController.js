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

    // 🎟️ Calculate Real SaaS Platform Subscription Revenue & Plan Breakdown from Historical Ledger
    const allHostelsForSaas = await Hostel.find().select('name plan planStatus planPrice billingCycle planStartDate planEndDate subscriptionHistory createdAt').lean();
    let totalSaasRevenue = 0;
    let thisMonthSaasRevenue = 0;
    let todaySaasRevenue = 0;
    let totalSubscriptionTransactions = 0;
    let activeSubscriptions = 0;
    let trialSubscriptions = 0;
    let expiredSubscriptions = 0;
    let expiringSoonSubscriptions = 0;
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const h of allHostelsForSaas) {
      const history = Array.isArray(h.subscriptionHistory) ? h.subscriptionHistory : [];

      if (history.length > 0) {
        for (const s of history) {
          if (s.actionType === 'adjustment' && (!s.finalAmount || Number(s.finalAmount) === 0)) continue;
          const amt = Number(s.finalAmount !== undefined ? s.finalAmount : (s.actionType === 'adjustment' ? 0 : s.planPrice)) || 0;
          if (amt <= 0 && s.actionType === 'adjustment') continue;
          totalSaasRevenue += amt;
          totalSubscriptionTransactions++;
          const tDate = s.createdAt ? new Date(s.createdAt) : (s.startDate ? new Date(s.startDate) : null);
          if (tDate) {
            if (tDate >= startOfThisMonth) thisMonthSaasRevenue += amt;
            if (tDate >= startOfToday) todaySaasRevenue += amt;
          }
        }
      } else if (h.planPrice > 0 && h.plan !== 'demo') {
        // Fallback for legacy records created prior to subscription history array
        const amt = Number(h.planPrice) || 0;
        totalSaasRevenue += amt;
        totalSubscriptionTransactions++;
        const cDate = h.planStartDate ? new Date(h.planStartDate) : (h.createdAt ? new Date(h.createdAt) : null);
        if (cDate) {
          if (cDate >= startOfThisMonth) thisMonthSaasRevenue += amt;
          if (cDate >= startOfToday) todaySaasRevenue += amt;
        }
      }

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
        thisMonthSaasRevenue,
        todaySaasRevenue,
        totalSubscriptionTransactions,
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
    const { 
      plan, 
      planStatus, 
      planStartDate, 
      planEndDate, 
      planPrice, 
      billingCycle, 
      maxRooms, 
      planNotes, 
      discountAmount, 
      extraCharges,
      finalAmount,
      paymentMethod = 'UPI',
      paymentReference = '',
      actionType = 'renewal'
    } = req.body;
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Property not found' });

    if (!Array.isArray(hostel.subscriptionHistory)) {
      hostel.subscriptionHistory = [];
    }

    // 🛡️ Preserve existing prior plan in history before overwriting if no history was logged yet
    if (hostel.subscriptionHistory.length === 0 && hostel.planPrice > 0 && hostel.plan !== 'demo') {
      hostel.subscriptionHistory.push({
        plan: hostel.plan || 'monthly',
        billingCycle: hostel.billingCycle || 'monthly',
        planPrice: hostel.planPrice,
        discountAmount: hostel.discountAmount || 0,
        extraCharges: hostel.extraCharges || 0,
        finalAmount: Math.max(0, Number(hostel.planPrice) || 0),
        paymentMethod: 'UPI',
        paymentReference: 'Initial Onboarding Plan',
        startDate: hostel.planStartDate || hostel.createdAt,
        endDate: hostel.planEndDate || hostel.planStartDate,
        durationDays: 30,
        actionType: 'initial',
        notes: hostel.planNotes || 'Initial plan on property onboarding',
        recordedByName: 'Super Admin',
        createdAt: hostel.planStartDate || hostel.createdAt
      });
    }

    if (plan !== undefined) hostel.plan = plan;
    if (planStatus !== undefined) {
      hostel.planStatus = planStatus;
    } else if (actionType === 'renewal' || actionType === 'upgrade') {
      hostel.planStatus = 'active';
    }

    if (planStartDate !== undefined) {
      const s = new Date(planStartDate);
      s.setHours(0, 0, 0, 0);
      hostel.planStartDate = s;
    }
    if (planEndDate !== undefined) {
      const e = new Date(planEndDate);
      // Set to 23:59:59 so the plan remains active until the very end of the expiry day
      e.setHours(23, 59, 59, 999);
      hostel.planEndDate = e;
    }

    if (planPrice !== undefined) hostel.planPrice = Number(planPrice) || 0;
    if (discountAmount !== undefined) hostel.discountAmount = Number(discountAmount) || 0;
    if (extraCharges !== undefined) hostel.extraCharges = Number(extraCharges) || 0;
    if (billingCycle !== undefined) hostel.billingCycle = billingCycle;
    if (maxRooms !== undefined) hostel.maxRooms = Number(maxRooms) || 20;
    if (planNotes !== undefined) hostel.planNotes = planNotes;

    const startObj = new Date(hostel.planStartDate || Date.now());
    const endObj = new Date(hostel.planEndDate || Date.now());
    const durationDays = Math.max(1, Math.ceil((endObj - startObj) / (1000 * 60 * 60 * 24)));

    const isAdjustment = actionType === 'adjustment' || actionType === 'edit';
    const resolvedFinalAmount = finalAmount !== undefined 
      ? Number(finalAmount) 
      : (isAdjustment ? 0 : Math.max(0, (Number(hostel.planPrice) || 0)));

    // 🧾 Record this new plan / renewal payment in the immutable subscription ledger
    hostel.subscriptionHistory.push({
      plan: hostel.plan,
      billingCycle: hostel.billingCycle,
      planPrice: hostel.planPrice,
      discountAmount: hostel.discountAmount || 0,
      extraCharges: hostel.extraCharges || 0,
      finalAmount: resolvedFinalAmount,
      paymentMethod: paymentMethod || 'UPI',
      paymentReference: paymentReference || '',
      startDate: hostel.planStartDate,
      endDate: hostel.planEndDate,
      durationDays,
      actionType: actionType || 'renewal',
      notes: planNotes || '',
      recordedBy: req.user?._id,
      recordedByName: req.user?.name || 'Super Admin',
      createdAt: new Date()
    });

    await hostel.save();

    res.status(200).json({
      success: true,
      message: `✅ Plan updated successfully for ${hostel.name}`,
      data: hostel
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 🗑️ Void / Delete an Accidental Subscription History Transaction Record
 */
exports.deleteHostelSubscriptionHistory = async (req, res, next) => {
  try {
    const { id, historyId } = req.params;
    const hostel = await Hostel.findById(id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Property not found' });

    hostel.subscriptionHistory = (hostel.subscriptionHistory || []).filter(
      item => item._id && item._id.toString() !== historyId
    );
    await hostel.save();

    res.status(200).json({
      success: true,
      message: 'Subscription transaction record voided / deleted successfully',
      data: hostel
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 🧾 Super Admin Full Platform Subscription & Renewal Transactions Ledger
 */
exports.getSubscriptionTransactions = async (req, res, next) => {
  try {
    const hostels = await Hostel.find()
      .populate('owner', 'name email phone')
      .populate('assignedSalesAgent', 'name email phone role')
      .populate('onboardedBy', 'name email phone role')
      .select('name city address contactNumber owner assignedSalesAgent onboardedBy plan planStatus planPrice planStartDate planEndDate billingCycle subscriptionHistory planNotes createdAt')
      .lean();

    const transactions = [];

    hostels.forEach(h => {
      const history = Array.isArray(h.subscriptionHistory) ? h.subscriptionHistory : [];

      if (history.length > 0) {
        history.forEach((sub, idx) => {
          transactions.push({
            _id: sub._id ? sub._id.toString() : `${h._id}-${idx}`,
            hostelId: h._id,
            hostelName: h.name,
            city: h.city || '',
            ownerName: h.owner?.name || 'Owner',
            ownerPhone: h.owner?.phone || h.contactNumber || '',
            ownerEmail: h.owner?.email || '',
            assignedAgentName: h.assignedSalesAgent?.name || h.onboardedBy?.name || '',
            plan: sub.plan || h.plan || 'monthly',
            billingCycle: sub.billingCycle || h.billingCycle || 'monthly',
            actionType: sub.actionType || (idx === 0 ? 'initial' : 'renewal'),
            planPrice: Number(sub.planPrice) || 0,
            discountAmount: Number(sub.discountAmount) || 0,
            extraCharges: Number(sub.extraCharges) || 0,
            finalAmount: Number(sub.finalAmount !== undefined ? sub.finalAmount : sub.planPrice) || 0,
            paymentMethod: sub.paymentMethod || 'UPI',
            paymentReference: sub.paymentReference || '',
            startDate: sub.startDate || h.planStartDate,
            endDate: sub.endDate || h.planEndDate,
            durationDays: sub.durationDays || 30,
            notes: sub.notes || '',
            recordedByName: sub.recordedByName || 'Super Admin',
            createdAt: sub.createdAt || h.createdAt
          });
        });
      } else if (h.planPrice > 0 && h.plan !== 'demo') {
        // Synthesize the initial subscription record for legacy properties
        transactions.push({
          _id: `${h._id}-initial`,
          hostelId: h._id,
          hostelName: h.name,
          city: h.city || '',
          ownerName: h.owner?.name || 'Owner',
          ownerPhone: h.owner?.phone || h.contactNumber || '',
          ownerEmail: h.owner?.email || '',
          assignedAgentName: h.assignedSalesAgent?.name || h.onboardedBy?.name || '',
          plan: h.plan || 'monthly',
          billingCycle: h.billingCycle || 'monthly',
          actionType: 'initial',
          planPrice: Number(h.planPrice) || 0,
          discountAmount: Number(h.discountAmount) || 0,
          extraCharges: Number(h.extraCharges) || 0,
          finalAmount: Number(h.planPrice) || 0,
          paymentMethod: 'UPI',
          paymentReference: 'Initial Onboarding Plan',
          startDate: h.planStartDate,
          endDate: h.planEndDate,
          durationDays: 30,
          notes: h.planNotes || 'Initial subscription assigned on property onboarding',
          recordedByName: 'Super Admin',
          createdAt: h.planStartDate || h.createdAt
        });
      }
    });

    // Sort newest transactions first
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Summary aggregates
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalRevenue = transactions.reduce((sum, t) => sum + (t.finalAmount || 0), 0);
    const thisMonthRevenue = transactions
      .filter(t => new Date(t.createdAt) >= startOfThisMonth)
      .reduce((sum, t) => sum + (t.finalAmount || 0), 0);
    const todayRevenue = transactions
      .filter(t => new Date(t.createdAt) >= startOfToday)
      .reduce((sum, t) => sum + (t.finalAmount || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        totalRevenue,
        thisMonthRevenue,
        todayRevenue,
        totalTransactionsCount: transactions.length
      }
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
            .select('name address plan planStatus planPrice createdAt contactNumber onboardedBy assignedSalesAgent subscriptionHistory')
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

        // Calculate total revenue from actual historical subscription payments
        const totalRevenue = enrichedHotels.reduce((sum, h) => {
          const history = Array.isArray(h.subscriptionHistory) ? h.subscriptionHistory : [];
          if (history.length > 0) {
            return sum + history.reduce((subSum, s) => subSum + (Number(s.finalAmount !== undefined ? s.finalAmount : s.planPrice) || 0), 0);
          } else if (h.planPrice > 0 && h.plan !== 'demo') {
            return sum + (Number(h.planPrice) || 0);
          }
          return sum;
        }, 0);

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
