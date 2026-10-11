const express = require('express');
const { scanIdCard } = require('../controllers/ocrController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.post('/scan-id', scanIdCard);

module.exports = router;
