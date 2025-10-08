const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
  resource: { type: String, required: true }, // e.g., 'tasks', 'users', 'reports'
  actions: [{ type: String, enum: ['create', 'read', 'update', 'delete', 'assign', 'approve'], required: true }],
  conditions: mongoose.Schema.Types.Mixed // additional conditions for the permission
});

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  permissions: [PermissionSchema],
  isSystem: { type: Boolean, default: false }, // system roles cannot be deleted
  isActive: { type: Boolean, default: true },
  level: { type: Number, default: 1 }, // hierarchy level
  color: String,
  icon: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema); 