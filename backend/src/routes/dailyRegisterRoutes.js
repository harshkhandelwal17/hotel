const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getRegister,
  updateOpeningBalance,
  updateHeaderMantras,
  addEntry,
  updateEntry,
  deleteEntry,
  syncFromSystem,
  getMonthlySummary
} = require('../controllers/dailyRegisterController');

router.use(protect);

router.get('/', getRegister);
router.put('/opening-balance', updateOpeningBalance);
router.put('/mantras', updateHeaderMantras);
router.post('/entry', addEntry);
router.put('/entry/:entryId', updateEntry);
router.delete('/entry/:entryId', deleteEntry);
router.post('/sync', syncFromSystem);
router.get('/monthly-summary', getMonthlySummary);

module.exports = router;
