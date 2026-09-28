const express = require('express');
const { getRooms, getRoom, createRoom, updateRoom } = require('../controllers/roomController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getRooms)
  .post(authorize('admin'), createRoom);

router.route('/:id')
  .get(getRoom)
  .put(authorize('admin'), updateRoom);

module.exports = router;
