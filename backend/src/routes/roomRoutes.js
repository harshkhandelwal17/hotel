const express = require('express');
const {
  getRooms, getRoom, createRoom, updateRoom, deleteRoom,
  startMaintenance, endMaintenance
} = require('../controllers/roomController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getRooms)
  .post(authorize('admin'), createRoom);

// Staff and admin can both block a broken room / mark it repaired
router.post('/:id/maintenance', startMaintenance);
router.post('/:id/maintenance/resolve', endMaintenance);

router.route('/:id')
  .get(getRoom)
  .put(authorize('admin'), updateRoom)
  .delete(authorize('admin'), deleteRoom);

module.exports = router;
