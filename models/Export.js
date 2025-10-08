const mongoose = require('mongoose');

const ExportJobSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['tasks', 'users', 'analytics', 'reports', 'custom'], required: true },
  format: { type: String, enum: ['csv', 'excel', 'pdf', 'json', 'xml'], required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], default: 'pending' },
  filters: mongoose.Schema.Types.Mixed,
  fields: [String], // which fields to include
  dateRange: {
    start: Date,
    end: Date
  },
  scope: {
    type: { type: String, enum: ['user', 'team', 'department', 'global'], default: 'user' },
    id: mongoose.Schema.Types.ObjectId
  },
  progress: {
    current: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }
  },
  result: {
    fileUrl: String,
    fileSize: Number,
    recordCount: Number,
    generatedAt: Date
  },
  error: {
    message: String,
    stack: String,
    occurredAt: Date
  },
  scheduledAt: Date,
  startedAt: Date,
  completedAt: Date,
  expiresAt: Date, // when the export file expires
  isRecurring: { type: Boolean, default: false },
  recurrence: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    nextRun: Date
  }
}, { timestamps: true });

const ExportTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'edit', 'admin'], default: 'view' }
  }],
  type: { type: String, enum: ['tasks', 'users', 'analytics', 'reports', 'custom'], required: true },
  format: { type: String, enum: ['csv', 'excel', 'pdf', 'json', 'xml'], required: true },
  fields: [String],
  filters: mongoose.Schema.Types.Mixed,
  styling: {
    includeHeaders: { type: Boolean, default: true },
    includeTotals: { type: Boolean, default: false },
    dateFormat: String,
    numberFormat: String,
    customCSS: String
  },
  useCount: { type: Number, default: 0 },
  lastUsed: Date
}, { timestamps: true });

module.exports = {
  ExportJob: mongoose.model('ExportJob', ExportJobSchema),
  ExportTemplate: mongoose.model('ExportTemplate', ExportTemplateSchema)
}; 