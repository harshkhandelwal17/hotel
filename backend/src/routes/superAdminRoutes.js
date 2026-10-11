const express = require('express');
const { getSystemStats, getAllUsers, impersonateUser, toggleUserStatus, resetUserPassword, getAllHostels, toggleHostelAiOcr, toggleHostelWhatsAppSync } = require('../controllers/superAdminController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin'));

router.get('/stats', getSystemStats);
router.get('/users', getAllUsers);
router.get('/hostels', getAllHostels);
router.post('/impersonate', impersonateUser);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.put('/users/:id/reset-password', resetUserPassword);
router.put('/hostels/:id/toggle-ai-ocr', toggleHostelAiOcr);
router.put('/hostels/:id/toggle-whatsapp-sync', toggleHostelWhatsAppSync);

module.exports = router;

