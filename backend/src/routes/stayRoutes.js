const express = require('express');
const {
  getStays, getStay, createStay, checkout, extendStay, shiftRoom,
  addCharge, removeCharge, addPayment
} = require('../controllers/stayController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getStays)
  .post(createStay);

router.get('/:id', getStay);
router.post('/:id/checkout', checkout);
router.post('/:id/extend', extendStay);
router.post('/:id/shift', shiftRoom);
router.post('/:id/charges', addCharge);
router.delete('/:id/charges/:chargeId', removeCharge);
router.post('/:id/payments', addPayment);

module.exports = router;
