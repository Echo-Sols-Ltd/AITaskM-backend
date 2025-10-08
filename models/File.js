const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  url: { type: String, required: true },
  fileType: String,
  fileSize: Number, // in bytes
  mimeType: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  category: { type: String, enum: ['document', 'image', 'video', 'audio', 'archive', 'other'], default: 'other' },
  tags: [String],
  description: String,
  isPublic: { type: Boolean, default: false },
  isShared: { type: Boolean, default: false },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'edit', 'admin'], default: 'view' },
    sharedAt: { type: Date, default: Date.now }
  }],
  downloadCount: { type: Number, default: 0 },
  lastDownloaded: Date,
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema); 