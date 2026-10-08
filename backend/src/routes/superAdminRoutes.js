const express = require('express');
const { getSystemStats, getAllUsers, impersonateUser, toggleUserStatus, resetUserPassword } = require('../controllers/superAdminController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin'));

router.get('/stats', getSystemStats);
router.get('/users', getAllUsers);
router.post('/impersonate', impersonateUser);
router.put('/users/:id/toggle-status', toggleUserStatus);
router.put('/users/:id/reset-password', resetUserPassword);

module.exports = router;

