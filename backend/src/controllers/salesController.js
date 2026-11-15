const User = require('../models/User');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Stay = require('../models/Stay');
const SalesLead = require('../models/SalesLead');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * 🔒 Verify if sales user is permitted to manage this property
 */
const canManageHostel = (user, hostel) => {
  if (!user || !hostel) return false;
  if (user.role === 'superadmin') return true;
  const userIdStr = (user._id || user.id)?.toString();
  const onboardedByStr = (hostel.onboardedBy?._id || hostel.onboardedBy)?.toString();
  const assignedAgentStr = (hostel.assignedSalesAgent?._id || hostel.assignedSalesAgent)?.toString();
  return onboardedByStr === userIdStr || assignedAgentStr === userIdStr;
};

/**
 * 📊 Get Logged-in Sales Executive's Target & Performance Metrics
 * (STRICT PRIVACY: Shows only this agent's target & numbers, no platform revenue)
 */
exports.getSalesStats = async (req, res, next) => {
  try {
    const salesUserId = req.user.id;

    const agentUser = await User.findById(salesUserId).select('name email phone monthlyTargetHotels').lean();
    const monthlyTarget = agentUser?.monthlyTargetHotels || 10;

    // Current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [
      myHotels, 
      myActiveHotels, 
      myTrialHotels, 
      thisMonthOnboarded,
      onboardedByMeCount,
      assignedByAdminCount,
      totalLeads,
      activeLeads,
      demoLeads,
      wonLeads,
      todayFollowUps,
      overdueFollowUps
    ] = await Promise.all([
      Hostel.find({ $or: [{ onboardedBy: salesUserId }, { assignedSalesAgent: salesUserId }] }).select('plan planStatus planPrice planEndDate createdAt name'),
      Hostel.countDocuments({ $or: [{ onboardedBy: salesUserId }, { assignedSalesAgent: salesUserId }], planStatus: 'active' }),
      Hostel.countDocuments({
        $and: [
          { $or: [{ onboardedBy: salesUserId }, { assignedSalesAgent: salesUserId }] },
          { $or: [{ planStatus: 'trial' }, { plan: 'demo' }] }
        ]
      }),
      Hostel.countDocuments({
        onboardedBy: salesUserId,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      Hostel.countDocuments({ onboardedBy: salesUserId }),
      Hostel.countDocuments({ assignedSalesAgent: salesUserId, onboardedBy: { $ne: salesUserId } }),
      SalesLead.countDocuments({ salesAgent: salesUserId }),
      SalesLead.countDocuments({ salesAgent: salesUserId, status: { $nin: ['won', 'lost'] } }),
      SalesLead.countDocuments({ salesAgent: salesUserId, status: { $in: ['demo_scheduled', 'demo_completed'] } }),
      SalesLead.countDocuments({ salesAgent: salesUserId, status: 'won' }),
      SalesLead.countDocuments({
        salesAgent: salesUserId,
        status: { $nin: ['won', 'lost'] },
        nextFollowUpDate: { $gte: todayStart, $lte: todayEnd }
      }),
      SalesLead.countDocuments({
        salesAgent: salesUserId,
        status: { $nin: ['won', 'lost'] },
        nextFollowUpDate: { $lt: todayStart }
      })
    ]);

    const targetProgressPct = Math.min(100, Math.round((thisMonthOnboarded / monthlyTarget) * 100));
    const remainingTarget = Math.max(0, monthlyTarget - thisMonthOnboarded);

    // Days remaining in month
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemainingInMonth = Math.max(0, totalDaysInMonth - now.getDate());

    // Subscription Expiry & Portfolio Collections Calculation
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let totalPortfolioRevenue = 0;

    myHotels.forEach(h => {
      if (h.planStatus === 'active') {
        totalPortfolioRevenue += (h.planPrice || 0);
      }
      const end = h.planEndDate ? new Date(h.planEndDate) : null;
      if (end) {
        if (end < now || h.planStatus === 'expired') {
          expiredCount++;
        } else if (end <= in7Days) {
          expiringSoonCount++;
        }
      }
    });

    // Get recent 5 onboardings/managed
    const recentHotels = await Hostel.find({ $or: [{ onboardedBy: salesUserId }, { assignedSalesAgent: salesUserId }] })
      .populate('owner', 'name email phone')
      .populate('onboardedBy', 'name email')
      .populate('assignedSalesAgent', 'name email')
      .sort('-createdAt')
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        agent: {
          name: agentUser?.name,
          monthlyTarget,
          thisMonthOnboarded,
          targetProgressPct,
          remainingTarget,
          daysRemainingInMonth
        },
        myHotelsCount: myHotels.length,
        myActivePaidCount: myActiveHotels,
        myTrialCount: myTrialHotels,
        expiringSoonCount,
        expiredCount,
        totalPortfolioRevenue,
        onboardedByMeCount,
        assignedByAdminCount,
        pipeline: {
          totalLeads,
          activeLeads,
          demoLeads,
          wonLeads,
          todayFollowUps,
          overdueFollowUps
        },
        recentOnboardings: recentHotels
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🌐 Get Sales Ecosystem: Owners, Hostels, and Staff Users
 * (Gives Sales rep full ecosystem view for their accounts and properties)
 */
exports.getSalesEcosystem = async (req, res, next) => {
  try {
    const salesUserId = req.user.id;
    const isSuperAdmin = req.user.role === 'superadmin';

    // 1. Get hostels:
    // Sales person sees hotels they onboarded PLUS hotels assigned to them by Super Admin
    const hostelQuery = isSuperAdmin 
      ? {} 
      : { $or: [{ onboardedBy: salesUserId }, { assignedSalesAgent: salesUserId }] };

    const allHostels = await Hostel.find(hostelQuery)
      .populate('owner', 'name email phone isActive')
      .populate('onboardedBy', 'name email phone')
      .populate('assignedSalesAgent', 'name email phone')
      .sort('-createdAt')
      .lean();

    const now = new Date();

    const enrichedHostels = await Promise.all(
      allHostels.map(async (h) => {
        const [roomCount, staffMembers] = await Promise.all([
          Room.countDocuments({ hostel: h._id }),
          User.find({ assignedHostel: h._id, role: 'receptionist' })
            .select('name email phone isActive createdAt')
            .lean()
        ]);

        const endDate = h.planEndDate ? new Date(h.planEndDate) : null;
        const isExpired = h.planStatus === 'expired' || (endDate && endDate < now);
        const daysRemaining = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0;
        
        const isOnboardedByMe = (h.onboardedBy?._id || h.onboardedBy)?.toString() === salesUserId;
        const isAssignedToMe = (h.assignedSalesAgent?._id || h.assignedSalesAgent)?.toString() === salesUserId;
        const isMine = isSuperAdmin || isOnboardedByMe || isAssignedToMe;

        return {
          ...h,
          roomCount,
          staffCount: staffMembers.length,
          staffMembers,
          isExpired: Boolean(isExpired),
          daysRemaining,
          isMine,
          isOnboardedByMe,
          isAssignedToMe
        };
      })
    );

    // 2. Get Owners (Admins) for these hotels
    const ownerIds = enrichedHostels.map(h => (h.owner?._id || h.owner)?.toString()).filter(Boolean);
    const ownerQuery = isSuperAdmin 
      ? { role: 'admin' } 
      : { 
          role: 'admin', 
          $or: [
            { _id: { $in: ownerIds } },
            { onboardedBy: salesUserId }
          ] 
        };

    const owners = await User.find(ownerQuery)
      .select('name email phone isActive createdAt onboardedBy')
      .sort('-createdAt')
      .lean();

    const enrichedOwners = owners.map(o => {
      const ownedHostels = enrichedHostels.filter(h => (h.owner?._id || h.owner)?.toString() === o._id.toString());
      const isMine = isSuperAdmin || o.onboardedBy?.toString() === salesUserId || ownedHostels.some(h => h.isMine);
      return {
        ...o,
        ownedHostelsCount: ownedHostels.length,
        isMine
      };
    });

    // 3. Get Staff (Receptionists) for these hotels
    const hostelIds = enrichedHostels.map(h => h._id);
    const staffQuery = isSuperAdmin 
      ? { role: 'receptionist' } 
      : { 
          role: 'receptionist',
          $or: [
            { assignedHostel: { $in: hostelIds } },
            { onboardedBy: salesUserId }
          ]
        };

    const staffUsers = await User.find(staffQuery)
      .select('name email phone isActive createdAt assignedHostel onboardedBy')
      .populate('assignedHostel', 'name contactNumber')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        hostels: enrichedHostels,
        owners: enrichedOwners,
        staffUsers
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 👑 Create Hotel Owner (Admin)
 */
exports.createSalesOwner = async (req, res, next) => {
  try {
    const salesUserId = req.user.id;
    const { name, email, phone, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : undefined,
      password: password || 'password123',
      role: 'admin',
      onboardedBy: salesUserId
    });

    res.status(201).json({
      success: true,
      message: `✅ Hotel Owner "${user.name}" created successfully!`,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🏨 Create Hotel Property (attaching to an Owner)
 */
exports.createSalesProperty = async (req, res, next) => {
  try {
    const salesUserId = req.user.id;
    const {
      name,
      address,
      contactNumber,
      email,
      owner,
      plan = 'demo',
      maxRooms = 20,
      upiId,
      upiPayeeName,
      leadId
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Hotel name is required' });
    }
    if (!owner) {
      return res.status(400).json({ success: false, message: 'Please select a Hotel Owner (Admin)' });
    }

    const durationDays = plan === 'demo' ? 14 : 30;
    const planStartDate = new Date();
    const planEndDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const hostel = await Hostel.create({
      name: name.trim(),
      address: address || 'N/A',
      contactNumber: contactNumber || 'N/A',
      email: email ? email.toLowerCase().trim() : undefined,
      owner,
      onboardedBy: salesUserId,
      assignedSalesAgent: salesUserId,
      plan,
      planStatus: plan === 'demo' ? 'trial' : 'active',
      planPrice: plan === 'demo' ? 0 : 2499,
      billingCycle: 'monthly',
      planStartDate,
      planEndDate,
      maxRooms: Number(maxRooms) || 20,
      upiId: upiId ? upiId.trim() : undefined,
      upiPayeeName: upiPayeeName ? upiPayeeName.trim() : undefined,
      isActive: true
    });

    if (leadId) {
      await SalesLead.findByIdAndUpdate(leadId, {
        status: 'won',
        convertedHostel: hostel._id,
        convertedAt: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: `✅ Property "${hostel.name}" created successfully!`,
      data: hostel
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🛎️ Create Front Desk Staff (Receptionist) assigned to a Hotel
 */
exports.createSalesStaff = async (req, res, next) => {
  try {
    const salesUserId = req.user.id;
    const { name, email, phone, password, assignedHostel } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Staff name and email are required' });
    }
    if (!assignedHostel) {
      return res.status(400).json({ success: false, message: 'Please select assigned property for staff' });
    }

    const hostel = await Hostel.findById(assignedHostel);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Assigned property not found' });
    }

    if (!canManageHostel(req.user, hostel)) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You can only assign staff to properties in your portfolio' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : undefined,
      password: password || 'password123',
      role: 'receptionist',
      assignedHostel,
      onboardedBy: salesUserId
    });

    res.status(201).json({
      success: true,
      message: `✅ Front desk staff "${user.name}" created successfully!`,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✏️ Update Property Details
 */
exports.updateSalesProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, contactNumber, email, owner, upiId, upiPayeeName, maxRooms } = req.body;

    const hostel = await Hostel.findById(id);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (!canManageHostel(req.user, hostel)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this property' });
    }

    if (name) hostel.name = name.trim();
    if (address !== undefined) hostel.address = address.trim();
    if (contactNumber !== undefined) hostel.contactNumber = contactNumber.trim();
    if (email !== undefined) hostel.email = email.toLowerCase().trim();
    if (owner) hostel.owner = owner;
    if (upiId !== undefined) hostel.upiId = upiId.trim();
    if (upiPayeeName !== undefined) hostel.upiPayeeName = upiPayeeName.trim();
    if (maxRooms !== undefined) hostel.maxRooms = Number(maxRooms);

    await hostel.save();

    res.status(200).json({
      success: true,
      message: `✅ Property "${hostel.name}" updated successfully`,
      data: hostel
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ✏️ Update User / Owner / Staff Details
 */
exports.updateSalesUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot modify superadmin' });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (phone !== undefined) user.phone = phone.trim();

    await user.save();

    res.status(200).json({
      success: true,
      message: `✅ User "${user.name}" updated successfully`,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * ⚙️ Toggle Property Feature (AI OCR, WhatsApp Sync, Laundry)
 */
exports.toggleSalesPropertyFeature = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feature } = req.body; // 'aiOcr' | 'whatsappSync' | 'laundry'

    const hostel = await Hostel.findById(id);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (!canManageHostel(req.user, hostel)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this property' });
    }

    if (feature === 'aiOcr') {
      hostel.aiOcrEnabled = !hostel.aiOcrEnabled;
    } else if (feature === 'whatsappSync') {
      hostel.whatsappSyncEnabled = !hostel.whatsappSyncEnabled;
    } else if (feature === 'laundry') {
      hostel.laundryEnabled = !hostel.laundryEnabled;
    }

    await hostel.save();

    res.status(200).json({
      success: true,
      message: `✅ Feature updated for ${hostel.name}`,
      data: hostel
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

    if (userId) {
      targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (targetUser.isActive === false) {
        return res.status(400).json({ success: false, message: 'Cannot login: Account is currently deactivated.' });
      }
      if (targetUser.assignedHostel) {
        hostel = await Hostel.findById(targetUser.assignedHostel);
      } else if (targetUser.role === 'admin') {
        hostel = await Hostel.findOne({
          owner: targetUser._id,
          $or: [{ onboardedBy: req.user.id }, { assignedSalesAgent: req.user.id }]
        }) || await Hostel.findOne({ owner: targetUser._id });
      }
    } else if (hostelId) {
      hostel = await Hostel.findById(hostelId).populate('owner');
      if (hostel) {
        targetUser = hostel.owner;
      }
    }

    if (!hostel && !targetUser) {
      return res.status(404).json({ success: false, message: 'Target property or user not found' });
    }

    if (hostel && !canManageHostel(req.user, hostel)) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this property or user account' });
    }

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
      message: `⚡ Demo/Support Mode launched for ${hostel ? hostel.name : targetUser.name}`,
      token,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        assignedHostel: hostel ? hostel._id : targetUser.assignedHostel
      },
      hostel: hostel ? {
        _id: hostel._id,
        name: hostel.name
      } : null,
      returnUrl: '/sales'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🔑 Reset Client Hotel Owner / Staff Password
 */
exports.resetClientPassword = async (req, res, next) => {
  try {
    const { userId, ownerId, newPassword } = req.body;
    const targetId = userId || ownerId;
    if (!targetId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const targetUser = await User.findById(targetId);
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
    const isSuperAdmin = req.user.role === 'superadmin';
    const { status, priority, search, agentId } = req.query;

    const query = {};
    if (isSuperAdmin) {
      if (agentId && agentId !== 'all') {
        query.salesAgent = agentId;
      }
    } else {
      query.salesAgent = req.user.id;
    }

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

    const leads = await SalesLead.find(query)
      .populate('salesAgent', 'name email phone')
      .sort('-updatedAt')
      .lean();

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
    const isSuperAdmin = req.user.role === 'superadmin';
    const leadQuery = isSuperAdmin ? { _id: id } : { _id: id, salesAgent: req.user.id };
    const lead = await SalesLead.findOne(leadQuery);
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
    const isSuperAdmin = req.user.role === 'superadmin';
    const leadQuery = isSuperAdmin ? { _id: id } : { _id: id, salesAgent: req.user.id };
    const lead = await SalesLead.findOne(leadQuery);
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

/**
 * 🎟️ Assign / Update Subscription Plan & Rooms Limit for Property (Like Super Admin)
 */
exports.updateSalesPropertyPlan = async (req, res, next) => {
  try {
    const { plan, planStatus, planStartDate, planEndDate, planPrice, billingCycle, maxRooms, planNotes } = req.body;
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Property not found' });

    if (!canManageHostel(req.user, hostel)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this property' });
    }

    if (plan !== undefined) hostel.plan = plan;
    if (planStatus !== undefined) hostel.planStatus = planStatus;
    if (planStartDate !== undefined) hostel.planStartDate = planStartDate;
    if (planEndDate !== undefined) hostel.planEndDate = planEndDate;
    if (planPrice !== undefined) hostel.planPrice = Number(planPrice) || 0;
    if (billingCycle !== undefined) hostel.billingCycle = billingCycle;
    if (maxRooms !== undefined) hostel.maxRooms = Number(maxRooms) || 20;
    if (planNotes !== undefined) hostel.planNotes = planNotes;

    await hostel.save();

    res.status(200).json({
      success: true,
      message: `✅ Plan updated successfully for "${hostel.name}"`,
      data: hostel
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🔒 Toggle Property Active/Locked Status
 */
exports.toggleSalesPropertyStatus = async (req, res, next) => {
  try {
    const hostel = await Hostel.findById(req.params.id);
    if (!hostel) return res.status(404).json({ success: false, message: 'Property not found' });

    if (!canManageHostel(req.user, hostel)) {
      return res.status(403).json({ success: false, message: 'Not authorized to manage this property' });
    }
    hostel.isActive = hostel.isActive === false ? true : false;
    await hostel.save();
    res.status(200).json({
      success: true,
      message: `Property "${hostel.name}" is now ${hostel.isActive ? 'Active' : 'Locked'}`,
      data: hostel
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🔒 Toggle User (Owner / Staff) Active/Locked Status
 */
exports.toggleSalesUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'superadmin') return res.status(403).json({ success: false, message: 'Cannot modify superadmin' });
    user.isActive = user.isActive === false ? true : false;
    await user.save();
    res.status(200).json({
      success: true,
      message: `User "${user.name}" is now ${user.isActive ? 'Active' : 'Locked'}`,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 📅 Log Follow-up Activity for a Lead
 */
exports.addLeadFollowUp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note, nextFollowUpDate, status, priority } = req.body;
    const isSuperAdmin = req.user.role === 'superadmin';
    const leadQuery = isSuperAdmin ? { _id: id } : { _id: id, salesAgent: req.user.id };
    const lead = await SalesLead.findOne(leadQuery);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found or unauthorized' });

    if (note && note.trim()) {
      lead.followUpHistory.unshift({
        note: note.trim(),
        followUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
        status: status || lead.status,
        by: req.user.name || (isSuperAdmin ? 'Super Admin' : 'Sales Executive'),
        createdAt: new Date()
      });
      lead.notes = note.trim();
    }
    if (nextFollowUpDate) lead.nextFollowUpDate = new Date(nextFollowUpDate);
    if (status) lead.status = status;
    if (priority) lead.priority = priority;

    await lead.save();

    res.status(200).json({
      success: true,
      message: '✅ Follow-up logged successfully',
      data: lead
    });
  } catch (err) {
    next(err);
  }
};
