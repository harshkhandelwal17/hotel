const express = require('express');
const { getPayments, createPayment } = require('../controllers/paymentController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPayments)
  .post(createPayment);

module.exports = router;
