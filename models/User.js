const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'employee', 'viewer'], required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  avatar: String,
  phone: String,
  position: String,
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  kpis: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KPI' }],
  goals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],
  locale: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
  // Password reset fields
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    inAppNotifications: { type: Boolean, default: true },
    weeklyReports: { type: Boolean, default: true },
    focusMode: { type: Boolean, default: false },
    notificationTypes: {
      task: { type: Boolean, default: true },
      message: { type: Boolean, default: true },
      reminder: { type: Boolean, default: true },
      achievement: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
      team: { type: Boolean, default: true },
      kpi: { type: Boolean, default: true }
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '22:00' },
      endTime: { type: String, default: '08:00' },
      timezone: { type: String, default: 'UTC' }
    }
  },
  stats: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  emailVerified: { type: Boolean, default: false },
  googleId: String
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  const isPasswordValid = await bcrypt.compare(candidatePassword, this.password);
  return isPasswordValid
};

module.exports = mongoose.model('User', UserSchema);