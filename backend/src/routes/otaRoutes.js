const express = require('express');
const {
  getOtaConfig,
  updateOtaConfig,
  exportIcalFeed,
  handleInboundEmailWebhook,
  testParseEmail,
  syncIncomingIcal
} = require('../controllers/otaController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// ─── PUBLIC ENDPOINTS (For OTAs & Inbound Email Webhooks) ───
// 1. RFC 5545 iCal Feed (Polled by MakeMyTrip, Booking.com, Airbnb)
router.get('/ical/:hostelId/:token', exportIcalFeed);

// 2. Inbound Webhook for Forwarded Confirmation Emails
router.post('/webhook/email', handleInboundEmailWebhook);

// ─── PROTECTED ENDPOINTS (For Hotel Admin & SuperAdmin) ───
router.use(protect);

router.get('/config', getOtaConfig);
router.put('/config', updateOtaConfig);
router.post('/test-parse', testParseEmail);
router.post('/sync-incoming', syncIncomingIcal);

module.exports = router;
