const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['task', 'message', 'reminder', 'achievement', 'system', 'team', 'kpi'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  category: String,
  relatedEntity: {
    type: { type: String, enum: ['task', 'user', 'team', 'kpi', 'goal'] },
    id: { type: mongoose.Schema.Types.ObjectId }
  },
  actionUrl: String,
  expiresAt: Date,
  sentAt: { type: Date, default: Date.now },
  readAt: Date,
  deliveryMethod: { type: String, enum: ['in_app', 'email', 'push', 'sms'], default: 'in_app' },
  isDelivered: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);