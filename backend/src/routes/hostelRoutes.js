const express = require('express');
const { getHostels, getHostel, createHostel, updateHostel } = require('../controllers/hostelController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getHostels)
  .post(authorize('admin'), createHostel);

router.route('/:id')
  .get(getHostel)
  .put(authorize('admin'), updateHostel);

module.exports = router;
