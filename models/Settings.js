const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  description: String,
  category: { type: String, enum: ['general', 'security', 'notifications', 'features', 'integrations'], default: 'general' },
  isEditable: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  validation: {
    type: String,
    required: Boolean,
    min: Number,
    max: Number,
    enum: [String]
  }
}, { timestamps: true });

const FeatureFlagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  isEnabled: { type: Boolean, default: false },
  enabledFor: {
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    roles: [String]
  },
  rolloutPercentage: { type: Number, min: 0, max: 100, default: 0 },
  startDate: Date,
  endDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const UserPreferencesSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  dateFormat: { type: String, default: 'MM/DD/YYYY' },
  timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true }
  },
  dashboard: {
    layout: { type: String, default: 'default' },
    widgets: [String],
    refreshInterval: { type: Number, default: 300 } // seconds
  },
  privacy: {
    profileVisibility: { type: String, enum: ['public', 'team', 'private'], default: 'team' },
    activityVisibility: { type: String, enum: ['public', 'team', 'private'], default: 'team' },
    allowMentions: { type: Boolean, default: true }
  },
  productivity: {
    focusMode: { type: Boolean, default: false },
    autoStartTimer: { type: Boolean, default: false },
    weeklyReports: { type: Boolean, default: true },
    goalReminders: { type: Boolean, default: true }
  }
}, { timestamps: true });

const OrganizationSettingsSchema = new mongoose.Schema({
  organization: { type: String, required: true, unique: true },
  name: String,
  logo: String,
  domain: String,
  settings: {
    userRegistration: { type: Boolean, default: true },
    emailVerification: { type: Boolean, default: true },
    twoFactorAuth: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 480 }, // minutes
    maxFileSize: { type: Number, default: 10 }, // MB
    allowedFileTypes: [String],
    backupFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' }
  },
  integrations: {
    google: { type: Boolean, default: false },
    slack: { type: Boolean, default: false },
    microsoft: { type: Boolean, default: false },
    custom: [{
      name: String,
      isEnabled: Boolean,
      config: mongoose.Schema.Types.Mixed
    }]
  },
  branding: {
    primaryColor: String,
    secondaryColor: String,
    customCSS: String,
    favicon: String
  }
}, { timestamps: true });

module.exports = {
  SystemSettings: mongoose.model('SystemSettings', SystemSettingsSchema),
  FeatureFlag: mongoose.model('FeatureFlag', FeatureFlagSchema),
  UserPreferences: mongoose.model('UserPreferences', UserPreferencesSchema),
  OrganizationSettings: mongoose.model('OrganizationSettings', OrganizationSettingsSchema)
}; 