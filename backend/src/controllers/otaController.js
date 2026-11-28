const mongoose = require('mongoose');
const OtaConfig = require('../models/OtaConfig');
const Hostel = require('../models/Hostel');
const Room = require('../models/Room');
const Stay = require('../models/Stay');
const Guest = require('../models/Guest');
const { getHostelFilter, assertHostelAccess, userCanAccessHostel } = require('../utils/hostelAccess');
const { generateIcalFeed, parseIcalFeed } = require('../services/otaIcalService');
const { parseBookingEmail } = require('../services/otaParserService');

// Helper to resolve target hostel
const resolveHostelId = async (req) => {
  let hostelId = req.query.hostel || req.query.hostelId || req.body.hostel || req.body.hostelId;
  if (typeof hostelId === 'object' && hostelId !== null) {
    hostelId = hostelId._id || hostelId.id;
  }
  if (!hostelId && req.user) {
    if (req.user.assignedHostel) {
      const a = req.user.assignedHostel;
      hostelId = typeof a === 'object' ? (a._id || a) : a;
    } else if (req.user.role === 'admin') {
      const first = await Hostel.findOne({ owner: req.user._id || req.user.id }).select('_id');
      if (first) hostelId = first._id;
    } else if (req.user.role === 'superadmin') {
      const first = await Hostel.findOne().select('_id');
      if (first) hostelId = first._id;
    }
  }
  if (hostelId) hostelId = hostelId.toString();
  return hostelId;
};

