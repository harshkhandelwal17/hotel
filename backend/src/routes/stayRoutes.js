const express = require('express');
const { getStays, createStay, checkout, extendStay, shiftRoom } = require('../controllers/stayController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getStays)
  .post(createStay);

router.post('/:id/checkout', checkout);
router.post('/:id/extend', extendStay);
router.post('/:id/shift', shiftRoom);

module.exports = router;
