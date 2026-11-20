const express = require('express');
const { 
  getSystemStats, 
  getAllUsers, 
  createUser, 
  updateUser,
  deleteUser, 
  impersonateUser, 
  toggleUserStatus, 
  resetUserPassword, 
  getAllHostels, 
  toggleHostelAiOcr, 
  toggleHostelWhatsAppSync, 
  toggleHostelLaundry,
  toggleHostelDailyRegister,
  toggleHostelDigitalAadhaar,
  toggleHostelStatus, 
  updateHostelPlan,
  deleteHostelSubscriptionHistory,
  getSubscriptionTransactions,
  getSalesTeamPerformance,
  updateSalesAgentSettings,
  assignHostelSalesAgent
} = require('../controllers/superAdminController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin'));

router.get('/stats', getSystemStats);
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/hostels', getAllHostels);
router.post('/impersonate', impersonateUser);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.put('/users/:id/reset-password', resetUserPassword);
router.put('/hostels/:id/toggle-status', toggleHostelStatus);
router.put('/hostels/:id/toggle-ai-ocr', toggleHostelAiOcr);
router.put('/hostels/:id/toggle-whatsapp-sync', toggleHostelWhatsAppSync);
router.put('/hostels/:id/toggle-laundry', toggleHostelLaundry);
router.put('/hostels/:id/toggle-daily-register', toggleHostelDailyRegister);
router.put('/hostels/:id/toggle-digital-aadhaar', toggleHostelDigitalAadhaar);
router.put('/hostels/:id/plan', updateHostelPlan);
router.delete('/hostels/:id/subscription-history/:historyId', deleteHostelSubscriptionHistory);
router.get('/subscription-transactions', getSubscriptionTransactions);
router.put('/hostels/:id/assign-sales', assignHostelSalesAgent);
router.get('/sales-team', getSalesTeamPerformance);
router.put('/sales-team/:id/settings', updateSalesAgentSettings);

module.exports = router;

