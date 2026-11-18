const Notification = require('../models/Notification');

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res, next) => {
  try {
    const filter = req.user.role === 'superadmin' 
      ? {} 
      : { recipient: req.user._id };

    if (req.query.unreadOnly === 'true') {
      filter.isRead = false;
    }

    if (req.query.hostel && req.query.hostel !== 'all') {
      filter.hostel = req.query.hostel;
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const countFilter = { ...filter, isRead: false };

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('hostel', 'name propertyType city')
        .sort('-createdAt')
        .limit(limit)
        .lean(),
      Notification.countDocuments(countFilter)
    ]);

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const query = req.user.role === 'superadmin'
      ? { _id: req.params.id }
      : { _id: req.params.id, recipient: req.user._id };

    const notification = await Notification.findOneAndUpdate(
      query,
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all unread notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const filter = req.user.role === 'superadmin'
      ? { isRead: false }
      : { recipient: req.user._id, isRead: false };

    await Notification.updateMany(
      filter,
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};
