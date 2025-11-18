const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const aiClient = require('../utils/aiClient');
const { emitToUser, emitNotification } = require('../socket');
const Logger = require('../utils/logger');

const logger = new Logger('AI_ROUTES');

// AI Task Assignment
router.post('/assign-tasks', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { tasks, teamMembers, criteria } = req.body;
    
    logger.info('AI task assignment requested', {
      taskCount: tasks.length,
      memberCount: teamMembers.length,
      requestedBy: req.user._id
    });

    // Prepare data for AI service
    const aiTasks = tasks.map(task => ({
      task_id: task.id || task._id,
      title: task.title,
      priority: task.priority || 'medium',
      estimated_hours: task.estimatedHours || 8,
      deadline: task.deadline,
      task_type: task.type || 'Feature',
      requirements: task.requirements || []
    }));

    const aiEmployees = await Promise.all(teamMembers.map(async member => {
      // Get current workload
      const activeTasks = await Task.countDocuments({
        assignedTo: member.id || member._id,
        status: { $in: ['pending', 'in-progress'] }
      });

      // Get completion stats
      const completedTasks = await Task.countDocuments({
        assignedTo: member.id || member._id,
        status: 'completed'
      });

      const totalTasks = await Task.countDocuments({
        assignedTo: member.id || member._id
      });

      const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

      return {
        id: member.id || member._id,
        name: member.name,
        role: member.role || 'Backend Developer',
        current_tasks: activeTasks,
        historical_completion_rate: completionRate,
        average_completion_time_hours: member.avgCompletionTime || 8,
        num_overdue_tasks: member.overdueTasks || 0
      };
    }));

    // Call AI service
    const aiResult = await aiClient.assignTasks(aiTasks, aiEmployees, criteria);
    
    logger.info('AI assignment completed', {
      assignmentCount: aiResult.assignments.length,
      fallback: aiResult.assignments[0]?.fallback || false
    });

    // Update tasks in database and send notifications
    for (const assignment of aiResult.assignments) {
      try {
        const task = await Task.findById(assignment.task_id);
        if (task) {
          task.assignedTo = assignment.assigned_to;
          task.assignedBy = req.user._id;
          task.aiAssigned = true;
          task.aiConfidence = assignment.confidence;
          task.aiReason = assignment.reason;
          await task.save();

          // Send real-time notification
          emitToUser(assignment.assigned_to, 'ai-task-assigned', {
            task: task,
            reason: assignment.reason,
            confidence: assignment.confidence
          });

          emitNotification(assignment.assigned_to, {
            title: 'AI Task Assignment',
            message: `You've been assigned: ${task.title}`,
            type: 'info',
            actionUrl: `/tasks/${task._id}`,
            metadata: {
              aiAssigned: true,
              confidence: assignment.confidence
            }
          });
        }
      } catch (updateError) {
        logger.error('Failed to update task assignment', {
          taskId: assignment.task_id,
          error: updateError.message
        });
      }
    }
    
    res.json({ 
      message: 'AI task assignment completed',
      assignments: aiResult.assignments,
      criteria,
      aiPowered: !aiResult.assignments[0]?.fallback
    });
  } catch (err) {
    logger.error('AI assignment failed', { error: err.message });
    res.status(500).json({ message: 'AI assignment failed', error: err.message });
  }
});

