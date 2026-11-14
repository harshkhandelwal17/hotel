const mongoose = require('mongoose');
const Hostel = require('../models/Hostel');
const WhatsAppMedia = require('../models/WhatsAppMedia');
const { maintainHostelMediaBuffer } = require('../services/mediaCleanupService');
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

  if (!hostelId && req.user) {
    if (req.user.assignedHostel) {
      const assigned = req.user.assignedHostel;
      hostelId = typeof assigned === 'object' ? (assigned._id || assigned) : assigned;
    } else if (req.user.role === 'admin') {
      const myHostels = await Hostel.find({ owner: userId(req.user) }).select('_id');
      if (myHostels.length > 0) hostelId = myHostels[0]._id;
    } else if (req.user.role === 'superadmin') {
      const firstHostel = await Hostel.findOne().select('_id');
      if (firstHostel) hostelId = firstHostel._id;
    }
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

    // If WhatsApp is disconnected for this property and not explicitly requested to show archives,
    // return an empty list so logged-out WhatsApp never leaks old media into active intake
    const hostel = await Hostel.findById(hostelId).select('whatsappStatus whatsappSyncEnabled');
    if (!hostel || hostel.whatsappStatus !== 'connected' || !hostel.whatsappSyncEnabled) {
      if (req.query.includeDisconnected !== 'true') {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
    }

    // Proactively maintain rolling FIFO buffer (keeps top 50 newest, auto-purges oldest bottom unused)
    maintainHostelMediaBuffer(hostelId, 50).catch(() => {});

    // Return the newest media up to requested limit (default 60, allows full buffer visibility)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 60, 10), 100);
    const media = await WhatsAppMedia.find({
      hostel: hostelId
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({ 
      success: true, 
      count: media.length, 
      maxBuffer: 50,
      data: media 
    });
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
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { cleanupUnusedMedia } = require('../services/mediaCleanupService');
    const forceAll = req.body?.forceAll !== false && req.query?.forceAll !== 'false';

    let hostelId = null;
    if (req.user.role === 'superadmin') {
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
