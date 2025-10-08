const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  settings: {
    allowMemberInvites: { type: Boolean, default: true },
    allowTaskAssignment: { type: Boolean, default: true },
    allowFileSharing: { type: Boolean, default: true }
  },
  stats: {
    totalMembers: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    averageProductivity: { type: Number, default: 0 }
  },
  color: String,
  avatar: String
}, { timestamps: true });

module.exports = mongoose.model('Team', TeamSchema); 