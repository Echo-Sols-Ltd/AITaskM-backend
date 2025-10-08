const mongoose = require('mongoose');

const KPISchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  targetValue: Number,
  currentValue: Number,
  unit: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], default: 'monthly' },
  category: { type: String, enum: ['productivity', 'quality', 'efficiency', 'satisfaction', 'financial', 'custom'], default: 'productivity' },
  formula: String,
  dataSource: String,
  threshold: {
    warning: Number,
    critical: Number
  },
  isActive: { type: Boolean, default: true },
  lastCalculated: Date,
  history: [{
    value: Number,
    date: { type: Date, default: Date.now },
    notes: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('KPI', KPISchema);