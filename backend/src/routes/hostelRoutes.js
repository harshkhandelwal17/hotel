const express = require('express');
const { getHostels, getHostel, createHostel, updateHostel, deleteHostel } = require('../controllers/hostelController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getHostels)
  .post(authorize('admin'), createHostel);

router.route('/:id')
  .get(getHostel)
  .put(authorize('admin'), updateHostel)
  .delete(authorize('admin'), deleteHostel);

module.exports = router;
