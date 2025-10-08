const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  code: { type: String, unique: true },
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parentDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  isActive: { type: Boolean, default: true },
  settings: {
    allowTeamCreation: { type: Boolean, default: true },
    allowUserManagement: { type: Boolean, default: true },
    allowKPIManagement: { type: Boolean, default: true }
  },
  stats: {
    totalUsers: { type: Number, default: 0 },
    totalTeams: { type: Number, default: 0 },
    totalTasks: { type: Number, default: 0 },
    averageProductivity: { type: Number, default: 0 }
  },
  color: String,
  icon: String
}, { timestamps: true });

module.exports = mongoose.model('Department', DepartmentSchema); 