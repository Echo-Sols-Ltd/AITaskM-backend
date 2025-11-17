const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');

// AI Task Assignment
router.post('/assign-tasks', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { tasks, teamMembers, criteria } = req.body;
    
    // Simple AI logic: Assign based on current workload
    const memberWorkload = {};
    
    // Calculate current workload for each member
    for (const member of teamMembers) {
      const activeTasks = await Task.countDocuments({
        assignedTo: member.id,
        status: { $in: ['pending', 'in-progress'] }
      });
      memberWorkload[member.id] = activeTasks;
    }
    
    // Assign tasks to members with lowest workload
    const assignments = tasks.map(task => {
      // Find member with lowest workload
      const assignedMember = teamMembers.reduce((prev, curr) => 
        memberWorkload[curr.id] < memberWorkload[prev.id] ? curr : prev
      );
      
      // Increment workload for next assignment
      memberWorkload[assignedMember.id]++;
      
      return {
        taskId: task.id,
        assignedTo: assignedMember.id,
        reason: `Assigned based on workload balance (${memberWorkload[assignedMember.id] - 1} active tasks)`
      };
    });
    
    res.json({ 
      message: 'AI task assignment completed',
      assignments,
      criteria
    });
  } catch (err) {
    res.status(500).json({ message: 'AI assignment failed', error: err.message });
  }
});

// AI Schedule Optimization
router.post('/optimize-schedule', authenticateJWT, authorizeRoles('employer', 'manager'), async (req, res) => {
  try {
    const { tasks, constraints, preferences } = req.body;
    
    // Placeholder for AI schedule optimization
    const optimizedSchedule = {
      tasks: tasks.map(task => ({
        ...task,
        suggestedStartTime: new Date(Date.now() + Math.random() * 86400000),
        suggestedDuration: Math.floor(Math.random() * 480) + 30 // 30 min to 8.5 hours
      })),
      totalEfficiency: Math.random() * 0.4 + 0.6, // 60-100%
      recommendations: [
        'Consider grouping similar tasks together',
        'Schedule high-priority tasks during peak productivity hours',
        'Include buffer time between tasks'
      ]
    };
    
    res.json({
      message: 'Schedule optimization completed',
      optimizedSchedule
    });
  } catch (err) {
    res.status(500).json({ message: 'Schedule optimization failed', error: err.message });
  }
});

// AI Suggestions
router.get('/suggestions', authenticateJWT, async (req, res) => {
  try {
    const { userId, context } = req.query;
    const targetUserId = userId || req.user._id;
    
    // Get user's tasks
    const userTasks = await Task.find({
      assignedTo: targetUserId,
      status: { $in: ['pending', 'in-progress'] }
    }).sort({ deadline: 1 });
    
    const suggestions = [];
    
    // Check for overdue tasks
    const overdueTasks = userTasks.filter(task => 
      task.deadline && new Date(task.deadline) < new Date()
    );
    if (overdueTasks.length > 0) {
      suggestions.push({
        type: 'task_management',
        message: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}. Consider prioritizing them or requesting deadline extensions.`,
        priority: 'high'
      });
    }
    
    // Check for high-priority tasks
    const highPriorityTasks = userTasks.filter(task => 
      task.priority === 'high' || task.priority === 'urgent'
    );
    if (highPriorityTasks.length > 3) {
      suggestions.push({
        type: 'task_management',
        message: `You have ${highPriorityTasks.length} high-priority tasks. Consider delegating some or breaking them into smaller tasks.`,
        priority: 'high'
      });
    }
    
    // Check task completion rate
    const completedTasks = await Task.countDocuments({
      assignedTo: targetUserId,
      status: 'completed',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    const totalTasks = await Task.countDocuments({
      assignedTo: targetUserId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    if (totalTasks > 0) {
      const completionRate = completedTasks / totalTasks;
      if (completionRate < 0.5) {
        suggestions.push({
          type: 'productivity',
          message: 'Your task completion rate is below 50% this week. Consider using time-blocking or the Pomodoro technique.',
          priority: 'medium'
        });
      } else if (completionRate > 0.8) {
        suggestions.push({
          type: 'productivity',
          message: 'Great job! Your completion rate is above 80%. Keep up the excellent work!',
          priority: 'low'
        });
      }
    }
    
    // General productivity tip
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'productivity',
        message: 'Consider reviewing your tasks at the start of each day to prioritize effectively.',
        priority: 'low'
      });
    }
    
    res.json({
      message: 'AI suggestions retrieved',
      suggestions,
      context
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get AI suggestions', error: err.message });
  }
});

// AI Performance Analysis
router.post('/analyze-performance', authenticateJWT, async (req, res) => {
  try {
    const { userId, timeframe, metrics } = req.body;
    
    // Placeholder for AI performance analysis
    const analysis = {
      productivityScore: Math.random() * 0.4 + 0.6, // 60-100%
      efficiencyTrend: Math.random() > 0.5 ? 'improving' : 'declining',
      recommendations: [
        'Focus on completing tasks before starting new ones',
        'Your productivity peaks between 9-11 AM',
        'Consider taking more breaks to maintain focus'
      ],
      insights: {
        bestPerformingDay: 'Wednesday',
        peakProductivityHour: '10:00 AM',
        taskCompletionRate: Math.random() * 0.3 + 0.7 // 70-100%
      }
    };
    
    res.json({
      message: 'Performance analysis completed',
      analysis,
      timeframe
    });
  } catch (err) {
    res.status(500).json({ message: 'Performance analysis failed', error: err.message });
  }
});

module.exports = router; 