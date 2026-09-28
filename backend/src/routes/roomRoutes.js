const express = require('express');
const { getRooms, getRoom, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getRooms)
  .post(authorize('admin'), createRoom);

router.route('/:id')
  .get(getRoom)
  .put(authorize('admin'), updateRoom)
  .delete(authorize('admin'), deleteRoom);

module.exports = router;
