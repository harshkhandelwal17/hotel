const express = require('express');
const {
  getSalesStats,
  getSalesEcosystem,
  createSalesOwner,
  createSalesProperty,
  createSalesStaff,
  updateSalesProperty,
  updateSalesPropertyPlan,
  toggleSalesPropertyStatus,
  toggleSalesUserStatus,
  updateSalesUser,
  toggleSalesPropertyFeature,
  salesImpersonate,
  resetClientPassword,
  getSalesLeads,
  createSalesLead,
  updateSalesLead,
  deleteSalesLead,
  addLeadFollowUp,
  getSalesSubscriptionTransactions
} = require('../controllers/salesController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All sales routes require login and role 'sales' or 'superadmin'
router.use(protect);
router.use(authorize('sales', 'superadmin'));

router.get('/stats', getSalesStats);
router.get('/ecosystem', getSalesEcosystem);
router.get('/subscription-transactions', getSalesSubscriptionTransactions);

// Ecosystem Management: Owner, Property, Staff creation & edit
router.post('/owners', createSalesOwner);
router.post('/properties', createSalesProperty);
router.post('/staff', createSalesStaff);
router.put('/properties/:id', updateSalesProperty);
router.put('/properties/:id/plan', updateSalesPropertyPlan);
router.put('/properties/:id/toggle-status', toggleSalesPropertyStatus);
router.put('/properties/:id/toggle-feature', toggleSalesPropertyFeature);
router.put('/users/:id', updateSalesUser);
router.put('/users/:id/toggle-status', toggleSalesUserStatus);

// 1-Click Launch Demo & Password Reset
router.post('/impersonate', salesImpersonate);
router.put('/reset-password', resetClientPassword);

// CRM Leads & Follow-ups Pipeline
router.get('/leads', getSalesLeads);
router.post('/leads', createSalesLead);
router.put('/leads/:id', updateSalesLead);
router.delete('/leads/:id', deleteSalesLead);
router.post('/leads/:id/follow-up', addLeadFollowUp);

module.exports = router;
