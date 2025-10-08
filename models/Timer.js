const mongoose = require('mongoose');

const TimerSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  type: { type: String, enum: ['pomodoro', 'break', 'long_break'], required: true },
  startTime: { type: Date, required: true },
  endTime: Date,
  duration: Number, // in minutes
  actualDuration: Number, // actual time spent in minutes
  status: { type: String, enum: ['active', 'paused', 'completed', 'interrupted'], default: 'active' },
  interruptions: [{
    reason: String,
    timestamp: { type: Date, default: Date.now }
  }],
  notes: String
}, { timestamps: true });

const TimerSettingsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pomodoroDuration: { type: Number, default: 25 }, // in minutes
  shortBreakDuration: { type: Number, default: 5 }, // in minutes
  longBreakDuration: { type: Number, default: 15 }, // in minutes
  longBreakInterval: { type: Number, default: 4 }, // after how many pomodoros
  autoStartBreaks: { type: Boolean, default: false },
  autoStartPomodoros: { type: Boolean, default: false },
  soundEnabled: { type: Boolean, default: true },
  notificationsEnabled: { type: Boolean, default: true },
  focusMode: { type: Boolean, default: false }
}, { timestamps: true });

const TimerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentSession: { type: mongoose.Schema.Types.ObjectId, ref: 'TimerSession' },
  isActive: { type: Boolean, default: false },
  totalPomodoros: { type: Number, default: 0 },
  totalFocusTime: { type: Number, default: 0 }, // in minutes
  streak: { type: Number, default: 0 },
  lastCompleted: Date
}, { timestamps: true });

module.exports = {
  Timer: mongoose.model('Timer', TimerSchema),
  TimerSession: mongoose.model('TimerSession', TimerSessionSchema),
  TimerSettings: mongoose.model('TimerSettings', TimerSettingsSchema)
}; 