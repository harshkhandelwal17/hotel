const express = require('express');
const { getGuests, getGuest, createGuest, updateGuest } = require('../controllers/guestController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getGuests)
  .post(createGuest);

router.route('/:id')
  .get(getGuest)
  .put(updateGuest);

module.exports = router;
