const express = require('express');
const {
  getLaundryOrders,
  getLaundryOrder,
  createLaundryOrder,
  receiveLaundryOrder,
  recordLaundryPayment,
  updateLaundryOrder,
  deleteLaundryOrder
} = require('../controllers/laundryController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getLaundryOrders)
  .post(createLaundryOrder);

router.route('/:id')
  .get(getLaundryOrder)
  .put(updateLaundryOrder)
  .delete(deleteLaundryOrder);

router.put('/:id/receive', receiveLaundryOrder);
router.post('/:id/pay', recordLaundryPayment);

module.exports = router;