// AI Schedule Optimization
router.post('/optimize-schedule', authenticateJWT, authorizeRoles('employer', 'manager'), async (req, res) => {
  try {
    const { tasks, constraints, preferences } = req.body;
    
    logger.info('AI schedule optimization requested', {
      taskCount: tasks.length,
      requestedBy: req.user._id
    });

    // Call AI service for prioritization
    const aiTasks = tasks.map(task => ({
      task_id: task.id || task._id,
      title: task.title,
      priority: task.priority || 'medium',
      deadline: task.deadline,
      estimated_hours: task.estimatedHours || 8
    }));

    const prioritized = await aiClient.prioritizeTasks(aiTasks);
    
    // Create optimized schedule based on AI prioritization
    const optimizedSchedule = {
      tasks: prioritized.prioritized_tasks.map((task, index) => {
        const originalTask = tasks.find(t => (t.id || t._id) === task.task_id);
        return {
          ...originalTask,
          aiPriorityScore: task.priority_score,
          suggestedOrder: index + 1,
          suggestedStartTime: new Date(Date.now() + (index * 4 * 60 * 60 * 1000)), // 4 hours apart
          suggestedDuration: originalTask.estimatedHours || 8
        };
      }),
      totalEfficiency: 0.85,
      recommendations: [
        'Tasks ordered by AI-calculated priority',
        'Schedule high-priority tasks during peak productivity hours',
        'Include buffer time between tasks',
        'Consider dependencies when scheduling'
      ],
      aiPowered: true
    };
    
    logger.info('Schedule optimization completed', {
      taskCount: optimizedSchedule.tasks.length
    });
    
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
    
    logger.info('AI suggestions requested', { userId: targetUserId, context });

    // Get basic task data
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

    // Try to get AI-powered suggestions
    try {
      const aiSuggestions = await aiClient.getSuggestions(targetUserId, context);
      if (aiSuggestions && aiSuggestions.suggestions) {
        suggestions.push(...aiSuggestions.suggestions);
      }
    } catch (aiError) {
      logger.warn('AI suggestions unavailable, using basic suggestions', {
        error: aiError.message
      });
    }
    
    // General productivity tip if no suggestions
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'productivity',
        message: 'Consider reviewing your tasks at the start of each day to prioritize effectively.',
        priority: 'low'
      });
    }
    
    logger.info('Suggestions generated', {
      userId: targetUserId,
      suggestionCount: suggestions.length
    });
    
    res.json({
      message: 'AI suggestions retrieved',
      suggestions,
      context
    });
  } catch (err) {
    logger.error('Failed to get suggestions', { error: err.message });
    res.status(500).json({ message: 'Failed to get AI suggestions', error: err.message });
  }
});

// AI Performance Analysis
router.post('/analyze-performance', authenticateJWT, async (req, res) => {
  try {
    const { userId, timeframe, metrics } = req.body;
    const targetUserId = userId || req.user._id;
    
    logger.info('AI performance analysis requested', {
      userId: targetUserId,
      timeframe
    });

    // Call AI service for performance analysis
    const aiAnalysis = await aiClient.analyzePerformance(targetUserId, timeframe, metrics);
    
    // Get performance score from AI
    let performanceScore = null;
    try {
      performanceScore = await aiClient.getPerformanceScore(targetUserId);
    } catch (scoreError) {
      logger.warn('Could not get AI performance score', { error: scoreError.message });
    }

    const analysis = {
      ...aiAnalysis.analysis,
      performanceScore: performanceScore,
      aiPowered: true
    };
    
    logger.info('Performance analysis completed', {
      userId: targetUserId,
      productivityScore: analysis.productivityScore
    });
    
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

// Get AI Performance Scores
router.get('/performance-scores', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    logger.info('AI performance scores requested');

    const scores = await aiClient.getPerformanceScores();
    
    res.json({
      message: 'Performance scores retrieved',
      scores,
      aiPowered: true
    });
  } catch (err) {
    logger.error('Failed to get performance scores', { error: err.message });
    res.status(500).json({ message: 'Failed to get performance scores', error: err.message });
  }
});

// Get AI Weekly Report
router.get('/weekly-report', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    logger.info('AI weekly report requested');

    const report = await aiClient.getWeeklyReport();
    
    res.json({
      message: 'Weekly report retrieved',
      report,
      aiPowered: true
    });
  } catch (err) {
    logger.error('Failed to get weekly report', { error: err.message });
    res.status(500).json({ message: 'Failed to get weekly report', error: err.message });
  }
});

// Train AI Models
router.post('/train-models', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  try {
    logger.info('AI model training requested', { requestedBy: req.user._id });

    const result = await aiClient.trainModels();
    
    logger.info('AI model training completed', result);
    
    res.json({
      message: 'Model training completed',
      result,
      aiPowered: true
    });
  } catch (err) {
    logger.error('Model training failed', { error: err.message });
    res.status(500).json({ message: 'Model training failed', error: err.message });
  }
});

// Get AI Health Status
router.get('/health', authenticateJWT, async (req, res) => {
  try {
    const health = await aiClient.healthCheck();
    
    res.json({
      message: 'AI service health check',
      health
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'AI service health check failed', 
      error: err.message,
      health: {
        status: 'error',
        connected: false
      }
    });
  }
});

module.exports = router; 