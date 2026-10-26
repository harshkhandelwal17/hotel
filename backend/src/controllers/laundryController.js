const LaundryOrder = require('../models/LaundryOrder');
const Hostel = require('../models/Hostel');
const Stay = require('../models/Stay');
const { getHostelFilter, userCanAccessHostel, assertHostelAccess } = require('../utils/hostelAccess');
const mongoose = require('mongoose');

// @desc    Get all laundry orders with optional filters & summary stats
// @route   GET /api/laundry
// @access  Private (Receptionist, Admin, Superadmin)
exports.getLaundryOrders = async (req, res, next) => {
  try {
    const filter = await getHostelFilter(req.user, req.query.hostel);

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    if (req.query.paymentStatus && req.query.paymentStatus !== 'all') {
      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.search) {
      const q = req.query.search.trim();
      filter.$or = [
        { vendorName: { $regex: q, $options: 'i' } },
        { vendorPhone: { $regex: q, $options: 'i' } },
        { orderNumber: { $regex: q, $options: 'i' } }
      ];
    }

    if (req.query.startDate || req.query.endDate) {
      filter.sentDate = {};
      if (req.query.startDate) {
        filter.sentDate.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.sentDate.$lte = end;
      }
    }

    const orders = await LaundryOrder.find(filter)
      .populate('hostel', 'name address laundryEnabled upiId upiPayeeName')
      .populate('dispatchedBy', 'name role')
      .populate('receivedBy', 'name role')
      .sort('-sentDate')
      .limit(1000);

    // Compute live summary stats for the active filter & extract recent vendors/rates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let clothesAtLaundry = 0;
    let monthlyExpense = 0;
    let totalPendingBills = 0;
    let totalPaidOverall = 0;

    const vendorMap = new Map();
    const vendorLedgersMap = new Map();
    const withDhobiCounts = {};
    const ratesMap = {};

    orders.forEach(o => {
      const vName = (o.vendorName || 'General Dhobi').trim();
      const vKey = vName.toLowerCase();

      // Vendor Ledger Entry
      if (!vendorLedgersMap.has(vKey)) {
        vendorLedgersMap.set(vKey, {
          vendorName: vName,
          vendorPhone: o.vendorPhone || '',
          totalBatches: 0,
          totalPieces: 0,
          totalBilled: 0,
          totalPaid: 0,
          totalDue: 0,
          unpaidBatchesCount: 0,
          lastBatchDate: o.sentDate,
          lastPaymentDate: o.paymentDate || null
        });
      }
      const ledger = vendorLedgersMap.get(vKey);
      ledger.totalBatches += 1;
      ledger.totalPieces += (Number(o.totalPiecesSent) || 0);

      const billed = Number(o.totalAmount) || 0;
      const paid = Number(o.paidAmount) || 0;
      const due = Math.max(0, billed - paid);

      ledger.totalBilled += billed;
      ledger.totalPaid += paid;
      ledger.totalDue += due;
      if (due > 0) ledger.unpaidBatchesCount += 1;
      if (!ledger.vendorPhone && o.vendorPhone) ledger.vendorPhone = o.vendorPhone;
      if (o.paymentDate && (!ledger.lastPaymentDate || new Date(o.paymentDate) > new Date(ledger.lastPaymentDate))) {
        ledger.lastPaymentDate = o.paymentDate;
      }

      if (o.status === 'Sent') {
        clothesAtLaundry += (o.totalPiecesSent || 0) - (o.totalPiecesReceived || 0);
        // Track dirty pieces with dhobi per item
        if (Array.isArray(o.items)) {
          o.items.forEach(it => {
            const name = it.itemName;
            const pendingPieces = Math.max(0, (Number(it.sentCount) || 0) - (Number(it.receivedCount) || 0));
            withDhobiCounts[name] = (withDhobiCounts[name] || 0) + pendingPieces;
          });
        }
      }

      totalPaidOverall += paid;

      const dateToCheck = o.paymentDate || o.sentDate;
      if (dateToCheck && new Date(dateToCheck) >= startOfMonth) {
        monthlyExpense += paid;
      }

      totalPendingBills += due;

      if (o.vendorName && !vendorMap.has(vKey)) {
        vendorMap.set(vKey, {
          vendorName: vName,
          vendorPhone: o.vendorPhone || ''
        });
      }

      if (Array.isArray(o.items)) {
        o.items.forEach(it => {
          if (it.itemName && it.ratePerPiece > 0 && !ratesMap[it.itemName]) {
            ratesMap[it.itemName] = it.ratePerPiece;
          }
        });
      }
    });

    const vendorLedgers = Array.from(vendorLedgersMap.values()).sort((a, b) => b.totalDue - a.totalDue);

    let defaultVendor = null;
    let defaultRates = ratesMap;
    let savedInventory = {};
    let linenItems = null;

    if (filter.hostel && mongoose.isValidObjectId(filter.hostel)) {
      const hDoc = await Hostel.findById(filter.hostel).select('laundrySettings');
      if (hDoc && hDoc.laundrySettings) {
        if (hDoc.laundrySettings.defaultVendorName) {
          defaultVendor = {
            vendorName: hDoc.laundrySettings.defaultVendorName,
            vendorPhone: hDoc.laundrySettings.defaultVendorPhone || ''
          };
        }
        if (hDoc.laundrySettings.defaultRates) {
          const customRates = hDoc.laundrySettings.defaultRates instanceof Map
            ? Object.fromEntries(hDoc.laundrySettings.defaultRates)
            : hDoc.laundrySettings.defaultRates;
          defaultRates = { ...ratesMap, ...customRates };
        }
        if (hDoc.laundrySettings.linenInventory) {
          savedInventory = hDoc.laundrySettings.linenInventory instanceof Map
            ? Object.fromEntries(hDoc.laundrySettings.linenInventory)
            : hDoc.laundrySettings.linenInventory;
        }
        if (hDoc.laundrySettings.linenItems && Array.isArray(hDoc.laundrySettings.linenItems) && hDoc.laundrySettings.linenItems.length > 0) {
          linenItems = hDoc.laundrySettings.linenItems;
        }
      }
    }

    // Fallback to most recent vendor if no default saved
    if (!defaultVendor && orders.length > 0 && orders[0].vendorName) {
      defaultVendor = {
        vendorName: orders[0].vendorName,
        vendorPhone: orders[0].vendorPhone || ''
      };
    }

    // Calculate Linen Stock in Rotation (Clean in Store, In Rooms, With Dhobi)
    const DEFAULT_PRESET_INVENTORY = {
      'Bedsheet (Double)': 50,
      'Bedsheet (Single)': 30,
      'Pillow Cover': 100,
      'Bath Towel': 60,
      'Hand Towel': 40,
      'Blanket': 25,
      'Duvet Cover': 25
    };

    const LINEN_ROOM_MULTIPLIERS = {
      'Bedsheet (Double)': 1,
      'Bedsheet (Single)': 0.5,
      'Pillow Cover': 2,
      'Bath Towel': 2,
      'Hand Towel': 1,
      'Blanket': 1,
      'Duvet Cover': 1
    };

    let activeStaysCount = 0;
    try {
      const stayQuery = { status: { $in: ['Active', 'Checkout Due', 'Overdue'] } };
      if (filter.hostel) stayQuery.hostel = filter.hostel;
      activeStaysCount = await Stay.countDocuments(stayQuery);
    } catch (_) {}

    let totalLinenPieces = 0;
    let totalInRoomsPieces = 0;
    let totalWithDhobiPieces = 0;
    let totalCleanPieces = 0;
    let lowStockAlertCount = 0;

    const linenRotation = Object.keys(DEFAULT_PRESET_INVENTORY).map(itemName => {
      const totalStock = (savedInventory && savedInventory[itemName] !== undefined)
        ? Math.max(0, Number(savedInventory[itemName]))
        : DEFAULT_PRESET_INVENTORY[itemName];

      const withDhobi = withDhobiCounts[itemName] || 0;
      const multiplier = LINEN_ROOM_MULTIPLIERS[itemName] || 1;
      const inRooms = Math.min(Math.max(0, totalStock - withDhobi), Math.round(activeStaysCount * multiplier));
      const cleanInStore = Math.max(0, totalStock - (withDhobi + inRooms));
      const healthPercent = totalStock > 0 ? Math.round((cleanInStore / totalStock) * 100) : 100;
      const isLow = cleanInStore <= 5 || healthPercent <= 20;

      if (isLow) lowStockAlertCount += 1;

      totalLinenPieces += totalStock;
      totalInRoomsPieces += inRooms;
      totalWithDhobiPieces += withDhobi;
      totalCleanPieces += cleanInStore;

      return {
        itemName,
        totalStock,
        withDhobi,
        inRooms,
        cleanInStore,
        healthPercent,
        isLow
      };
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      summary: {
        clothesAtLaundry: Math.max(0, clothesAtLaundry),
        monthlyExpense,
        totalPendingBills,
        totalPaidOverall,
        totalBatches: orders.length
      },
      recentVendors: Array.from(vendorMap.values()).slice(0, 6),
      vendorLedgers,
      linenRotation: {
        items: linenRotation,
        savedInventory,
        activeRoomsInUse: activeStaysCount,
        totals: {
          totalLinenPieces,
          totalInRoomsPieces,
          totalWithDhobiPieces,
          totalCleanPieces,
          lowStockAlertCount
        }
      },
      defaultVendor,
      defaultRates,
      linenItems,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single laundry order details
// @route   GET /api/laundry/:id
// @access  Private
exports.getLaundryOrder = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid laundry order ID' });
    }
    const order = await LaundryOrder.findById(req.params.id)
      .populate('hostel', 'name address laundryEnabled upiId upiPayeeName')
      .populate('dispatchedBy', 'name role')
      .populate('receivedBy', 'name role');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Laundry order not found' });
    }

    if (!(await userCanAccessHostel(req.user, order.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this laundry order' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Create / Dispatch new laundry order to vendor
// @route   POST /api/laundry
// @access  Private (Staff, Admin, Superadmin)
exports.createLaundryOrder = async (req, res, next) => {
  try {
    let rawHostel = (req.body.hostel && req.body.hostel !== 'all') ? req.body.hostel : req.user.assignedHostel;
    let hostelId = (rawHostel && typeof rawHostel === 'object' && rawHostel._id) ? rawHostel._id : rawHostel;

    if (!hostelId || hostelId === 'all' || !mongoose.isValidObjectId(hostelId)) {
      return res.status(400).json({ success: false, message: 'Please select a valid hotel / property for this laundry dispatch' });
    }

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (!(await userCanAccessHostel(req.user, hostelId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this property' });
    }

    // Check if Super Admin has enabled laundry feature for this property
    if (!hostel.laundryEnabled && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Laundry Management module is currently not enabled for this property. Please contact Super Admin to activate it.'
      });
    }

    const {
      vendorName,
      vendorPhone,
      sentDate,
      expectedReturnDate,
      items,
      totalAmount,
      paidAmount,
      paymentMethod,
      notes
    } = req.body;

    if (!vendorName || !vendorName.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter vendor or dhobi name' });
    }

    const sanitizedItems = Array.isArray(items) ? items.map(it => ({
      itemName: String(it.itemName || 'Linen').trim(),
      sentCount: Math.max(0, Number(it.sentCount) || 0),
      receivedCount: Math.max(0, Number(it.receivedCount) || 0),
      damagedOrMissingCount: Math.max(0, Number(it.damagedOrMissingCount) || 0),
      ratePerPiece: Math.max(0, Number(it.ratePerPiece) || 0),
      totalCost: Math.max(0, Number(it.totalCost) || (Number(it.sentCount || 0) * Number(it.ratePerPiece || 0)))
    })) : [];

    const totalSent = sanitizedItems.reduce((sum, it) => sum + it.sentCount, 0);
    const calculatedBill = sanitizedItems.reduce((sum, it) => sum + it.totalCost, 0);

    const billAmount = Number(totalAmount) !== undefined && Number(totalAmount) >= 0
      ? Number(totalAmount)
      : calculatedBill;

    const paid = Math.max(0, Number(paidAmount) || 0);
    let payStatus = 'Unpaid';
    if (paid >= billAmount && billAmount > 0) {
      payStatus = 'Paid';
    } else if (paid > 0) {
      payStatus = 'Partial';
    }

    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `LD-${dateStr}-${rand}`;

    const order = await LaundryOrder.create({
      hostel: hostelId,
      orderNumber,
      vendorName: vendorName.trim(),
      vendorPhone: (vendorPhone || '').trim(),
      sentDate: sentDate ? new Date(sentDate) : new Date(),
      expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : undefined,
      status: 'Sent',
      items: sanitizedItems,
      totalPiecesSent: totalSent,
      totalPiecesReceived: 0,
      totalPiecesMissing: 0,
      totalAmount: billAmount,
      paidAmount: paid,
      paymentStatus: payStatus,
      paymentMethod: paymentMethod || 'Cash',
      paymentDate: paid > 0 ? new Date() : undefined,
      notes: (notes || '').trim(),
      dispatchedBy: req.user._id
    });

    // Auto-remember vendor & rates for next dispatches
    if (hostel) {
      if (!hostel.laundrySettings) hostel.laundrySettings = {};
      hostel.laundrySettings.defaultVendorName = vendorName.trim();
      if (vendorPhone) hostel.laundrySettings.defaultVendorPhone = vendorPhone.trim();

      const newRates = hostel.laundrySettings.defaultRates || new Map();
      sanitizedItems.forEach(it => {
        if (it.itemName && it.ratePerPiece > 0) {
          if (newRates instanceof Map) {
            newRates.set(it.itemName, it.ratePerPiece);
          } else {
            newRates[it.itemName] = it.ratePerPiece;
          }
        }
      });
      hostel.laundrySettings.defaultRates = newRates;
      await hostel.save({ validateBeforeSave: false }).catch(() => {});
    }

    const populated = await LaundryOrder.findById(order._id)
      .populate('hostel', 'name address laundryEnabled upiId upiPayeeName')
      .populate('dispatchedBy', 'name role');

    res.status(201).json({
      success: true,
      message: 'Laundry dispatched to vendor successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Receive laundry batch back from vendor (clean count & missing check)
// @route   PUT /api/laundry/:id/receive
// @access  Private
exports.receiveLaundryOrder = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid laundry order ID' });
    }
    const order = await LaundryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Laundry order not found' });
    }

    if (!(await userCanAccessHostel(req.user, order.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this property' });
    }

    const {
      receivedDate,
      items,
      totalAmount,
      paidAmount,
      paymentMethod,
      notes
    } = req.body;

    if (Array.isArray(items) && items.length > 0) {
      order.items = items.map(it => ({
        itemName: String(it.itemName || 'Linen').trim(),
        sentCount: Math.max(0, Number(it.sentCount) || 0),
        receivedCount: Math.max(0, Number(it.receivedCount) || 0),
        damagedOrMissingCount: Math.max(0, Number(it.damagedOrMissingCount) || 0),
        ratePerPiece: Math.max(0, Number(it.ratePerPiece) || 0),
        totalCost: Math.max(0, Number(it.totalCost) || 0)
      }));
    }

    const totalRecv = order.items.reduce((sum, it) => sum + (Number(it.receivedCount) || 0), 0);
    const totalMissing = order.items.reduce((sum, it) => sum + (Number(it.damagedOrMissingCount) || 0), 0);

    order.totalPiecesReceived = totalRecv;
    order.totalPiecesMissing = totalMissing;
    order.status = 'Received';
    order.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
    order.receivedBy = req.user._id;

    if (totalAmount !== undefined && totalAmount !== '') {
      order.totalAmount = Math.max(0, Number(totalAmount) || 0);
    }

    if (paidAmount !== undefined && paidAmount !== '') {
      const paid = Math.max(0, Number(paidAmount) || 0);
      order.paidAmount = paid;
      if (paid >= order.totalAmount && order.totalAmount > 0) {
        order.paymentStatus = 'Paid';
      } else if (paid > 0) {
        order.paymentStatus = 'Partial';
      } else {
        order.paymentStatus = 'Unpaid';
      }
      if (paid > 0 && !order.paymentDate) {
        order.paymentDate = new Date();
      }
    }

    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (notes !== undefined) order.notes = notes;

    await order.save();

    const populated = await LaundryOrder.findById(order._id)
      .populate('hostel', 'name address laundryEnabled upiId upiPayeeName')
      .populate('dispatchedBy', 'name role')
      .populate('receivedBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Laundry marked as received successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record or add payment for a laundry bill
// @route   POST /api/laundry/:id/pay
// @access  Private
exports.recordLaundryPayment = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid laundry order ID' });
    }
    const order = await LaundryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Laundry order not found' });
    }

    if (!(await userCanAccessHostel(req.user, order.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this property' });
    }

    const { amount, paymentMethod, notes } = req.body;
    const payAmt = Number(amount);

    if (!Number.isFinite(payAmt) || payAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid payment amount' });
    }

    const currentPaid = Number(order.paidAmount) || 0;
    const newPaid = currentPaid + payAmt;
    order.paidAmount = newPaid;

    if (newPaid >= order.totalAmount) {
      order.paymentStatus = 'Paid';
    } else {
      order.paymentStatus = 'Partial';
    }

    if (paymentMethod) order.paymentMethod = paymentMethod;
    order.paymentDate = new Date();
    if (notes) order.notes = (order.notes ? order.notes + ' • ' : '') + notes;

    await order.save();

    res.status(200).json({
      success: true,
      message: `Payment of ₹${payAmt} recorded successfully`,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update general laundry details
// @route   PUT /api/laundry/:id
// @access  Private
exports.updateLaundryOrder = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid laundry order ID' });
    }
    const order = await LaundryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Laundry order not found' });
    }

    if (!(await userCanAccessHostel(req.user, order.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this property' });
    }

    const {
      vendorName,
      vendorPhone,
      sentDate,
      expectedReturnDate,
      receivedDate,
      status,
      items,
      totalAmount,
      paidAmount,
      paymentMethod,
      paymentStatus,
      notes
    } = req.body;

    if (vendorName) order.vendorName = vendorName.trim();
    if (vendorPhone !== undefined) order.vendorPhone = vendorPhone.trim();
    if (sentDate) order.sentDate = new Date(sentDate);
    if (expectedReturnDate !== undefined) order.expectedReturnDate = expectedReturnDate ? new Date(expectedReturnDate) : undefined;
    if (receivedDate !== undefined) order.receivedDate = receivedDate ? new Date(receivedDate) : undefined;
    if (status) order.status = status;

    if (Array.isArray(items)) {
      order.items = items.map(it => ({
        itemName: String(it.itemName || 'Linen').trim(),
        sentCount: Math.max(0, Number(it.sentCount) || 0),
        receivedCount: Math.max(0, Number(it.receivedCount) || 0),
        damagedOrMissingCount: Math.max(0, Number(it.damagedOrMissingCount) || 0),
        ratePerPiece: Math.max(0, Number(it.ratePerPiece) || 0),
        totalCost: Math.max(0, Number(it.totalCost) || 0)
      }));
      order.totalPiecesSent = order.items.reduce((s, it) => s + (Number(it.sentCount) || 0), 0);
      order.totalPiecesReceived = order.items.reduce((s, it) => s + (Number(it.receivedCount) || 0), 0);
      order.totalPiecesMissing = order.items.reduce((s, it) => s + (Number(it.damagedOrMissingCount) || 0), 0);
    }

    if (totalAmount !== undefined && totalAmount !== '') {
      order.totalAmount = Math.max(0, Number(totalAmount) || 0);
    }

    if (paidAmount !== undefined && paidAmount !== '') {
      order.paidAmount = Math.max(0, Number(paidAmount) || 0);
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    } else {
      if (order.paidAmount >= order.totalAmount && order.totalAmount > 0) {
        order.paymentStatus = 'Paid';
      } else if (order.paidAmount > 0) {
        order.paymentStatus = 'Partial';
      } else {
        order.paymentStatus = 'Unpaid';
      }
    }

    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (notes !== undefined) order.notes = notes;

    await order.save();

    const populated = await LaundryOrder.findById(order._id)
      .populate('hostel', 'name address laundryEnabled upiId upiPayeeName')
      .populate('dispatchedBy', 'name role')
      .populate('receivedBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Laundry order updated successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete laundry order
// @route   DELETE /api/laundry/:id
// @access  Private
exports.deleteLaundryOrder = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid laundry order ID' });
    }
    const order = await LaundryOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Laundry order not found' });
    }

    if (!(await userCanAccessHostel(req.user, order.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this property' });
    }

    await LaundryOrder.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Laundry order deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update default laundry vendor & standard rates for a hostel
// @route   PUT /api/laundry/settings
// @access  Private
exports.updateLaundrySettings = async (req, res, next) => {
  try {
    const rawHostel = req.body.hostel || req.user.assignedHostel;
    const hostelId = (rawHostel && typeof rawHostel === 'object' && rawHostel._id) ? rawHostel._id : rawHostel;

    if (!hostelId || !mongoose.isValidObjectId(hostelId)) {
      return res.status(400).json({ success: false, message: 'Please specify a valid property' });
    }

    if (!(await userCanAccessHostel(req.user, hostelId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this property' });
    }

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (!hostel.laundrySettings) hostel.laundrySettings = {};

    const { defaultVendorName, defaultVendorPhone, defaultRates } = req.body;
    if (defaultVendorName !== undefined) hostel.laundrySettings.defaultVendorName = defaultVendorName.trim();
    if (defaultVendorPhone !== undefined) hostel.laundrySettings.defaultVendorPhone = defaultVendorPhone.trim();
    if (defaultRates && typeof defaultRates === 'object') {
      const currentRates = hostel.laundrySettings.defaultRates || new Map();
      Object.entries(defaultRates).forEach(([key, val]) => {
        const num = Math.max(0, Number(val) || 0);
        if (currentRates instanceof Map) {
          currentRates.set(key, num);
        } else {
          currentRates[key] = num;
        }
      });
      hostel.laundrySettings.defaultRates = currentRates;
    }

    if (req.body.linenItems && Array.isArray(req.body.linenItems)) {
      const validItems = req.body.linenItems
        .filter(it => it && it.itemName && it.itemName.trim())
        .map(it => ({
          itemName: it.itemName.trim(),
          defaultRate: Math.max(0, Number(it.defaultRate) || 0)
        }));
      hostel.laundrySettings.linenItems = validItems;

      // Sync to defaultRates Map
      const ratesMap = new Map();
      validItems.forEach(it => {
        ratesMap.set(it.itemName, it.defaultRate);
      });
      hostel.laundrySettings.defaultRates = ratesMap;
    }

    if (req.body.linenInventory && typeof req.body.linenInventory === 'object') {
      const currentInv = hostel.laundrySettings.linenInventory || new Map();
      Object.entries(req.body.linenInventory).forEach(([key, val]) => {
        const num = Math.max(0, Number(val) || 0);
        if (currentInv instanceof Map) {
          currentInv.set(key, num);
        } else {
          currentInv[key] = num;
        }
      });
      hostel.laundrySettings.linenInventory = currentInv;
    }

    await hostel.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Laundry settings, rates & linen inventory saved successfully',
      data: hostel.laundrySettings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record lump-sum payment to a vendor, settling unpaid batches in FIFO order
// @route   POST /api/laundry/vendor-payment
// @access  Private
exports.settleVendorLumpSum = async (req, res, next) => {
  try {
    const { hostel, vendorName, amount, paymentMethod = 'Cash', notes = '' } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid payment amount greater than 0' });
    }
    if (!vendorName || !vendorName.trim()) {
      return res.status(400).json({ success: false, message: 'Please specify the vendor name' });
    }

    const rawHostel = hostel || req.user.assignedHostel;
    const hostelId = (rawHostel && typeof rawHostel === 'object' && rawHostel._id) ? rawHostel._id : rawHostel;

    if (!hostelId || !mongoose.isValidObjectId(hostelId)) {
      return res.status(400).json({ success: false, message: 'Please specify a valid property' });
    }

    if (!(await userCanAccessHostel(req.user, hostelId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this property' });
    }

    const cleanVendor = vendorName.trim();
    // Find all unpaid or partially paid orders for this vendor in this hostel (FIFO: oldest sentDate first)
    const unpaidOrders = await LaundryOrder.find({
      hostel: hostelId,
      vendorName: { $regex: new RegExp(`^${cleanVendor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      paymentStatus: { $in: ['Pending', 'Partial', 'Unpaid'] }
    }).sort('sentDate');

    let remainingToAllocate = numAmount;
    let settledBatchesCount = 0;
    const settledDetails = [];

    for (const order of unpaidOrders) {
      if (remainingToAllocate <= 0) break;

      const orderBilled = Number(order.totalAmount) || 0;
      const orderPaid = Number(order.paidAmount) || 0;
      const orderDue = Math.max(0, orderBilled - orderPaid);

      if (orderDue <= 0) continue;

      const allocate = Math.min(remainingToAllocate, orderDue);
      order.paidAmount = orderPaid + allocate;
      remainingToAllocate -= allocate;

      if (order.paidAmount >= orderBilled) {
        order.paymentStatus = 'Paid';
      } else {
        order.paymentStatus = 'Partial';
      }

      order.paymentDate = new Date();
      order.paymentMethod = paymentMethod;
      if (notes) {
        order.notes = order.notes 
          ? `${order.notes} | Lump-sum ₹${allocate}: ${notes}` 
          : `Lump-sum ₹${allocate}: ${notes}`;
      }

      await order.save();
      settledBatchesCount += 1;
      settledDetails.push({
        orderNumber: order.orderNumber,
        allocatedAmount: allocate,
        newStatus: order.paymentStatus
      });
    }

    const totalAllocated = numAmount - remainingToAllocate;

    res.status(200).json({
      success: true,
      message: `Paid ₹${totalAllocated.toLocaleString('en-IN')} to ${cleanVendor} across ${settledBatchesCount} batch(es)!`,
      data: {
        vendorName: cleanVendor,
        totalPaid: totalAllocated,
        remainingUnallocatedAdvance: remainingToAllocate,
        settledBatchesCount,
        settledDetails,
        paymentMethod,
        paymentDate: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

