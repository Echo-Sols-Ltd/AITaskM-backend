const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emoji: String,
  createdAt: { type: Date, default: Date.now }
});

const ChatMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  messageType: { type: String, enum: ['text', 'file', 'image', 'system'], default: 'text' },
  attachments: [{
    url: String,
    filename: String,
    fileType: String,
    fileSize: Number
  }],
  reactions: [ReactionSchema],
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);