const Hostel = require('../models/Hostel');
const User = require('../models/User');

exports.createHostel = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (!payload.owner) {
      payload.owner = req.user.id;
    }
    if (!payload.email || payload.email.trim() === '') {
      delete payload.email;
    }
    if (!payload.contactNumber || payload.contactNumber.trim() === '') {
      payload.contactNumber = 'N/A';
    }
    if (!payload.address || payload.address.trim() === '') {
      payload.address = 'N/A';
    }
    if (typeof payload.upiId === 'string') {
      payload.upiId = payload.upiId.trim();
    }
    if (typeof payload.upiPayeeName === 'string') {
      payload.upiPayeeName = payload.upiPayeeName.trim();
    }
    if (req.user) {
      payload.onboardedBy = payload.onboardedBy || req.user._id;
      if (req.user.role === 'sales') {
        payload.assignedSalesAgent = req.user._id;
      }
    }
    if (payload.assignedSalesAgent === '' || payload.assignedSalesAgent === 'unassigned') {
      delete payload.assignedSalesAgent;
    }

    // 🧾 Initialize subscription history record for initial paid plan
    if (payload.plan && payload.plan !== 'demo' && Number(payload.planPrice) > 0) {
      if (!Array.isArray(payload.subscriptionHistory) || payload.subscriptionHistory.length === 0) {
        payload.subscriptionHistory = [{
          plan: payload.plan,
          billingCycle: payload.billingCycle || 'monthly',
          planPrice: Number(payload.planPrice) || 0,
          discountAmount: Number(payload.discountAmount) || 0,
          extraCharges: Number(payload.extraCharges) || 0,
          finalAmount: Number(payload.planPrice) || 0,
          paymentMethod: payload.paymentMethod || 'UPI',
          paymentReference: payload.paymentReference || 'Initial Plan',
          startDate: payload.planStartDate || new Date(),
          endDate: payload.planEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          durationDays: 30,
          actionType: 'initial',
          notes: payload.planNotes || 'Initial subscription assigned on property onboarding',
          recordedBy: req.user?._id,
          recordedByName: req.user?.name || (req.user?.role === 'sales' ? 'Sales Representative' : 'Super Admin'),
          createdAt: new Date()
        }];
      }
    }

    const hostel = await Hostel.create(payload);

    // If owner has no phone, sync property contactNumber to owner
    if (payload.contactNumber && payload.contactNumber !== 'N/A' && payload.owner) {
      await User.updateOne(
        { _id: payload.owner, $or: [{ phone: { $exists: false } }, { phone: '' }, { phone: null }] },
        { $set: { phone: payload.contactNumber } }
      );
    }

    // 🛏️ Automatically seed 6 starter rooms if requested
    if (payload.createStarterRooms !== false) {
      try {
        const Room = require('../models/Room');
        const starterRooms = [
          { roomNumber: '101', floor: '1st Floor', roomType: 'Deluxe', capacity: 2, price12h: 1200, price24h: 1800, hostel: hostel._id, status: 'Active', housekeepingStatus: 'clean' },
          { roomNumber: '102', floor: '1st Floor', roomType: 'Deluxe', capacity: 2, price12h: 1200, price24h: 1800, hostel: hostel._id, status: 'Active', housekeepingStatus: 'clean' },
          { roomNumber: '103', floor: '1st Floor', roomType: 'Standard Double', capacity: 2, price12h: 900, price24h: 1400, hostel: hostel._id, status: 'Active', housekeepingStatus: 'clean' },
          { roomNumber: '104', floor: '1st Floor', roomType: 'Standard Double', capacity: 2, price12h: 900, price24h: 1400, hostel: hostel._id, status: 'Active', housekeepingStatus: 'clean' },
          { roomNumber: '201', floor: '2nd Floor', roomType: 'Suite', capacity: 3, price12h: 1800, price24h: 2800, hostel: hostel._id, status: 'Active', housekeepingStatus: 'clean' },
          { roomNumber: '202', floor: '2nd Floor', roomType: 'Family Room', capacity: 4, price12h: 2200, price24h: 3500, hostel: hostel._id, status: 'Active', housekeepingStatus: 'clean' }
        ];
        await Room.insertMany(starterRooms);
      } catch (rErr) {
        console.error('Auto-seed starter rooms notice:', rErr.message);
      }
    }

    res.status(201).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

