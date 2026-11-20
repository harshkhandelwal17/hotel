const MenuItem = require('../models/MenuItem');
const RestaurantOrder = require('../models/RestaurantOrder');
const Stay = require('../models/Stay');
const Hostel = require('../models/Hostel');
const DailyRegister = require('../models/DailyRegister');
const { assertHostelAccess, userCanAccessHostel } = require('../utils/hostelAccess');
const mongoose = require('mongoose');

// Helper to get today's date string YYYY-MM-DD in IST
function getTodayIST() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5));
  return istDate.toISOString().split('T')[0];
}

// Initial standard menu items with numeric fast-search item codes
const DEFAULT_MENU_SEEDS = [
  { itemCode: '101', name: 'Special Masala Chai', category: 'Tea & Beverages', price: 20, isVeg: true },
  { itemCode: '102', name: 'Hot Filter Coffee', category: 'Tea & Beverages', price: 30, isVeg: true },
  { itemCode: '103', name: 'Cold Drink / Soft Drink (Can)', category: 'Tea & Beverages', price: 40, isVeg: true },
  { itemCode: '104', name: 'Mineral Water Bottle (1L)', category: 'Tea & Beverages', price: 20, isVeg: true },
  { itemCode: '201', name: 'Aloo Pyaz Paratha with Curd & Pickle', category: 'Breakfast', price: 70, isVeg: true },
  { itemCode: '202', name: 'Paneer Paratha with Butter', category: 'Breakfast', price: 90, isVeg: true },
  { itemCode: '203', name: 'Indori Poha with Sev', category: 'Breakfast', price: 40, isVeg: true },
  { itemCode: '204', name: 'Veg Grilled Cheese Sandwich', category: 'Breakfast', price: 80, isVeg: true },
  { itemCode: '301', name: 'Maggi Noodles (Double Masala)', category: 'Snacks & Starters', price: 50, isVeg: true },
  { itemCode: '302', name: 'Crispy Veg Pakoda Platter', category: 'Snacks & Starters', price: 80, isVeg: true },
  { itemCode: '303', name: 'French Fries (Salted)', category: 'Snacks & Starters', price: 70, isVeg: true },
  { itemCode: '401', name: 'Special Deluxe Veg Thali', category: 'Main Course', price: 160, isVeg: true },
  { itemCode: '402', name: 'Paneer Butter Masala', category: 'Main Course', price: 180, isVeg: true },
  { itemCode: '403', name: 'Dal Tadka / Dal Fry', category: 'Main Course', price: 120, isVeg: true },
  { itemCode: '501', name: 'Jeera Rice', category: 'Breads & Rice', price: 90, isVeg: true },
  { itemCode: '502', name: 'Butter Tawa Roti (2 Pcs)', category: 'Breads & Rice', price: 30, isVeg: true },
  { itemCode: '601', name: 'Veg Hakka Noodles', category: 'Chinese', price: 110, isVeg: true },
  { itemCode: '701', name: 'Gulab Jamun (2 Pcs)', category: 'Desserts', price: 40, isVeg: true }
];

// Helper to resolve clean hostel ID
async function resolveHostelId(inputHostel, reqUser) {
  if (inputHostel && mongoose.Types.ObjectId.isValid(inputHostel)) return inputHostel;
  if (typeof inputHostel === 'object' && inputHostel?._id) return inputHostel._id.toString();
  
  if (reqUser?.assignedHostel) {
    const h = reqUser.assignedHostel;
    return typeof h === 'object' ? h._id.toString() : h.toString();
  }
  if (reqUser?.role === 'admin') {
    const owned = await Hostel.findOne({ owner: reqUser.id }).select('_id');
    if (owned) return owned._id.toString();
  }
  const anyH = await Hostel.findOne().select('_id');
  return anyH ? anyH._id.toString() : null;
}

