const express = require('express');
const { getHostels, getHostel, createHostel, updateHostel, deleteHostel } = require('../controllers/hostelController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getHostels)
  .post(authorize('superadmin'), createHostel);

router.route('/:id')
  .get(getHostel)
  .put(authorize('admin', 'superadmin'), updateHostel)
  .delete(authorize('superadmin'), deleteHostel);

module.exports = router;
