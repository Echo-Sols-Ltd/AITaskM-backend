const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const Department = require('../models/Department');
const Role = require('../models/Role');
const User = require('../models/User');

// Get all departments
router.get('/departments', authenticateJWT, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const departments = await Department.find(query)
      .populate('head', 'name email')
      .populate('parentDepartment', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Department.countDocuments(query);

    res.json({
      message: 'Departments retrieved successfully',
      departments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch departments', error: err.message });
  }
});

// Get department by ID
router.get('/departments/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    const department = await Department.findById(id)
      .populate('head', 'name email')
      .populate('parentDepartment', 'name')
      .exec();

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({
      message: 'Department retrieved successfully',
      department
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch department', error: err.message });
  }
});

// Create new department
router.post('/departments', authenticateJWT, authorizeRoles('employer', 'admin'), async (req, res) => {
  try {
    const { name, description, code, head, parentDepartment, settings, color, icon } = req.body;
    
    // Check if department with same name or code already exists
    const existingDept = await Department.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { code: code }
      ]
    });

    if (existingDept) {
      return res.status(400).json({ 
        message: 'Department with this name or code already exists' 
      });
    }

    const newDepartment = new Department({
      name,
      description,
      code,
      head,
      parentDepartment,
      settings: settings || {
        allowTeamCreation: true,
        allowUserManagement: true,
        allowKPIManagement: true
      },
      color,
      icon
    });

    await newDepartment.save();

    const populatedDept = await Department.findById(newDepartment._id)
      .populate('head', 'name email')
      .populate('parentDepartment', 'name');

    res.status(201).json({
      message: 'Department created successfully',
      department: populatedDept
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create department', error: err.message });
  }
});

// Update department
router.put('/departments/:id', authenticateJWT, authorizeRoles('employer', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if name/code conflicts with other departments
    if (updates.name || updates.code) {
      const existingDept = await Department.findOne({
        $and: [
          { _id: { $ne: id } },
          {
            $or: [
              { name: { $regex: new RegExp(`^${updates.name || department.name}$`, 'i') } },
              { code: updates.code || department.code }
            ]
          }
        ]
      });

      if (existingDept) {
        return res.status(400).json({ 
          message: 'Department with this name or code already exists' 
        });
      }
    }

    const updatedDepartment = await Department.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('head', 'name email').populate('parentDepartment', 'name');

    res.json({
      message: 'Department updated successfully',
      department: updatedDepartment
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update department', error: err.message });
  }
});

// Delete department
router.delete('/departments/:id', authenticateJWT, authorizeRoles('employer'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if department has users or teams
    const userCount = await User.countDocuments({ department: id });
    const teamCount = await require('../models/Team').countDocuments({ department: id });

    if (userCount > 0 || teamCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete department with active users or teams' 
      });
    }

    await Department.findByIdAndDelete(id);

    res.json({
      message: 'Department deleted successfully',
      departmentId: id
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete department', error: err.message });
  }
});

// Get department members
router.get('/departments/:id/members', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, role, search } = req.query;
    
    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const query = { department: id };
    if (role) {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const members = await User.find(query)
      .select('name email role position avatar isActive lastActiveAt')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await User.countDocuments(query);

    res.json({
      message: 'Department members retrieved successfully',
      departmentId: id,
      members,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch department members', error: err.message });
  }
});

// Get all roles
router.get('/roles', authenticateJWT, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, department, isActive } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) {
      query.department = department;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const roles = await Role.find(query)
      .populate('department', 'name')
      .populate('team', 'name')
      .populate('createdBy', 'name email')
      .sort({ level: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Role.countDocuments(query);

    res.json({
      message: 'Roles retrieved successfully',
      roles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch roles', error: err.message });
  }
});

// Get role by ID
router.get('/roles/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    const role = await Role.findById(id)
      .populate('department', 'name')
      .populate('team', 'name')
      .populate('createdBy', 'name email')
      .exec();

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    res.json({
      message: 'Role retrieved successfully',
      role
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch role', error: err.message });
  }
});

// Create new role
router.post('/roles', authenticateJWT, authorizeRoles('employer', 'admin'), async (req, res) => {
  try {
    const { name, description, permissions, department, team, level, color, icon } = req.body;
    
    // Check if role with same name already exists
    const existingRole = await Role.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingRole) {
      return res.status(400).json({ 
        message: 'Role with this name already exists' 
      });
    }

    const newRole = new Role({
      name,
      description,
      permissions: permissions || [],
      department,
      team,
      level: level || 1,
      color,
      icon,
      createdBy: req.user._id
    });

    await newRole.save();

    const populatedRole = await Role.findById(newRole._id)
      .populate('department', 'name')
      .populate('team', 'name')
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Role created successfully',
      role: populatedRole
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create role', error: err.message });
  }
});

// Update role
router.put('/roles/:id', authenticateJWT, authorizeRoles('employer', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Prevent updating system roles
    if (role.isSystem) {
      return res.status(400).json({ 
        message: 'Cannot modify system roles' 
      });
    }

    // Check if name conflicts with other roles
    if (updates.name) {
      const existingRole = await Role.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${updates.name}$`, 'i') }
      });

      if (existingRole) {
        return res.status(400).json({ 
          message: 'Role with this name already exists' 
        });
      }
    }

    const updatedRole = await Role.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('department', 'name').populate('team', 'name').populate('createdBy', 'name email');

    res.json({
      message: 'Role updated successfully',
      role: updatedRole
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update role', error: err.message });
  }
});

// Delete role
router.delete('/roles/:id', authenticateJWT, authorizeRoles('employer'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      return res.status(400).json({ 
        message: 'Cannot delete system roles' 
      });
    }

    // Check if role is assigned to any users
    const userCount = await User.countDocuments({ role: id });
    if (userCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete role that is assigned to users' 
      });
    }

    await Role.findByIdAndDelete(id);

    res.json({
      message: 'Role deleted successfully',
      roleId: id
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete role', error: err.message });
  }
});

// Assign roles to user
router.post('/users/:id/roles', authenticateJWT, authorizeRoles('employer', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { roleIds, department } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate role IDs
    const roles = await Role.find({ _id: { $in: roleIds } });
    if (roles.length !== roleIds.length) {
      return res.status(400).json({ message: 'One or more invalid role IDs' });
    }

    // Update user's role and department
    const updateData = {};
    if (roleIds.length === 1) {
      updateData.role = roleIds[0];
    }
    if (department) {
      updateData.department = department;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Roles assigned successfully',
      user: updatedUser,
      assignedRoles: roles
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign roles', error: err.message });
  }
});

module.exports = router; 