// @desc    Get all menu items (auto-seeds defaults if empty)
// @route   GET /api/restaurant/menu
// @access  Private
exports.getMenuItems = async (req, res, next) => {
  try {
    const hostelId = await resolveHostelId(req.query.hostel, req.user);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    let items = await MenuItem.find({ hostel: hostelId }).sort({ category: 1, sortOrder: 1, name: 1 });

    // Auto-seed initial popular menu items if hostel menu is completely empty
    if (items.length === 0) {
      const seeded = DEFAULT_MENU_SEEDS.map((item, idx) => ({
        ...item,
        hostel: hostelId,
        sortOrder: idx,
        createdBy: req.user.id
      }));
      items = await MenuItem.insertMany(seeded);
    }

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create menu item
// @route   POST /api/restaurant/menu
// @access  Private
exports.createMenuItem = async (req, res, next) => {
  try {
    const { hostel, name, category, price, isVeg, description, isAvailable } = req.body;
    const hostelId = await resolveHostelId(hostel, req.user);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    await assertHostelAccess(req.user, hostelId, true);

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Item name is required' });
    }

    let code = (req.body.itemCode || '').trim().toUpperCase();
    if (!code) {
      const count = await MenuItem.countDocuments({ hostel: hostelId });
      code = String(100 + count + 1);
    }

    const item = await MenuItem.create({
      hostel: hostelId,
      name: name.trim(),
      itemCode: code,
      category: (category || 'Main Course').trim(),
      price: Math.max(0, Number(price) || 0),
      isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      description: (description || '').trim(),
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// @desc    Update menu item
// @route   PUT /api/restaurant/menu/:id
// @access  Private
exports.updateMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    await assertHostelAccess(req.user, item.hostel, true);

    const { name, itemCode, category, price, isVeg, isAvailable, description, sortOrder } = req.body;
    if (name !== undefined) item.name = name.trim();
    if (itemCode !== undefined) item.itemCode = itemCode.trim().toUpperCase();
    if (category !== undefined) item.category = category.trim();
    if (price !== undefined) item.price = Math.max(0, Number(price) || 0);
    if (isVeg !== undefined) item.isVeg = Boolean(isVeg);
    if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);
    if (description !== undefined) item.description = description.trim();
    if (sortOrder !== undefined) item.sortOrder = Number(sortOrder) || 0;

    await item.save();
    if (description !== undefined) item.description = description.trim();
    if (sortOrder !== undefined) item.sortOrder = Number(sortOrder) || 0;

    await item.save();

    res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete menu item
// @route   DELETE /api/restaurant/menu/:id
// @access  Private
exports.deleteMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    await assertHostelAccess(req.user, item.hostel, true);
    await item.deleteOne();

    res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Restaurant Orders / History
// @route   GET /api/restaurant/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    const hostelId = await resolveHostelId(req.query.hostel, req.user);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    const filter = { hostel: hostelId };

    if (req.query.date) {
      const dayStart = new Date(`${req.query.date}T00:00:00.000+05:30`);
      const dayEnd = new Date(`${req.query.date}T23:59:59.999+05:30`);
      filter.createdAt = { $gte: dayStart, $lte: dayEnd };
    }

    if (req.query.paymentStatus && req.query.paymentStatus !== 'all') {
      filter.paymentStatus = req.query.paymentStatus;
    }

    const orders = await RestaurantOrder.find(filter)
      .populate('stay', 'room occupants guest checkInDate')
      .populate('billedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(300);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create Fast POS Order & Bill
// @route   POST /api/restaurant/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const {
      hostel,
      orderType,
      tableOrRoom,
      stayId,
      guestName,
      guestPhone,
      items,
      subtotal,
      discount,
      taxPercent,
      taxAmount,
      totalAmount,
      paymentStatus,
      paymentMethod,
      notes
    } = req.body;

    const hostelId = await resolveHostelId(hostel, req.user);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Property ID is required' });
    }

    await assertHostelAccess(req.user, hostelId, true);

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required in the order' });
    }

    const finalTotal = Math.max(0, Number(totalAmount) || 0);
    const pStatus = paymentStatus || (paymentMethod === 'Room Folio' ? 'Charged to Room' : 'Paid');
    const pMethod = paymentMethod || 'Cash';

    // Corporate B2B & Tax Calculations
    const isB2B = Boolean(req.body.isB2B);
    const companyName = (req.body.companyName || '').trim();
    const gstin = (req.body.gstin || '').trim().toUpperCase();
    const billingAddress = (req.body.billingAddress || '').trim();
    const hsnSacCode = (req.body.hsnSacCode || '996331').trim();

    const rawTax = Math.max(0, Number(taxAmount) || 0);
    let cgst = Math.max(0, Number(req.body.cgst) || 0);
    let sgst = Math.max(0, Number(req.body.sgst) || 0);
    let igst = Math.max(0, Number(req.body.igst) || 0);

    if (rawTax > 0 && cgst === 0 && sgst === 0 && igst === 0) {
      const hotelDoc = await Hostel.findById(hostelId).select('gstin');
      const hotelState = (hotelDoc?.gstin || '').trim().slice(0, 2);
      const guestState = gstin.slice(0, 2);
      if (hotelState && guestState && hotelState !== guestState) {
        igst = rawTax;
      } else {
        cgst = Math.round((rawTax / 2) * 100) / 100;
        sgst = Math.round((rawTax - cgst) * 100) / 100;
      }
    }

    // 1. Create the Restaurant Order
    const order = await RestaurantOrder.create({
      hostel: hostelId,
      orderType: orderType || 'Room Service',
      tableOrRoom: (tableOrRoom || '').trim(),
      stay: stayId && mongoose.Types.ObjectId.isValid(stayId) ? stayId : null,
      guestName: (guestName || (companyName ? companyName : 'Walk-in Guest')).trim(),
      guestPhone: (guestPhone || '').trim(),
      items: items.map(i => ({
        menuItem: i.menuItem || null,
        name: i.name,
        price: Number(i.price) || 0,
        quantity: Math.max(1, Number(i.quantity) || 1),
        total: Math.max(0, Number(i.total) || (Number(i.price) * Number(i.quantity)))
      })),
      subtotal: Number(subtotal) || finalTotal,
      discount: Math.max(0, Number(discount) || 0),
      taxPercent: Math.max(0, Number(taxPercent) || 0),
      taxAmount: rawTax,
      cgst,
      sgst,
      igst,
      isB2B,
      companyName,
      gstin,
      billingAddress,
      hsnSacCode,
      totalAmount: finalTotal,
      paymentStatus: pStatus,
      paymentMethod: pMethod,
      notes: (notes || '').trim(),
      billedBy: req.user.id
    });

    // 2. If charged to in-house room folio, link into stay.charges & increase totalAmount
    if ((pStatus === 'Charged to Room' || pMethod === 'Room Folio') && stayId) {
      const stayDoc = await Stay.findById(stayId);
      if (stayDoc) {
        const itemSummary = items.map(i => `${i.name} x${i.quantity}`).join(', ');
        stayDoc.charges.push({
          description: `Restaurant (${order.orderNumber}): ${itemSummary}`,
          category: 'Food',
          quantity: 1,
          amount: finalTotal,
          date: new Date(),
          addedBy: req.user.id
        });
        stayDoc.totalAmount = Math.round(((Number(stayDoc.totalAmount) || 0) + finalTotal) * 100) / 100;
        await stayDoc.save();
      }
    }

    // 3. If paid in Cash at restaurant counter, record directly into today's Daily Register under Food Cash
    if (pStatus === 'Paid' && pMethod === 'Cash' && finalTotal > 0) {
      try {
        const istToday = getTodayIST();
        let reg = await DailyRegister.findOne({ hostel: hostelId, date: istToday });
        if (reg) {
          const nextSrNo = reg.entries.length > 0
            ? Math.max(...reg.entries.map(e => e.srNo || 0)) + 1
            : 1;

          reg.entries.push({
            srNo: nextSrNo,
            roomNo: (tableOrRoom || 'CAFE').trim(),
            bid: order.orderNumber,
            guestName: `${(guestName || 'Walk-in Guest').trim()} (Food)`,
            cashAmount: 0,
            cardAmount: 0,
            onlineAmount: 0,
            foodCashAmount: finalTotal, // Exactly Food Cash column!
            expenseTitle: '',
            expenseAmount: 0,
            paymentMode: 'Cash',
            notes: `POS Bill: ${items.map(i => `${i.name} x${i.quantity}`).slice(0, 3).join(', ')}`,
            source: 'restaurant_pos'
          });
          reg.lastUpdatedBy = req.user.id;
          await reg.save();
        }
      } catch (regErr) {
        console.warn('[RestaurantOrder] DailyRegister Food Cash sync warning:', regErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: order
    });
  } catch (err) {
    next(err);
  }
};
