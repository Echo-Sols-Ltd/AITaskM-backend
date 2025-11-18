const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const aiClient = require('../utils/aiClient');
const { emitToUser, emitNotification } = require('../socket');
const Logger = require('../utils/logger');
const { aiLimiter, strictLimiter } = require('../middleware/rateLimiter');

const logger = new Logger('AI_ROUTES');

// AI Task Assignment
router.post('/assign-tasks', aiLimiter, authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { tasks, teamMembers, criteria } = req.body;
    
    logger.info('AI task assignment requested', { 
      taskCount: tasks.length, 
      memberCount: teamMembers.length 
    });
    
    // Enrich team members with current workload
    const enrichedMembers = await Promise.all(teamMembers.map(async (member) => {
      const activeTasks = await Task.countDocuments({
        assignedTo: member.id || member._id,
        status: { $in: ['pending', 'in-progress'] }
      });
      
      const completedTasks = await Task.countDocuments({
        assignedTo: member.id || member._id,
        status: 'completed'
      });
      
      const totalTasks = await Task.countDocuments({
        assignedTo: member.id || member._id
      });
      
      return {
        ...member,
        currentTasks: activeTasks,
        completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0.8
      };
    }));
    
    // Call AI service for intelligent assignment
    const aiResult = await aiClient.assignTasks(tasks, enrichedMembers, criteria);
    
    // Update tasks in database with assignments
    const updatePromises = aiResult.assignments.map(async (assignment) => {
      const task = await Task.findById(assignment.task_id);
      if (task) {
        task.assignedTo = assignment.assigned_to;
        task.assignedBy = req.user._id;
        task.aiAssigned = true;
        task.aiReason = assignment.reason;
        await task.save();
        
        // Emit real-time notification
        emitToUser(assignment.assigned_to, 'ai-task-assigned', {
          taskId: assignment.task_id,
          taskTitle: task.title,
          reason: assignment.reason
        });
        
        emitNotification(assignment.assigned_to, {
          title: 'AI Task Assignment',
          message: `You've been assigned: ${task.title}`,
          type: 'info',
          actionUrl: `/tasks/${assignment.task_id}`
        });
      }
    });
    
    await Promise.all(updatePromises);
    
    logger.info('AI task assignment completed', { 
      assignmentCount: aiResult.assignments.length 
    });
    
    res.json({ 
      message: 'AI task assignment completed',
      assignments: aiResult.assignments,
      criteria
    });
  } catch (err) {
    logger.error('AI assignment failed', { error: err.message });
    res.status(500).json({ message: 'AI assignment failed', error: err.message });
  }
});

// AI Schedule Optimization
router.post('/optimize-schedule', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { tasks, constraints, preferences } = req.body;
    
    logger.info('AI schedule optimization requested', { taskCount: tasks.length });
    
    // Use AI prioritization as basis for schedule
    const prioritized = await aiClient.prioritizeTasks(tasks);
    
    // Create optimized schedule based on priorities
    const optimizedSchedule = {
      tasks: prioritized.prioritized_tasks.map((task, index) => {
        const taskData = tasks.find(t => (t.id || t._id) === task.task_id);
        return {
          ...taskData,
          suggestedOrder: index + 1,
          priorityScore: task.priority_score,
          suggestedStartTime: new Date(Date.now() + (index * 3600000)), // Stagger by 1 hour
          suggestedDuration: taskData.estimatedHours || 4
        };
      }),
      totalEfficiency: 0.85,
      recommendations: [
        'Tasks ordered by AI-calculated priority',
        'High-priority tasks scheduled first',
        'Consider team member availability',
        'Include buffer time between tasks'
      ]
    };
    
    logger.info('Schedule optimization completed');
    
    res.json({
      message: 'Schedule optimization completed',
      optimizedSchedule
    });
  } catch (err) {
    logger.error('Schedule optimization failed', { error: err.message });
    res.status(500).json({ message: 'Schedule optimization failed', error: err.message });
  }
});

