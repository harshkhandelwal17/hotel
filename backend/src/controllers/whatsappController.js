const mongoose = require('mongoose');
const Hostel = require('../models/Hostel');
const WhatsAppMedia = require('../models/WhatsAppMedia');
const {
  startHostelWhatsApp,
  getHostelWhatsAppStatus,
  disconnectHostelWhatsApp,
  requestHostelPairingCode
} = require('../services/whatsappService');

// Helper to determine target hostel
const getTargetHostelId = async (req) => {
  let hostelId = req.query.hostelId || req.body.hostelId;

  // Handle object or serialized string representations
  if (typeof hostelId === 'object' && hostelId !== null) {
    hostelId = hostelId._id || hostelId.id;
  }
  if (
    !hostelId ||
    hostelId === '[object Object]' ||
    hostelId === 'undefined' ||
    hostelId === 'null' ||
    hostelId === 'all'
  ) {
    hostelId = null;
  }

  // Fallback to user assignedHostel
  if (!hostelId && req.user && req.user.assignedHostel) {
    const assigned = req.user.assignedHostel;
    hostelId = typeof assigned === 'object' ? (assigned._id || assigned) : assigned;
  }

  // Fallback for admin to their first property
  if (!hostelId && req.user && req.user.role === 'admin') {
    const myHostels = await Hostel.find({ owner: req.user.id }).select('_id');
    if (myHostels.length > 0) hostelId = myHostels[0]._id;
  }

  if (hostelId) {
    hostelId = hostelId.toString();
    if (!mongoose.Types.ObjectId.isValid(hostelId)) {
      hostelId = null;
    }
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
 * Request 8-digit Pairing Code for WhatsApp Phone Link
 * @route POST /api/whatsapp/pairing-code
 * @access Private
 */
exports.requestPairingCode = async (req, res, next) => {
  try {
    const hostelId = await getTargetHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context required' });
    }

    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const result = await requestHostelPairingCode(hostelId, phoneNumber);
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

/**
 * Cleanup Unused WhatsApp Media (Delete from Cloudflare R2 and MongoDB)
 * @route POST /api/whatsapp/cleanup-unused
 * @access Private
 */
exports.cleanupUnused = async (req, res, next) => {
  try {
    const { cleanupUnusedMedia } = require('../services/mediaCleanupService');
    const forceAll = req.body?.forceAll !== false && req.query?.forceAll !== 'false';
    const result = await cleanupUnusedMedia({ olderThanHours: 0, forceAllUnused: forceAll });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};


