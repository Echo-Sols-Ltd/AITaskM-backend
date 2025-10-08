const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  createdAt: { type: Date, default: Date.now },
});

const AttachmentSchema = new mongoose.Schema({
  url: String,
  filename: String,
  fileType: String,
  fileSize: Number,
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const BlockerSchema = new mongoose.Schema({
  description: String,
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reportedAt: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const TimeLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startTime: Date,
  endTime: Date,
  duration: Number, // in minutes
  description: String
});

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'overdue', 'blocked', 'cancelled'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  deadline: Date,
  estimatedHours: Number,
  actualHours: Number,
  progress: { type: Number, min: 0, max: 100, default: 0 },
  tags: [String],
  category: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  comments: [CommentSchema],
  attachments: [AttachmentSchema],
  blockers: [BlockerSchema],
  timeLogs: [TimeLogSchema],
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  subtasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  aiAssignmentData: { type: Object },
  aiSuggestions: [String],
  industryTemplate: { type: String },
  complexity: { type: String, enum: ['simple', 'moderate', 'complex'], default: 'moderate' },
  risk: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  completedAt: Date,
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);