const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Get all users (All authenticated users can see basic user list for messaging)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { limit = 50, page = 1, role, search } = req.query;
    
    let filter = {};
    
    // Filter by role if provided
    if (role) {
      filter.role = role;
    }
    
    // Search by name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Regular users can only see basic info, admins/managers see more details
    const isAdminOrManager = ['admin', 'manager', 'employer'].includes(req.user.role);
    const selectFields = isAdminOrManager 
      ? 'name email role avatar department team status'
      : 'name email role avatar'; // Limited fields for regular users
    
    const users = await User.find(filter)
      .select(selectFields)
      .populate('team', 'name')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ name: 1 });
    
    const total = await User.countDocuments(filter);
    
    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});

// Get user profile (must come before /:id)
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    // TODO: Implement user profile retrieval
    const userProfile = {
      id: req.user._id,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'developer',
      department: 'Engineering',
      avatar: 'https://example.com/avatar.jpg',
      bio: 'Full-stack developer with 5 years of experience',
      skills: ['JavaScript', 'React', 'Node.js', 'Python'],
      location: 'New York',
      timezone: 'America/New_York',
      joinDate: '2023-01-15',
      lastActive: new Date().toISOString()
    };
    
    res.json({
      message: 'User profile retrieved successfully',
      profile: userProfile
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user profile', error: err.message });
  }
});

// Update user profile
router.put('/profile', authenticateJWT, async (req, res) => {
  try {
    const updates = req.body;
    
    // TODO: Implement user profile update
    const updatedProfile = {
      id: req.user._id,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      message: 'User profile updated successfully',
      profile: updatedProfile
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user profile', error: err.message });
  }
});

// Get user by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Implement user retrieval by ID
    const user = {
      id,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'developer',
      department: 'Engineering',
      avatar: 'https://example.com/avatar.jpg',
      bio: 'Full-stack developer with 5 years of experience',
      skills: ['JavaScript', 'React', 'Node.js', 'Python'],
      location: 'New York',
      timezone: 'America/New_York',
      joinDate: '2023-01-15',
      lastActive: new Date().toISOString(),
      publicProfile: true
    };
    
    res.json({
      message: 'User retrieved successfully',
      user
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
});

// Update user by ID (admin only)
router.put('/:id', authenticateJWT, authorizeRoles('employer', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // TODO: Implement user update by admin
    const updatedUser = {
      id,
      ...updates,
      updatedBy: req.user._id,
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
});

// Delete user by ID (admin only)
router.delete('/:id', authenticateJWT, authorizeRoles('employer'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Implement user deletion
    
    res.json({
      message: 'User deleted successfully',
      userId: id
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
});

// ============================================
// USER CRUD OPERATIONS (after specific routes)
// ============================================

// Get user by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('team', 'name')
      .populate('department', 'name');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
});

// Create new user (Admin only)
router.post('/', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, email, password, role, department, team } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      password, // Will be hashed by the model pre-save hook
      role: role || 'employee',
      department,
      team
    });
    
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      message: 'User created successfully',
      user: userResponse
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Failed to create user', error: err.message });
  }
});

// Update user (Admin or self)
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user is updating their own profile or is admin
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }
    
    const { name, email, role, department, team, avatar, status } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (avatar !== undefined) user.avatar = avatar;
    
    // Only admin can update role, department, team, status
    if (req.user.role === 'admin') {
      if (role) user.role = role;
      if (department !== undefined) user.department = department;
      if (team !== undefined) user.team = team;
      if (status !== undefined) user.status = status;
    }
    
    await user.save();
    
    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Soft delete by setting status to inactive
    user.status = 'inactive';
    await user.save();
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
});

module.exports = router; 