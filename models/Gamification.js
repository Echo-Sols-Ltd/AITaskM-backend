const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  icon: String,
  color: String,
  category: { type: String, enum: ['productivity', 'teamwork', 'learning', 'milestone', 'special'], default: 'productivity' },
  criteria: {
    type: { type: String, enum: ['tasks_completed', 'streak', 'points', 'team_contribution', 'custom'], required: true },
    value: Number,
    description: String
  },
  rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' },
  isActive: { type: Boolean, default: true },
  awardedCount: { type: Number, default: 0 }
}, { timestamps: true });

const AchievementSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  icon: String,
  points: { type: Number, default: 0 },
  category: { type: String, enum: ['daily', 'weekly', 'monthly', 'milestone', 'special'], default: 'milestone' },
  criteria: {
    type: { type: String, enum: ['tasks_completed', 'streak', 'points', 'team_contribution', 'custom'], required: true },
    value: Number,
    description: String
  },
  isRepeatable: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const UserBadgeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  badge: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge', required: true },
  awardedAt: { type: Date, default: Date.now },
  awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  context: String
}, { timestamps: true });

const UserAchievementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  achievement: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
  unlockedAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
  completedAt: Date
}, { timestamps: true });

const PointsTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['earned', 'spent', 'bonus', 'penalty'], required: true },
  reason: String,
  source: { type: String, enum: ['task_completion', 'streak', 'achievement', 'badge', 'team_contribution', 'custom'], required: true },
  relatedEntity: {
    type: { type: String, enum: ['task', 'achievement', 'badge', 'team'] },
    id: { type: mongoose.Schema.Types.ObjectId }
  },
  balance: Number // user's balance after this transaction
}, { timestamps: true });

const LeaderboardSchema = new mongoose.Schema({
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  type: { type: String, enum: ['points', 'tasks', 'streak', 'productivity'], required: true },
  scope: { type: String, enum: ['global', 'team', 'department'], default: 'global' },
  scopeId: { type: mongoose.Schema.Types.ObjectId }, // team or department ID if applicable
  rankings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rank: Number,
    score: Number,
    previousRank: Number
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = {
  Badge: mongoose.model('Badge', BadgeSchema),
  Achievement: mongoose.model('Achievement', AchievementSchema),
  UserBadge: mongoose.model('UserBadge', UserBadgeSchema),
  UserAchievement: mongoose.model('UserAchievement', UserAchievementSchema),
  PointsTransaction: mongoose.model('PointsTransaction', PointsTransactionSchema),
  Leaderboard: mongoose.model('Leaderboard', LeaderboardSchema)
}; 