exports.getHostels = async (req, res, next) => {
  try {
    let query;
    if (req.user.role === 'admin') {
      // Find hostels owned by this admin
      query = Hostel.find({ owner: req.user.id });
    } else if (req.user.role === 'superadmin') {
      query = Hostel.find();
    } else if (req.user.role === 'sales') {
      query = Hostel.find({
        $or: [{ onboardedBy: req.user.id }, { assignedSalesAgent: req.user.id }]
      });
    } else {
      query = Hostel.find({ _id: req.user.assignedHostel });
    }
    const hostels = await query
      .populate('owner', 'name email phone')
      .populate('assignedSalesAgent', 'name email phone')
      .populate('onboardedBy', 'name email phone');
    res.status(200).json({ success: true, data: hostels });
  } catch (error) {
    next(error);
  }
};

exports.getHostel = async (req, res, next) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role === 'admin') {
      query.owner = req.user.id;
    } else if (req.user.role === 'sales') {
      query.$or = [{ onboardedBy: req.user.id }, { assignedSalesAgent: req.user.id }];
    } else if (req.user.role !== 'superadmin') {
      // Receptionist can only access their assigned hostel
      if (req.user.assignedHostel?.toString() !== req.params.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to access this hostel' });
      }
    }
    
    const hostel = await Hostel.findOne(query)
      .populate('owner', 'name email phone')
      .populate('assignedSalesAgent', 'name email phone')
      .populate('onboardedBy', 'name email phone');
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found or not owned/managed by you' });
    }
    res.status(200).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

exports.updateHostel = async (req, res, next) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role === 'admin') {
      query.owner = req.user.id;
    } else if (req.user.role === 'sales') {
      query.$or = [{ onboardedBy: req.user.id }, { assignedSalesAgent: req.user.id }];
    }
    let updateData = { ...req.body };
    if (req.user.role !== 'superadmin') {
      // Normal admins & sales cannot alter core plan properties through this generic endpoint
      delete updateData.plan;
      delete updateData.planStatus;
      delete updateData.planStartDate;
      delete updateData.planEndDate;
      delete updateData.planPrice;
      delete updateData.billingCycle;
      delete updateData.maxRooms;
      delete updateData.owner;
      delete updateData.assignedSalesAgent;
    } else {
      if (updateData.assignedSalesAgent === '' || updateData.assignedSalesAgent === 'unassigned' || updateData.assignedSalesAgent === null) {
        updateData.assignedSalesAgent = null;
      }
    }

    if (updateData.email === '' || updateData.email === null) {
      delete updateData.email;
    }

    if (!updateData.owner) {
      delete updateData.owner;
    }

    if (typeof updateData.upiId === 'string') {
      updateData.upiId = updateData.upiId.trim();
    }
    if (typeof updateData.upiPayeeName === 'string') {
      updateData.upiPayeeName = updateData.upiPayeeName.trim();
    }

    const hostel = await Hostel.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true
    });
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found or not owned by you' });
    }

    if (updateData.contactNumber && updateData.contactNumber !== 'N/A' && hostel.owner) {
      await User.updateOne(
        { _id: hostel.owner, $or: [{ phone: { $exists: false } }, { phone: '' }, { phone: null }] },
        { $set: { phone: updateData.contactNumber } }
      );
    }

    res.status(200).json({ success: true, data: hostel });
  } catch (error) {
    next(error);
  }
};

exports.deleteHostel = async (req, res, next) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role === 'admin') {
      query.owner = req.user.id;
    }
    const hostel = await Hostel.findOneAndDelete(query);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found or not owned by you' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
