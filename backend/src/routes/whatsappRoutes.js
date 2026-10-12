const express = require('express');
const {
  getStatus,
  connect,
  disconnect,
  getRecentMedia,
  markMediaUsed,
  requestPairingCode,
  cleanupUnused
} = require('../controllers/whatsappController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/status', getStatus);
router.post('/connect', connect);
router.post('/pairing-code', requestPairingCode);
router.post('/disconnect', disconnect);
router.get('/recent-media', getRecentMedia);
router.put('/mark-used/:id', markMediaUsed);
router.post('/cleanup-unused', cleanupUnused);

module.exports = router;

