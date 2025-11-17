const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// GET /api/analytics/overview - Get overview statistics
router.get('/overview', authenticateJWT, async (req, res) => {
  try {
    const { startDate, endDate, teamId, userId } = req.query;
    
    // Build filter
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (teamId) filter.team = teamId;
    if (userId) filter.assignedTo = userId;

    // Role-based filtering
    if (req.user.role === 'employee') {
      filter.assignedTo = req.user._id;
    }

    // Get statistics
    const totalTasks = await Task.countDocuments(filter);
    const completedTasks = await Task.countDocuments({ ...filter, status: 'completed' });
    const inProgressTasks = await Task.countDocuments({ ...filter, status: 'in-progress' });
    const pendingTasks = await Task.countDocuments({ ...filter, status: 'pending' });
    const overdueTasks = await Task.countDocuments({
      ...filter,
      deadline: { $lt: new Date() },
      status: { $ne: 'completed' }
    });

    // Calculate completion rate
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

    // Get priority distribution
    const priorityDistribution = await Task.aggregate([
      { $match: filter },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Get status distribution
    const statusDistribution = await Task.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get active users count
    const activeUsers = await User.countDocuments({ isActive: true });

    res.json({
      overview: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        overdueTasks,
        completionRate: parseFloat(completionRate),
        activeUsers
      },
      priorityDistribution,
      statusDistribution
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch analytics', error: err.message });
  }
});

// GET /api/analytics/trends - Get task completion trends
router.get('/trends', authenticateJWT, async (req, res) => {
  try {
    const { period = '7d', teamId, userId } = req.query;
    
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Build filter
    const filter = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    if (teamId) filter.team = teamId;
    if (userId) filter.assignedTo = userId;

    // Role-based filtering
    if (req.user.role === 'employee') {
      filter.assignedTo = req.user._id;
    }

    // Get daily task creation and completion
    const dailyStats = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Format data for charts
    const trendData = {};
    dailyStats.forEach(stat => {
      const date = stat._id.date;
      if (!trendData[date]) {
        trendData[date] = { date, created: 0, completed: 0, inProgress: 0, pending: 0 };
      }
      if (stat._id.status === 'completed') {
        trendData[date].completed = stat.count;
      } else if (stat._id.status === 'in-progress') {
        trendData[date].inProgress = stat.count;
      } else if (stat._id.status === 'pending') {
        trendData[date].pending = stat.count;
      }
      trendData[date].created += stat.count;
    });

    res.json({
      trends: Object.values(trendData)
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch trends', error: err.message });
  }
});

// GET /api/analytics/team-performance - Get team performance metrics
router.get('/team-performance', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get team performance
    const teamPerformance = await Task.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'teams',
          localField: 'team',
          foreignField: '_id',
          as: 'teamInfo'
        }
      },
      { $unwind: { path: '$teamInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$team',
          teamName: { $first: '$teamInfo.name' },
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          teamId: '$_id',
          teamName: 1,
          totalTasks: 1,
          completedTasks: 1,
          inProgressTasks: 1,
          pendingTasks: 1,
          completionRate: {
            $cond: [
              { $eq: ['$totalTasks', 0] },
              0,
              { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] }
            ]
          }
        }
      },
      { $sort: { completionRate: -1 } }
    ]);

    res.json({ teamPerformance });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch team performance', error: err.message });
  }
});

// GET /api/analytics/user-productivity - Get user productivity metrics
router.get('/user-productivity', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, teamId } = req.query;
    
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (teamId) filter.team = teamId;

    // Get user productivity
    const userProductivity = await Task.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$assignedTo',
          userName: { $first: '$userInfo.name' },
          userEmail: { $first: '$userInfo.email' },
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          avgEstimatedHours: { $avg: '$estimatedHours' }
        }
      },
      {
        $project: {
          userId: '$_id',
          userName: 1,
          userEmail: 1,
          totalTasks: 1,
          completedTasks: 1,
          inProgressTasks: 1,
          pendingTasks: 1,
          avgEstimatedHours: { $round: ['$avgEstimatedHours', 1] },
          completionRate: {
            $cond: [
              { $eq: ['$totalTasks', 0] },
              0,
              { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] }
            ]
          }
        }
      },
      { $sort: { completionRate: -1 } }
    ]);

    res.json({ userProductivity });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user productivity', error: err.message });
  }
});

// GET /api/analytics/priority-analysis - Get priority-based analysis
router.get('/priority-analysis', authenticateJWT, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Role-based filtering
    if (req.user.role === 'employee') {
      filter.assignedTo = req.user._id;
    }

    const priorityAnalysis = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$priority',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          avgEstimatedHours: { $avg: '$estimatedHours' }
        }
      },
      {
        $project: {
          priority: '$_id',
          total: 1,
          completed: 1,
          inProgress: 1,
          pending: 1,
          avgEstimatedHours: { $round: ['$avgEstimatedHours', 1] },
          completionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ['$completed', '$total'] }, 100] }, 1] }
            ]
          }
        }
      },
      { $sort: { priority: 1 } }
    ]);

    res.json({ priorityAnalysis });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch priority analysis', error: err.message });
  }
});

// GET /api/analytics/time-tracking - Get time tracking analytics
router.get('/time-tracking', authenticateJWT, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    const filter = { status: 'completed' };
    if (startDate && endDate) {
      filter.completedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (userId) filter.assignedTo = userId;

    // Role-based filtering
    if (req.user.role === 'employee') {
      filter.assignedTo = req.user._id;
    }

    const timeTracking = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEstimatedHours: { $sum: '$estimatedHours' },
          avgEstimatedHours: { $avg: '$estimatedHours' },
          totalTasks: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          totalEstimatedHours: { $round: ['$totalEstimatedHours', 1] },
          avgEstimatedHours: { $round: ['$avgEstimatedHours', 1] },
          totalTasks: 1
        }
      }
    ]);

    res.json({
      timeTracking: timeTracking[0] || {
        totalEstimatedHours: 0,
        avgEstimatedHours: 0,
        totalTasks: 0
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch time tracking', error: err.message });
  }
});

module.exports = router;
