const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const requireAuth = require('../middleware/auth');
const { broadcast } = require('../websocket');

router.use(requireAuth);

// GET /api/notifications — List notifications (most recent first)
router.get('/', async (req, res, next) => {
  try {
    const { unread_only } = req.query;
    let query = {};
    if (unread_only === 'true') query.read = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ read: false });

    res.json({ notifications, unread_count: unreadCount });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read — Mark notification as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    broadcast('notifications', 'read', notification);
    res.json(notification);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all — Mark all as read
router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    broadcast('notifications', 'all_read', {});
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id — Delete a notification
router.delete('/:id', async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    broadcast('notifications', 'deleted', { id: req.params.id });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications — Clear all notifications
router.delete('/', async (req, res, next) => {
  try {
    await Notification.deleteMany({});
    broadcast('notifications', 'cleared', {});
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