// AI Suggestions
router.get('/suggestions', authenticateJWT, async (req, res) => {
  try {
    const { userId, context } = req.query;
    const targetUserId = userId || req.user._id;
    
    logger.info('AI suggestions requested', { userId: targetUserId });
    
    // Get basic task data
    const userTasks = await Task.find({
      assignedTo: targetUserId,
      status: { $in: ['pending', 'in-progress'] }
    }).sort({ deadline: 1 });
    
    const overdueTasks = userTasks.filter(task => 
      task.deadline && new Date(task.deadline) < new Date()
    );
    
    const completedTasks = await Task.countDocuments({
      assignedTo: targetUserId,
      status: 'completed',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    const totalTasks = await Task.countDocuments({
      assignedTo: targetUserId,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    // Get AI-powered suggestions
    let aiSuggestions = [];
    try {
      const aiResult = await aiClient.getSuggestions(targetUserId, context);
      aiSuggestions = aiResult.suggestions || [];
    } catch (aiError) {
      logger.warn('AI suggestions unavailable, using fallback', { error: aiError.message });
    }
    
    // Combine with rule-based suggestions
    const suggestions = [...aiSuggestions];
    
    if (overdueTasks.length > 0) {
      suggestions.push({
        type: 'task_management',
        message: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}. Consider prioritizing them or requesting deadline extensions.`,
        priority: 'high',
        actionable: true,
        action: 'view_overdue_tasks'
      });
    }
    
    if (totalTasks > 0) {
      const completionRate = completedTasks / totalTasks;
      if (completionRate < 0.5) {
        suggestions.push({
          type: 'productivity',
          message: 'Your task completion rate is below 50% this week. Consider using time-blocking or the Pomodoro technique.',
          priority: 'medium',
          actionable: true,
          action: 'start_pomodoro'
        });
      } else if (completionRate > 0.8) {
        suggestions.push({
          type: 'productivity',
          message: 'Great job! Your completion rate is above 80%. Keep up the excellent work!',
          priority: 'low'
        });
      }
    }
    
    logger.info('AI suggestions retrieved', { suggestionCount: suggestions.length });
    
    res.json({
      message: 'AI suggestions retrieved',
      suggestions,
      context,
      stats: {
        totalTasks: userTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0
      }
    });
  } catch (err) {
    logger.error('Failed to get AI suggestions', { error: err.message });
    res.status(500).json({ message: 'Failed to get AI suggestions', error: err.message });
  }
});

// AI Performance Analysis
router.post('/analyze-performance', authenticateJWT, async (req, res) => {
  try {
    const { userId, timeframe, metrics } = req.body;
    const targetUserId = userId || req.user._id;
    
    logger.info('AI performance analysis requested', { userId: targetUserId, timeframe });
    
    // Get AI-powered performance analysis
    const aiAnalysis = await aiClient.analyzePerformance(targetUserId, timeframe, metrics);
    
    // Get performance score with burnout detection
    const performanceScore = await aiClient.getPerformanceScore(targetUserId);
    
    // Combine results
    const analysis = {
      ...aiAnalysis.analysis,
      performanceScore: performanceScore,
      burnoutRisk: performanceScore.burnout_risk || false,
      burnoutProbability: performanceScore.burnout_probability || 0
    };
    
    logger.info('Performance analysis completed', { userId: targetUserId });
    
    res.json({
      message: 'Performance analysis completed',
      analysis,
      timeframe
    });
  } catch (err) {
    logger.error('Performance analysis failed', { error: err.message });
    res.status(500).json({ message: 'Performance analysis failed', error: err.message });
  }
});

// Get AI Performance Score
router.get('/performance-score/:userId?', authenticateJWT, async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    
    logger.info('Performance score requested', { userId });
    
    const performanceScore = await aiClient.getPerformanceScore(userId);
    
    res.json({
      message: 'Performance score retrieved',
      performanceScore
    });
  } catch (err) {
    logger.error('Failed to get performance score', { error: err.message });
    res.status(500).json({ message: 'Failed to get performance score', error: err.message });
  }
});

// Get Weekly AI Report
router.get('/report/weekly', authenticateJWT, async (req, res) => {
  try {
    logger.info('Weekly AI report requested');
    
    const report = await aiClient.getWeeklyReport();
    
    res.json({
      message: 'Weekly report retrieved',
      report
    });
  } catch (err) {
    logger.error('Failed to get weekly report', { error: err.message });
    res.status(500).json({ message: 'Failed to get weekly report', error: err.message });
  }
});

// Prioritize Tasks
router.post('/prioritize', authenticateJWT, async (req, res) => {
  try {
    const { tasks } = req.body;
    
    logger.info('Task prioritization requested', { taskCount: tasks.length });
    
    const prioritized = await aiClient.prioritizeTasks(tasks);
    
    res.json({
      message: 'Tasks prioritized',
      prioritizedTasks: prioritized.prioritized_tasks
    });
  } catch (err) {
    logger.error('Task prioritization failed', { error: err.message });
    res.status(500).json({ message: 'Task prioritization failed', error: err.message });
  }
});

// Get Anomalies
router.get('/analytics/anomalies', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    logger.info('Anomalies requested');
    
    const anomalies = await aiClient.getAnomalies();
    
    res.json({
      message: 'Anomalies retrieved',
      anomalies
    });
  } catch (err) {
    logger.error('Failed to get anomalies', { error: err.message });
    res.status(500).json({ message: 'Failed to get anomalies', error: err.message });
  }
});

// Get Performance Trends
router.get('/analytics/trends', authenticateJWT, async (req, res) => {
  try {
    logger.info('Performance trends requested');
    
    const trends = await aiClient.getTrends();
    
    res.json({
      message: 'Trends retrieved',
      trends
    });
  } catch (err) {
    logger.error('Failed to get trends', { error: err.message });
    res.status(500).json({ message: 'Failed to get trends', error: err.message });
  }
});

// Train Models (Admin only)
router.post('/train-models', strictLimiter, authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    logger.info('Model training initiated by admin', { userId: req.user._id });
    
    const result = await aiClient.trainModels();
    
    res.json({
      message: 'Model training completed',
      result
    });
  } catch (err) {
    logger.error('Model training failed', { error: err.message });
    res.status(500).json({ message: 'Model training failed', error: err.message });
  }
});

// Get Model Drift Report (Admin only)
router.get('/monitoring/drift-report', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const report = await aiClient.getDriftReport();
    
    res.json({
      message: 'Drift report retrieved',
      report
    });
  } catch (err) {
    logger.error('Failed to get drift report', { error: err.message });
    res.status(500).json({ message: 'Failed to get drift report', error: err.message });
  }
});

// Get Model Performance (Admin only)
router.get('/monitoring/performance', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    const performance = await aiClient.getModelPerformance();
    
    res.json({
      message: 'Model performance retrieved',
      performance
    });
  } catch (err) {
    logger.error('Failed to get model performance', { error: err.message });
    res.status(500).json({ message: 'Failed to get model performance', error: err.message });
  }
});

// Health Check
router.get('/health', async (req, res) => {
  try {
    const health = await aiClient.healthCheck();
    
    res.json({
      message: 'AI service health check',
      health
    });
  } catch (err) {
    res.status(503).json({ 
      message: 'AI service unavailable', 
      error: err.message,
      healthy: false
    });
  }
});

module.exports = router;
