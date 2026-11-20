const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getOrders,
  createOrder
} = require('../controllers/restaurantController');

router.use(protect);

// Menu Routes
router.get('/menu', getMenuItems);
router.post('/menu', createMenuItem);
router.put('/menu/:id', updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);

// Order / Billing Routes
router.get('/orders', getOrders);
router.post('/orders', createOrder);

module.exports = router;
