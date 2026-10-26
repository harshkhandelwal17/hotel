const LaundryOrder = require('../models/LaundryOrder');
const Hostel = require('../models/Hostel');
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

    // Compute live summary stats for the active filter
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let clothesAtLaundry = 0;
    let monthlyExpense = 0;
    let totalPendingBills = 0;
    let totalPaidOverall = 0;

    orders.forEach(o => {
      if (o.status === 'Sent') {
        clothesAtLaundry += (o.totalPiecesSent || 0) - (o.totalPiecesReceived || 0);
      }
      const paid = Number(o.paidAmount) || 0;
      totalPaidOverall += paid;

      const dateToCheck = o.paymentDate || o.sentDate;
      if (dateToCheck && new Date(dateToCheck) >= startOfMonth) {
        monthlyExpense += paid;
      }

      const due = Math.max(0, (o.totalAmount || 0) - paid);
      totalPendingBills += due;
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
    let hostelId = req.body.hostel || req.user.assignedHostel;

    if (!hostelId && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
      return res.status(400).json({ success: false, message: 'Please select a hotel / property for this laundry dispatch' });
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

    const order = await LaundryOrder.create({
      hostel: hostelId,
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
