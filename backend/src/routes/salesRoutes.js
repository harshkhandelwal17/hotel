const express = require('express');
const {
  getSalesStats,
  getSalesHotels,
  onboardHotelClient,
  salesImpersonate,
  resetClientPassword
} = require('../controllers/salesController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All sales routes require login and role 'sales' or 'superadmin'
router.use(protect);
router.use(authorize('sales', 'superadmin'));

router.get('/stats', getSalesStats);
router.get('/hostels', getSalesHotels);
router.post('/onboard', onboardHotelClient);
router.post('/impersonate', salesImpersonate);
router.put('/reset-password', resetClientPassword);

module.exports = router;
