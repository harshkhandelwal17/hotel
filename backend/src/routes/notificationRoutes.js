const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getVapidKey,
  subscribePush,
  unsubscribePush,
  testPushNotification
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Public VAPID key
router.get('/vapid-key', getVapidKey);

// Protected routes
router.use(protect);

router.post('/subscribe', subscribePush);
router.post('/unsubscribe', unsubscribePush);
router.post('/test-push', testPushNotification);
router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
