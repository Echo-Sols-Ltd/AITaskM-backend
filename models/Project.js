const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  code: { type: String, unique: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  status: { type: String, enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'], default: 'planning' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  estimatedHours: Number,
  actualHours: { type: Number, default: 0 },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  budget: Number,
  actualCost: { type: Number, default: 0 },
  tags: [String],
  category: String,
  client: String,
  stakeholders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  milestones: [{
    title: String,
    description: String,
    targetDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  risks: [{
    description: String,
    probability: { type: String, enum: ['low', 'medium', 'high'] },
    impact: { type: String, enum: ['low', 'medium', 'high'] },
    mitigation: String,
    status: { type: String, enum: ['open', 'mitigated', 'closed'] }
  }],
  documents: [{
    name: String,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema); 