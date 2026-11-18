const express = require('express');
const {
  getStays, getStay, createStay, checkout, extendStay, shiftRoom,
  addCharge, removeCharge, addPayment, deleteStay, updateStay, getBrokersSummary,
  createGroupStay, getGroupStays, groupCheckout
} = require('../controllers/stayController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getStays)
  .post(createStay);

router.get('/brokers/summary', getBrokersSummary);

// Group Booking routes (Must be defined before /:id)
router.post('/group-checkin', createGroupStay);
router.get('/group/:groupId', getGroupStays);
router.post('/group/:groupId/checkout', groupCheckout);
router.get('/:id', getStay);
router.put('/:id', updateStay);
router.post('/:id/checkout', checkout);
router.post('/:id/extend', extendStay);
router.post('/:id/shift', shiftRoom);
router.post('/:id/charges', addCharge);
router.delete('/:id/charges/:chargeId', removeCharge);
router.post('/:id/payments', addPayment);

router.delete('/:id', authorize('admin', 'superadmin', 'receptionist'), deleteStay);

module.exports = router;
