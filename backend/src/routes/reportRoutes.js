const express = require('express');
const { getDashboardStats } = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);

module.exports = router;