// @desc    Get OTA Configuration for a property
// @route   GET /api/ota/config
// @access  Private
exports.getOtaConfig = async (req, res, next) => {
  try {
    const hostelId = await resolveHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context is required' });
    }

    if (!(await userCanAccessHostel(req.user, hostelId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this hostel' });
    }

    const hostel = await Hostel.findById(hostelId).select('name otaSyncEnabled email contactNumber city');
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }

    let config = await OtaConfig.findOne({ hostel: hostelId }).populate('roomMappings.assignedRooms', 'roomNumber category price24h');
    if (!config) {
      config = await OtaConfig.create({
        hostel: hostelId,
        enabled: Boolean(hostel.otaSyncEnabled),
        channels: [
          { name: 'MakeMyTrip', enabled: true },
          { name: 'Goibibo', enabled: true },
          { name: 'Booking.com', enabled: true },
          { name: 'Agoda', enabled: true },
          { name: 'Airbnb', enabled: true }
        ],
        roomMappings: []
      });
    }

    // Get all distinct room categories in this hostel
    const rooms = await Room.find({ hostel: hostelId, status: { $ne: 'Inactive' } }).select('roomNumber category price24h');
    const categories = Array.from(new Set(rooms.map(r => r.category || 'Standard'))).filter(Boolean);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const publicIcalUrl = `${baseUrl}/api/ota/ical/${hostelId}/${config.secretToken}`;
    const inboundForwardingEmail = `ota-${config.inboundEmailKey}@inbound.hotelpms.com`;

    res.status(200).json({
      success: true,
      data: {
        config,
        hostel: {
          _id: hostel._id,
          name: hostel.name,
          otaSyncEnabled: hostel.otaSyncEnabled
        },
        availableRooms: rooms,
        availableCategories: categories,
        publicIcalUrl,
        inboundForwardingEmail
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update OTA Configuration
// @route   PUT /api/ota/config
// @access  Private
exports.updateOtaConfig = async (req, res, next) => {
  try {
    const hostelId = await resolveHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context is required' });
    }

    if (!(await userCanAccessHostel(req.user, hostelId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this hostel' });
    }

    let config = await OtaConfig.findOne({ hostel: hostelId });
    if (!config) {
      config = new OtaConfig({ hostel: hostelId });
    }

    const { enabled, channels, roomMappings, autoWhatsAppWelcome, autoAssignRooms, resetToken } = req.body;

    if (enabled !== undefined) {
      config.enabled = Boolean(enabled);
      // Sync flag to hostel document
      await Hostel.findByIdAndUpdate(hostelId, { otaSyncEnabled: Boolean(enabled) });
    }

    if (channels && Array.isArray(channels)) {
      config.channels = channels;
    }

    if (roomMappings && Array.isArray(roomMappings)) {
      config.roomMappings = roomMappings;
    }

    if (autoWhatsAppWelcome !== undefined) {
      config.autoWhatsAppWelcome = Boolean(autoWhatsAppWelcome);
    }

    if (autoAssignRooms !== undefined) {
      config.autoAssignRooms = Boolean(autoAssignRooms);
    }

    if (resetToken) {
      const crypto = require('crypto');
      config.secretToken = crypto.randomBytes(16).toString('hex');
    }

    await config.save();

    const populated = await OtaConfig.findById(config._id).populate('roomMappings.assignedRooms', 'roomNumber category price24h');

    res.status(200).json({
      success: true,
      message: 'OTA configuration updated successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public RFC 5545 iCalendar Feed Generator for OTAs (MakeMyTrip, Booking.com, Airbnb, etc.)
// @route   GET /api/ota/ical/:hostelId/:token
// @access  Public (Token protected)
exports.exportIcalFeed = async (req, res, next) => {
  try {
    const { hostelId, token } = req.params;
    const { category } = req.query;

    if (!mongoose.Types.ObjectId.isValid(hostelId)) {
      return res.status(400).send('Invalid property ID');
    }

    const config = await OtaConfig.findOne({ hostel: hostelId });
    if (!config || config.secretToken !== token) {
      return res.status(403).send('Unauthorized iCal token');
    }

    if (!config.enabled) {
      return res.status(403).send('OTA sync is not active for this property');
    }

    const hostel = await Hostel.findById(hostelId).select('name');
    if (!hostel) {
      return res.status(404).send('Property not found');
    }

    // Find all active/upcoming stays for this property
    const stays = await Stay.find({
      hostel: hostelId,
      status: { $in: ['Upcoming', 'Active', 'Checkout Due', 'Overdue'] }
    })
      .populate('room', 'roomNumber category')
      .populate('guest', 'fullName');

    const icsContent = generateIcalFeed(hostel, stays, category);

    // Track poll in logs (limit to 1 per hour per channel to avoid bloating)
    const channelName = req.query.channel || 'OTA Poller';
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentPoll = (config.logs || []).find(l => l.action === 'ical_polled' && l.timestamp > oneHourAgo);
    if (!recentPoll) {
      config.logs.unshift({
        source: channelName,
        action: 'ical_polled',
        message: `iCal calendar exported (${stays.length} active reservations)`,
        status: 'success'
      });
      if (config.logs.length > 50) config.logs = config.logs.slice(0, 50);
      await config.save().catch(() => {});
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="hotel-${hostelId}.ics"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).send(icsContent);
  } catch (error) {
    res.status(500).send('Error generating calendar feed');
  }
};

// @desc    Inbound Email Webhook to auto-create reservations from MakeMyTrip / Booking.com
// @route   POST /api/ota/webhook/email
// @access  Public (Webhook / Secret key check)
exports.handleInboundEmailWebhook = async (req, res, next) => {
  try {
    // Webhook payload from SendGrid / Mailgun / direct JSON:
    const rawBody = req.body.text || req.body.html || req.body.body || req.body.email || '';
    const subject = req.body.subject || '';
    const sender = req.body.from || req.body.sender || '';
    const recipient = req.body.to || req.body.recipient || '';

    let hostelId = req.query.hostelId || req.body.hostelId;

    // Find matching OtaConfig
    let config = null;
    if (hostelId && mongoose.Types.ObjectId.isValid(hostelId)) {
      config = await OtaConfig.findOne({ hostel: hostelId });
    } else {
      // Try to find by inboundEmailKey in recipient (e.g. ota_abc123@...)
      const keyMatch = recipient.match(/ota_([a-zA-Z0-9]+)/i);
      if (keyMatch) {
        config = await OtaConfig.findOne({ inboundEmailKey: keyMatch[0].toLowerCase() });
      }
      if (!config) {
        // Try matching by hotel email
        const h = await Hostel.findOne({ email: sender.toLowerCase() });
        if (h) config = await OtaConfig.findOne({ hostel: h._id });
      }
    }

    if (!config) {
      return res.status(200).json({
        success: false,
        message: 'No matching OTA configuration found for this inbound email.'
      });
    }

    const parsed = parseBookingEmail(rawBody, subject, sender);

    // 1. Check for Duplicate Reservation
    const existingStay = await Stay.findOne({
      hostel: config.hostel,
      bookingNumber: parsed.bookingNumber
    });

    if (existingStay) {
      config.logs.unshift({
        source: parsed.channel,
        action: 'duplicate_booking',
        bookingNumber: parsed.bookingNumber,
        guestName: parsed.guestName,
        message: `Duplicate booking ${parsed.bookingNumber} received - ignored.`,
        status: 'warning'
      });
      if (config.logs.length > 50) config.logs = config.logs.slice(0, 50);
      await config.save();

      return res.status(200).json({
        success: true,
        message: 'Duplicate booking ignored',
        bookingNumber: parsed.bookingNumber
      });
    }

    // 2. Find or Create Guest
    let guest = null;
    if (parsed.guestPhone) {
      guest = await Guest.findOne({
        hostel: config.hostel,
        mobileNumber: parsed.guestPhone
      });
    }
    if (!guest) {
      guest = await Guest.create({
        hostel: config.hostel,
        fullName: parsed.guestName || 'OTA Guest',
        mobileNumber: parsed.guestPhone || '9999999999'
      });
    }

    // 3. Find Matching Room
    // Check if category has roomMappings
    let targetRoom = null;
    const mapping = (config.roomMappings || []).find(m =>
      m.otaCategoryName.toLowerCase() === parsed.roomCategory.toLowerCase() ||
      m.category.toLowerCase() === parsed.roomCategory.toLowerCase()
    );

    if (mapping && mapping.assignedRooms && mapping.assignedRooms.length > 0) {
      // Find one of the assigned rooms that is not occupied during these dates
      const roomIds = mapping.assignedRooms;
      for (const rId of roomIds) {
        const conflict = await Stay.findOne({
          room: rId,
          status: { $in: ['Upcoming', 'Active', 'Checkout Due', 'Overdue'] },
          checkInDate: { $lt: parsed.checkOutDate },
          expectedCheckOutDate: { $gt: parsed.checkInDate }
        });
        if (!conflict) {
          targetRoom = await Room.findById(rId);
          if (targetRoom) break;
        }
      }
    }

    // Fallback: Find any available room in this category or any room in hostel
    if (!targetRoom) {
      const allHostelRooms = await Room.find({ hostel: config.hostel, status: 'Available' });
      for (const rm of allHostelRooms) {
        const conflict = await Stay.findOne({
          room: rm._id,
          status: { $in: ['Upcoming', 'Active', 'Checkout Due', 'Overdue'] },
          checkInDate: { $lt: parsed.checkOutDate },
          expectedCheckOutDate: { $gt: parsed.checkInDate }
        });
        if (!conflict) {
          targetRoom = rm;
          break;
        }
      }
    }

    // If still no available room, pick first active room to avoid failing
    if (!targetRoom) {
      targetRoom = await Room.findOne({ hostel: config.hostel, status: { $ne: 'Inactive' } });
    }

    if (!targetRoom) {
      throw new Error('No rooms exist in this hostel to assign reservation');
    }

    // Determine initial status: If checkIn is today, Active; otherwise Upcoming
    const now = new Date();
    const isTodayCheckin = parsed.checkInDate.toDateString() === now.toDateString();
    const initialStatus = isTodayCheckin ? 'Active' : 'Upcoming';

    const stay = await Stay.create({
      guest: guest._id,
      hostel: config.hostel,
      room: targetRoom._id,
      occupants: 1,
      checkInDate: parsed.checkInDate,
      expectedCheckOutDate: parsed.checkOutDate,
      status: initialStatus,
      durationOption: '24h',
      totalAmount: parsed.totalAmount || targetRoom.price24h || 1000,
      paidAmount: parsed.paidAmount || 0,
      bookingSource: parsed.channel,
      bookingNumber: parsed.bookingNumber,
      otaMetadata: {
        paymentStatus: parsed.paymentStatus,
        bookedCategory: parsed.roomCategory,
        parsedAt: new Date(),
        rawSnippet: parsed.rawSnippet
      }
    });

    // Mark room occupied if check-in is today
    if (isTodayCheckin) {
      targetRoom.status = 'Occupied';
      await targetRoom.save();
    }

    // Add success log
    config.logs.unshift({
      source: parsed.channel,
      action: 'new_booking',
      bookingNumber: parsed.bookingNumber,
      guestName: parsed.guestName,
      message: `New booking imported: Room ${targetRoom.roomNumber} for ₹${parsed.totalAmount} (${parsed.paymentStatus})`,
      status: 'success',
      stay: stay._id
    });
    if (config.logs.length > 50) config.logs = config.logs.slice(0, 50);
    await config.save();

    res.status(200).json({
      success: true,
      message: `Reservation ${parsed.bookingNumber} created successfully`,
      data: {
        stayId: stay._id,
        roomNumber: targetRoom.roomNumber,
        guestName: guest.fullName,
        channel: parsed.channel,
        amount: parsed.totalAmount
      }
    });
  } catch (error) {
    console.error('OTA Webhook error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal error processing OTA email'
    });
  }
};

// @desc    Test Email Parser Live (Interactive Simulator)
// @route   POST /api/ota/test-parse
// @access  Private
exports.testParseEmail = async (req, res, next) => {
  try {
    const { emailText, subject, sender } = req.body;
    if (!emailText) {
      return res.status(400).json({ success: false, message: 'emailText is required for testing' });
    }

    const parsed = parseBookingEmail(emailText, subject || '', sender || '');

    res.status(200).json({
      success: true,
      message: 'Email parsed successfully',
      data: parsed
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Poll external OTA iCal feeds to detect bookings placed on OTA
// @route   POST /api/ota/sync-incoming
// @access  Private
exports.syncIncomingIcal = async (req, res, next) => {
  try {
    const hostelId = await resolveHostelId(req);
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'Hostel context required' });
    }

    const config = await OtaConfig.findOne({ hostel: hostelId });
    if (!config) {
      return res.status(404).json({ success: false, message: 'OTA config not found' });
    }

    const channelsToSync = (config.channels || []).filter(c => c.enabled && c.externalIcalUrl && c.externalIcalUrl.startsWith('http'));

    if (channelsToSync.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No external iCal URLs configured to sync yet.'
      });
    }

    let syncedCount = 0;
    const syncErrors = [];

    for (const ch of channelsToSync) {
      try {
        const response = await fetch(ch.externalIcalUrl, {
          headers: { 'User-Agent': 'HotelPMS-OTA-Sync/1.0' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} from ${ch.name}`);
        const icsText = await response.text();
        const events = parseIcalFeed(icsText);

        ch.lastSyncAt = new Date();
        ch.syncStatus = 'active';
        ch.lastError = '';
        syncedCount += events.length;

        config.logs.unshift({
          source: ch.name,
          action: 'ical_polled',
          message: `Synced ${events.length} calendar events from ${ch.name}`,
          status: 'success'
        });
      } catch (syncErr) {
        ch.syncStatus = 'error';
        ch.lastError = syncErr.message;
        syncErrors.push(`${ch.name}: ${syncErr.message}`);

        config.logs.unshift({
          source: ch.name,
          action: 'ical_error',
          message: `Failed to poll ${ch.name}: ${syncErr.message}`,
          status: 'error'
        });
      }
    }

    if (config.logs.length > 50) config.logs = config.logs.slice(0, 50);
    await config.save();

    res.status(200).json({
      success: true,
      message: `Synced ${syncedCount} external calendar reservations.`,
      errors: syncErrors
    });
  } catch (error) {
    next(error);
  }
};
