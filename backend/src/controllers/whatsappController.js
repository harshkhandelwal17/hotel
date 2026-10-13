const mongoose = require('mongoose');
const Hostel = require('../models/Hostel');
const WhatsAppMedia = require('../models/WhatsAppMedia');
const {
  startHostelWhatsApp,
  getHostelWhatsAppStatus,
  disconnectHostelWhatsApp,
  requestHostelPairingCode
} = require('../services/whatsappService');
const { assertHostelAccess, userCanAccessHostel, userId } = require('../utils/hostelAccess');

// Helper to determine target hostel (always ownership-checked)
const getTargetHostelId = async (req) => {
  let hostelId = req.query.hostelId || req.body.hostelId;

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

  if (!hostelId && req.user && req.user.assignedHostel) {
    const assigned = req.user.assignedHostel;
    hostelId = typeof assigned === 'object' ? (assigned._id || assigned) : assigned;
  }

  if (!hostelId && req.user && req.user.role === 'admin') {
    const myHostels = await Hostel.find({ owner: userId(req.user) }).select('_id');
    if (myHostels.length > 0) hostelId = myHostels[0]._id;
  }

  if (hostelId) {
    hostelId = hostelId.toString();
    if (!mongoose.Types.ObjectId.isValid(hostelId)) {
      hostelId = null;
    }
  }

  if (!hostelId) return null;

  await assertHostelAccess(req.user, hostelId);
  return hostelId;
};

exports.getStatus = async (req, res, next) => {
  try {
    const hostelId = await getTargetHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context required' });
    }

    const statusInfo = await getHostelWhatsAppStatus(hostelId);
    res.status(200).json({ success: true, data: statusInfo });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

exports.connect = async (req, res, next) => {
  try {
    const hostelId = await getTargetHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context required' });
    }

    const result = await startHostelWhatsApp(hostelId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

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
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.disconnect = async (req, res, next) => {
  try {
    const hostelId = await getTargetHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context required' });
    }

    const result = await disconnectHostelWhatsApp(hostelId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

exports.getRecentMedia = async (req, res, next) => {
  try {
    const hostelId = await getTargetHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context required' });
    }

    const since = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const media = await WhatsAppMedia.find({
      hostel: hostelId,
      createdAt: { $gte: since }
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, count: media.length, data: media });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};

exports.markMediaUsed = async (req, res, next) => {
  try {
    const media = await WhatsAppMedia.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }

    if (!(await userCanAccessHostel(req.user, media.hostel))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this media' });
    }

    media.status = 'used';
    await media.save();
    res.status(200).json({ success: true, data: media });
  } catch (err) {
    next(err);
  }
};

exports.cleanupUnused = async (req, res, next) => {
  try {
    // Only admin / superadmin may trigger cleanup
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Not authorized to run media cleanup' });
    }

    const { cleanupUnusedMedia } = require('../services/mediaCleanupService');
    const forceAll = req.body?.forceAll !== false && req.query?.forceAll !== 'false';

    let hostelId = null;
    if (req.user.role === 'superadmin') {
      // Superadmin may optionally scope; default is global
      hostelId = req.body?.hostelId || req.query?.hostelId || null;
      if (hostelId === 'all') hostelId = null;
    } else {
      hostelId = await getTargetHostelId(req);
      if (!hostelId) {
        return res.status(400).json({ success: false, message: 'Hostel context required' });
      }
    }

    const result = await cleanupUnusedMedia({
      olderThanHours: 0,
      forceAllUnused: forceAll,
      hostelId
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    next(err);
  }
};
