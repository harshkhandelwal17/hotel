const express = require('express');
const { getDashboardStats, getGstReport } = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/gst', getGstReport);

module.exports = router;
