const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Get user dashboard data (for all authenticated users)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's tasks
    const userTasks = await Task.find({
      $or: [
        { assignedTo: userId },
        { createdBy: userId }
      ]
    }).populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email')
      .populate('project', 'name code')
      .populate('team', 'name')
      .populate('department', 'name')
      .sort({ updatedAt: -1 });

    // Calculate statistics
    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter(task => task.status === 'completed').length;
    const pendingTasks = userTasks.filter(task => task.status === 'pending').length;
    const overdueTasks = userTasks.filter(task => {
      if (task.deadline && task.status !== 'completed') {
        return new Date(task.deadline) < new Date();
      }
      return false;
    }).length;

    // Calculate productivity score (based on completed vs total tasks)
    const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Get user stats
    const user = await User.findById(userId);
    const streakDays = user.stats?.currentStreak || 0;

    const dashboardData = {
      tasks: userTasks,
      stats: {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        productivityScore,
        streakDays
      }
    };

    res.json(dashboardData);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard data', error: err.message });
  }
});

// Get dashboard stats (Employer only)
router.get('/stats', authenticateJWT, authorizeRoles('employer'), async (req, res) => {
  try {
    const totalTasks = await Task.countDocuments();
    const completed = await Task.countDocuments({ status: 'completed' });
    const overdue = await Task.countDocuments({ status: 'overdue' });
    const byDepartment = await Task.aggregate([
      { $lookup: { from: 'users', localField: 'assignedTo', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $group: { _id: '$user.department', count: { $sum: 1 } } }
    ]);
    const byRole = await Task.aggregate([
      { $lookup: { from: 'users', localField: 'assignedTo', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $group: { _id: '$user.role', count: { $sum: 1 } } }
    ]);
    res.json({ totalTasks, completed, overdue, byDepartment, byRole });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
});

// Get top/bottom performers (stub for now)
router.get('/performers', authenticateJWT, authorizeRoles('employer'), async (req, res) => {
  // TODO: Implement AI-based analytics in future
  res.json({ top: [], bottom: [] });
});

// Get recent activity (last 10 tasks)
router.get('/recent', authenticateJWT, authorizeRoles('employer'), async (req, res) => {
  try {
    const recentTasks = await Task.find().sort({ updatedAt: -1 }).limit(10).populate('assignedTo assignedBy');
    res.json(recentTasks);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch recent activity', error: err.message });
  }
});

module.exports = router;