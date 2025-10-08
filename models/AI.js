const mongoose = require('mongoose');

const AISuggestionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  type: { type: String, enum: ['task_assignment', 'schedule_optimization', 'performance_analysis', 'productivity_tip'], required: true },
  title: { type: String, required: true },
  description: String,
  confidence: { type: Number, min: 0, max: 1 }, // AI confidence score
  data: mongoose.Schema.Types.Mixed, // AI analysis data
  isApplied: { type: Boolean, default: false },
  appliedAt: Date,
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    feedbackAt: Date
  },
  expiresAt: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const AITaskAssignmentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  suggestedAssignees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confidence: Number,
    reasons: [String]
  }],
  suggestedSchedule: {
    startDate: Date,
    estimatedDuration: Number,
    priority: String
  },
  analysis: {
    complexity: String,
    requiredSkills: [String],
    teamWorkload: mongoose.Schema.Types.Mixed,
    dependencies: [String]
  },
  isApplied: { type: Boolean, default: false },
  appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appliedAt: Date
}, { timestamps: true });

const AIPerformanceAnalysisSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  startDate: Date,
  endDate: Date,
  metrics: {
    productivity: Number,
    efficiency: Number,
    quality: Number,
    collaboration: Number
  },
  insights: [String],
  recommendations: [String],
  trends: mongoose.Schema.Types.Mixed,
  isRead: { type: Boolean, default: false },
  readAt: Date
}, { timestamps: true });

const AIScheduleOptimizationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  date: { type: Date, required: true },
  currentSchedule: [{
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    startTime: Date,
    endTime: Date,
    priority: String
  }],
  optimizedSchedule: [{
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    startTime: Date,
    endTime: Date,
    priority: String,
    reason: String
  }],
  improvements: {
    efficiency: Number,
    timeSaved: Number,
    priorityAlignment: Number
  },
  isApplied: { type: Boolean, default: false },
  appliedAt: Date
}, { timestamps: true });

module.exports = {
  AISuggestion: mongoose.model('AISuggestion', AISuggestionSchema),
  AITaskAssignment: mongoose.model('AITaskAssignment', AITaskAssignmentSchema),
  AIPerformanceAnalysis: mongoose.model('AIPerformanceAnalysis', AIPerformanceAnalysisSchema),
  AIScheduleOptimization: mongoose.model('AIScheduleOptimization', AIScheduleOptimizationSchema)
}; 