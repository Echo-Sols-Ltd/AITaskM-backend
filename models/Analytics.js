const mongoose = require('mongoose');

const ProductivityMetricSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  date: { type: Date, required: true },
  period: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'], required: true },
  metrics: {
    tasksCompleted: { type: Number, default: 0 },
    tasksCreated: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 }, // in minutes
    focusTime: { type: Number, default: 0 }, // in minutes
    interruptions: { type: Number, default: 0 },
    efficiency: { type: Number, min: 0, max: 100, default: 0 },
    quality: { type: Number, min: 0, max: 100, default: 0 }
  },
  breakdown: {
    byPriority: {
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 }
    },
    byCategory: mongoose.Schema.Types.Mixed,
    byTimeOfDay: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

const EfficiencyMetricSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  date: { type: Date, required: true },
  period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  metrics: {
    timeToComplete: { type: Number, default: 0 }, // average time in minutes
    estimatedVsActual: { type: Number, default: 0 }, // percentage difference
    reworkRate: { type: Number, default: 0 }, // percentage
    onTimeDelivery: { type: Number, default: 0 }, // percentage
    resourceUtilization: { type: Number, default: 0 } // percentage
  },
  trends: {
    improvement: { type: Number, default: 0 }, // percentage change from previous period
    consistency: { type: Number, default: 0 } // standard deviation
  }
}, { timestamps: true });

const QualityMetricSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  date: { type: Date, required: true },
  period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  metrics: {
    errorRate: { type: Number, default: 0 }, // percentage
    customerSatisfaction: { type: Number, default: 0 }, // 1-5 scale
    reviewScore: { type: Number, default: 0 }, // 1-5 scale
    defectRate: { type: Number, default: 0 }, // percentage
    complianceScore: { type: Number, default: 0 } // percentage
  },
  feedback: [{
    source: String,
    rating: Number,
    comment: String,
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const TrendAnalysisSchema = new mongoose.Schema({
  metric: { type: String, required: true }, // e.g., 'productivity', 'efficiency', 'quality'
  scope: { type: String, enum: ['user', 'team', 'department', 'global'], required: true },
  scopeId: { type: mongoose.Schema.Types.ObjectId }, // user, team, or department ID
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], required: true },
  startDate: Date,
  endDate: Date,
  data: [{
    date: Date,
    value: Number,
    change: Number, // percentage change from previous period
    trend: { type: String, enum: ['increasing', 'decreasing', 'stable'] }
  }],
  summary: {
    average: Number,
    trend: String,
    volatility: Number,
    seasonality: Boolean,
    forecast: Number
  }
}, { timestamps: true });

const ReportSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['productivity', 'efficiency', 'quality', 'team', 'custom'], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipients: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['viewer', 'editor', 'admin'] }
  }],
  schedule: {
    frequency: { type: String, enum: ['once', 'daily', 'weekly', 'monthly'] },
    nextRun: Date,
    isActive: { type: Boolean, default: true }
  },
  filters: mongoose.Schema.Types.Mixed,
  format: { type: String, enum: ['pdf', 'excel', 'csv', 'json'], default: 'pdf' },
  lastGenerated: Date,
  isPublic: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = {
  ProductivityMetric: mongoose.model('ProductivityMetric', ProductivityMetricSchema),
  EfficiencyMetric: mongoose.model('EfficiencyMetric', EfficiencyMetricSchema),
  QualityMetric: mongoose.model('QualityMetric', QualityMetricSchema),
  TrendAnalysis: mongoose.model('TrendAnalysis', TrendAnalysisSchema),
  Report: mongoose.model('Report', ReportSchema)
}; 