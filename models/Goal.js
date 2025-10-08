const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  type: { type: String, enum: ['personal', 'team', 'department', 'company'], default: 'personal' },
  category: { type: String, enum: ['productivity', 'learning', 'health', 'career', 'custom'], default: 'custom' },
  targetValue: Number,
  currentValue: { type: Number, default: 0 },
  unit: String,
  startDate: { type: Date, default: Date.now },
  targetDate: { type: Date, required: true },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'overdue', 'cancelled'], default: 'active' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  milestones: [{
    title: String,
    targetDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  relatedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  relatedKPIs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KPI' }],
  isPublic: { type: Boolean, default: false },
  completedAt: Date,
  notes: String
}, { timestamps: true });

module.exports = mongoose.model('Goal', GoalSchema); 