const express = require('express');
const { getGuests, getGuest, createGuest, updateGuest } = require('../controllers/guestController');
const {
  addDeposit,
  recordPayment,
  getGuestLedger,
  getKhataSummary
} = require('../controllers/guestLedgerController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

// Summary endpoint MUST come before /:id parameter route
router.get('/khata/summary', getKhataSummary);

router.route('/')
  .get(getGuests)
  .post(createGuest);

// Guest ledger / passbook & payment endpoints
router.post('/:id/ledger/deposit', addDeposit);
router.post('/:id/ledger/payment', recordPayment);
router.get('/:id/ledger', getGuestLedger);

router.route('/:id')
  .get(getGuest)
  .put(updateGuest);

module.exports = router;
