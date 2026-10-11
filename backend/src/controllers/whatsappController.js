const Hostel = require('../models/Hostel');
const WhatsAppMedia = require('../models/WhatsAppMedia');
const {
  startHostelWhatsApp,
  getHostelWhatsAppStatus,
  disconnectHostelWhatsApp
} = require('../services/whatsappService');

// Helper to determine target hostel
const getTargetHostelId = async (req) => {
  let hostelId = req.query.hostelId || req.body.hostelId || req.user.assignedHostel;
  if (!hostelId && req.user.role === 'admin') {
    const myHostels = await Hostel.find({ owner: req.user.id });
    if (myHostels.length > 0) hostelId = myHostels[0]._id;
  }
  return hostelId;
};

/**
 * Get WhatsApp Connection Status & QR Code
 * @route GET /api/whatsapp/status
 * @access Private
 */
exports.getStatus = async (req, res, next) => {
  try {
    const hostelId = await getTargetHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context required' });
    }

    const statusInfo = await getHostelWhatsAppStatus(hostelId);
    res.status(200).json({ success: true, data: statusInfo });
  } catch (err) {
    next(err);
  }
};

/**
 * Initiate WhatsApp Connection (generate QR code)
 * @route POST /api/whatsapp/connect
 * @access Private
 */
exports.connect = async (req, res, next) => {
  try {
    const hostelId = await getTargetHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context required' });
    }

    const result = await startHostelWhatsApp(hostelId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Disconnect WhatsApp
 * @route POST /api/whatsapp/disconnect
 * @access Private
 */
exports.disconnect = async (req, res, next) => {
  try {
    const hostelId = await getTargetHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context required' });
    }

    const result = await disconnectHostelWhatsApp(hostelId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Recent WhatsApp Guest Media (last 24h)
 * @route GET /api/whatsapp/recent-media
 * @access Private
 */
exports.getRecentMedia = async (req, res, next) => {
  try {
    const hostelId = await getTargetHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context required' });
    }

    // Only get media from last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const media = await WhatsAppMedia.find({
      hostel: hostelId,
      createdAt: { $gte: since }
    })
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({ success: true, count: media.length, data: media });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark Media as Used
 * @route PUT /api/whatsapp/mark-used/:id
 * @access Private
 */
exports.markMediaUsed = async (req, res, next) => {
  try {
    const media = await WhatsAppMedia.findByIdAndUpdate(
      req.params.id,
      { status: 'used' },
      { new: true }
    );
    res.status(200).json({ success: true, data: media });
  } catch (err) {
    next(err);
  }
};
