const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Create new notification
router.post('/', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { userId, title, message, type, priority, category, actionUrl, expiresAt } = req.body;
    
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      priority: priority || 'medium',
      category: category || 'general',
      actionUrl,
      expiresAt
    });

    await notification.save();
    
    // Emit real-time notification to user
    if (req.io) {
      req.io.to(`notifications-${userId}`).emit('new-notification', notification);
    }

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create notification', error: err.message });
  }
});

// Get notifications for current user with pagination and filtering
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, priority, read, category } = req.query;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (read !== undefined) filter.read = read === 'true';
    if (category) filter.category = category;
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('relatedEntity.id', 'title name');
    
    const total = await Notification.countDocuments(filter);
    
    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
});

// Get specific notification by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const notification = await Notification.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    }).populate('relatedEntity.id', 'title name');
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notification', error: err.message });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateJWT, async (req, res) => {
  try {
    const notification = await Notification.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    
    // Emit real-time update
    if (req.io) {
      req.io.to(`notifications-${req.user._id}`).emit('notification-read', { 
        notificationId: notification._id, 
        read: true 
      });
    }
    
    res.json({ 
      message: 'Notification marked as read',
      notification 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notification', error: err.message });
  }
});

// Update notification
router.patch('/:id', authenticateJWT, async (req, res) => {
  try {
    const { title, message, priority, category, actionUrl, expiresAt } = req.body;
    
    const notification = await Notification.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Only allow updating certain fields
    if (title) notification.title = title;
    if (message) notification.message = message;
    if (priority) notification.priority = priority;
    if (category) notification.category = category;
    if (actionUrl) notification.actionUrl = actionUrl;
    if (expiresAt) notification.expiresAt = expiresAt;
    
    await notification.save();
    
    res.json({ 
      message: 'Notification updated successfully',
      notification 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notification', error: err.message });
  }
});

// Delete notification
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const notification = await Notification.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    await notification.deleteOne();
    
    // Emit real-time deletion
    if (req.io) {
      req.io.to(`notifications-${req.user._id}`).emit('notification-deleted', { 
        notificationId: req.params.id 
      });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete notification', error: err.message });
  }
});

// Mark multiple notifications as read
router.post('/bulk-read', authenticateJWT, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: 'Notification IDs array is required' });
    }

    const result = await Notification.updateMany(
      { _id: { $in: notificationIds }, user: req.user._id },
      { read: true, readAt: new Date() }
    );

    // Emit real-time bulk update
    if (req.io) {
      req.io.to(`notifications-${req.user._id}`).emit('notifications-bulk-read', { 
        notificationIds, 
        read: true 
      });
    }

    res.json({ 
      message: 'Notifications marked as read successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark notifications as read', error: err.message });
  }
});

// Delete multiple notifications
router.delete('/bulk-delete', authenticateJWT, async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ message: 'Notification IDs array is required' });
    }
    
    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      user: req.user._id
    });
    
    res.json({ 
      message: `${result.deletedCount} notifications deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete notifications', error: err.message });
  }
});

// Get count of unread notifications
router.get('/unread-count', authenticateJWT, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      user: req.user._id, 
      read: false 
    });
    
    res.json({ 
      unreadCount: count,
      message: 'Unread count retrieved successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get unread count', error: err.message });
  }
});

// Update notification preferences/settings
router.patch('/settings', authenticateJWT, async (req, res) => {
  try {
    const { 
      emailNotifications, 
      pushNotifications, 
      inAppNotifications,
      notificationTypes,
      quietHours
    } = req.body;
    
    // Update user's notification preferences
    const user = req.user;
    
    if (emailNotifications !== undefined) user.preferences.emailNotifications = emailNotifications;
    if (pushNotifications !== undefined) user.preferences.pushNotifications = pushNotifications;
    if (inAppNotifications !== undefined) user.preferences.inAppNotifications = inAppNotifications;
    if (notificationTypes) user.preferences.notificationTypes = notificationTypes;
    if (quietHours) user.preferences.quietHours = quietHours;
    
    await user.save();
    
    res.json({ 
      message: 'Notification settings updated successfully',
      settings: {
        emailNotifications: user.preferences.emailNotifications,
        pushNotifications: user.preferences.pushNotifications,
        inAppNotifications: user.preferences.inAppNotifications,
        notificationTypes: user.preferences.notificationTypes,
        quietHours: user.preferences.quietHours
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notification settings', error: err.message });
  }
});

// Send notification (for system/admin use)
router.post('/send', authenticateJWT, authorizeRoles(['admin', 'system']), async (req, res) => {
  try {
    const { 
      userId, 
      type, 
      title, 
      message, 
      priority, 
      category, 
      relatedEntity, 
      actionUrl, 
      expiresAt,
      deliveryMethod 
    } = req.body;
    
    if (!userId || !type || !title || !message) {
      return res.status(400).json({ 
        message: 'userId, type, title, and message are required' 
      });
    }
    
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      priority: priority || 'medium',
      category,
      relatedEntity,
      actionUrl,
      expiresAt,
      deliveryMethod: deliveryMethod || 'in_app'
    });
    
    await notification.save();
    
    // TODO: Implement actual delivery logic (email, push, SMS)
    // For now, just mark as delivered
    notification.isDelivered = true;
    await notification.save();
    
    res.status(201).json({ 
      message: 'Notification sent successfully',
      notification 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send notification', error: err.message });
  }
});

module.exports = router;