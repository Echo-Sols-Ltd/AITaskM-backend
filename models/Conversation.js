const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['direct', 'group', 'team', 'project'], required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  lastActivity: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  settings: {
    allowFileUploads: { type: Boolean, default: true },
    allowReactions: { type: Boolean, default: true },
    allowEditing: { type: Boolean, default: true },
    allowDeletion: { type: Boolean, default: true }
  },
  metadata: {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', ConversationSchema); 