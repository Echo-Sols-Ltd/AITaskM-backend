const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const Team = require('../models/Team');

// Get task reports
router.get('/tasks', authenticateJWT, async (req, res) => {
  try {
    const { userId, timeframe, status, priority } = req.query;
    
    // Build query based on parameters
    let query = {};
    
    if (userId && userId !== 'all') {
      query.assignedTo = userId;
    } else {
      query.assignedTo = req.user._id;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    
    // Add timeframe filter
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    query.createdAt = { $gte: startDate };
    
    // Get tasks for the query
    const tasks = await Task.find(query).lean();
    
    // Calculate summary
    const totalTasks = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const inProgress = tasks.filter(task => task.status === 'inProgress').length;
    const pending = tasks.filter(task => task.status === 'pending').length;
    const overdue = tasks.filter(task => 
      task.deadline && new Date(task.deadline) < now && task.status !== 'completed'
    ).length;
    
    // Calculate breakdown by priority
    const byPriority = {
      high: tasks.filter(task => task.priority === 'high').length,
      medium: tasks.filter(task => task.priority === 'medium').length,
      low: tasks.filter(task => task.priority === 'low').length
    };
    
    // Calculate breakdown by status
    const byStatus = {
      completed,
      inProgress,
      pending,
      overdue
    };
    
    const taskReport = {
      userId: userId || req.user._id,
      timeframe: timeframe || 'month',
      status: status || 'all',
      priority: priority || 'all',
      summary: {
        totalTasks,
        completed,
        inProgress,
        pending,
        overdue
      },
      breakdown: {
        byPriority,
        byStatus
      }
    };
    
    res.json({
      message: 'Task report generated successfully',
      report: taskReport
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate task report', error: err.message });
  }
});

// Get productivity reports
router.get('/productivity', authenticateJWT, async (req, res) => {
  try {
    const { userId, timeframe, metrics } = req.query;
    
    // Build query based on parameters
    let query = {};
    
    if (userId && userId !== 'all') {
      query.assignedTo = userId;
    } else {
      query.assignedTo = req.user._id;
    }
    
    // Add timeframe filter
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    query.createdAt = { $gte: startDate };
    
    // Get tasks for productivity calculation
    const tasks = await Task.find(query).lean();
    
    if (tasks.length === 0) {
      return res.json({
        message: 'Productivity report generated successfully',
        report: {
          userId: userId || req.user._id,
          timeframe: timeframe || 'month',
          metrics: metrics || 'all',
          productivityScore: 0,
          efficiency: 0,
          quality: 0,
          trends: { weekly: [], monthly: [] },
          recommendations: ['No tasks found for the specified timeframe']
        }
      });
    }
    
    // Calculate productivity metrics
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const totalProgress = tasks.reduce((sum, task) => sum + (task.progress || 0), 0);
    const avgProgress = totalProgress / tasks.length;
    
    // Calculate productivity score (0-100)
    const completionRate = completedTasks.length / tasks.length;
    const progressRate = avgProgress / 100;
    const productivityScore = Math.round((completionRate * 0.6 + progressRate * 0.4) * 100);
    
    // Calculate efficiency (based on estimated vs actual hours)
    let efficiency = 100;
    if (completedTasks.length > 0) {
      const estimatedHours = completedTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
      const actualHours = completedTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
      
      if (estimatedHours > 0 && actualHours > 0) {
        efficiency = Math.round((estimatedHours / actualHours) * 100);
        efficiency = Math.min(Math.max(efficiency, 0), 100); // Clamp between 0-100
      }
    }
    
    // Calculate quality (based on completion rate and progress)
    const quality = Math.round((completionRate * 0.7 + progressRate * 0.3) * 100);
    
    // Generate weekly trends (last 7 weeks)
    const weeklyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const weekTasks = tasks.filter(task => 
        new Date(task.createdAt) >= weekStart && new Date(task.createdAt) < weekEnd
      );
      
      if (weekTasks.length > 0) {
        const weekProgress = weekTasks.reduce((sum, task) => sum + (task.progress || 0), 0) / weekTasks.length;
        weeklyTrends.push(Math.round(weekProgress));
      } else {
        weeklyTrends.push(0);
      }
    }
    
    // Generate monthly trends (last 12 months)
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthTasks = tasks.filter(task => 
        new Date(task.createdAt) >= monthStart && new Date(task.createdAt) <= monthEnd
      );
      
      if (monthTasks.length > 0) {
        const monthProgress = monthTasks.reduce((sum, task) => sum + (task.progress || 0), 0) / monthTasks.length;
        monthlyTrends.push(Math.round(monthProgress));
      } else {
        monthlyTrends.push(0);
      }
    }
    
    // Generate recommendations
    const recommendations = [];
    if (productivityScore < 50) {
      recommendations.push('Focus on completing high-priority tasks first');
      recommendations.push('Break down large tasks into smaller, manageable pieces');
    }
    if (efficiency < 80) {
      recommendations.push('Review task estimates and improve time management');
      recommendations.push('Consider using time tracking tools');
    }
    if (quality < 70) {
      recommendations.push('Focus on task quality over quantity');
      recommendations.push('Implement review processes for completed tasks');
    }
    if (recommendations.length === 0) {
      recommendations.push('Maintain current productivity levels');
      recommendations.push('Consider taking on more challenging tasks');
    }
    
    const productivityReport = {
      userId: userId || req.user._id,
      timeframe: timeframe || 'month',
      metrics: metrics || 'all',
      productivityScore,
      efficiency,
      quality,
      trends: {
        weekly: weeklyTrends,
        monthly: monthlyTrends
      },
      recommendations
    };
    
    res.json({
      message: 'Productivity report generated successfully',
      report: productivityReport
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate productivity report', error: err.message });
  }
});

// Get team reports
router.get('/team', authenticateJWT, async (req, res) => {
  try {
    const { teamId, timeframe, reportType } = req.query;
    
    if (!teamId) {
      return res.status(400).json({ message: 'Team ID is required' });
    }
    
    // Verify team exists and user has access
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if user is a member of the team or has admin access
    if (!team.members.includes(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied to team data' });
    }
    
    // Add timeframe filter
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get team tasks
    const teamTasks = await Task.find({
      team: teamId,
      createdAt: { $gte: startDate }
    }).populate('assignedTo', 'firstName lastName').lean();
    
    // Get team members
    const teamMembers = await User.find({ _id: { $in: team.members } })
      .select('firstName lastName email role')
      .lean();
    
    // Calculate team performance metrics
    const totalTasks = teamTasks.length;
    const completedTasks = teamTasks.filter(task => task.status === 'completed');
    const completionRate = totalTasks > 0 ? completedTasks.length / totalTasks : 0;
    
    // Calculate overall team score
    const overallScore = Math.round(completionRate * 100);
    const productivity = Math.round(completionRate * 100);
    
    // Calculate collaboration score (based on shared tasks and team size)
    const collaboration = Math.round(Math.min(teamMembers.length * 10, 100));
    
    // Calculate quality score (based on task completion and progress)
    const avgProgress = teamTasks.length > 0 
      ? teamTasks.reduce((sum, task) => sum + (task.progress || 0), 0) / teamTasks.length
      : 0;
    const quality = Math.round(avgProgress);
    
    // Calculate member performance
    const memberPerformance = teamMembers.map(member => {
      const memberTasks = teamTasks.filter(task => 
        task.assignedTo && task.assignedTo._id.toString() === member._id.toString()
      );
      
      const completed = memberTasks.filter(task => task.status === 'completed').length;
      const score = memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0;
      
      return {
        userId: member._id.toString(),
        name: `${member.firstName} ${member.lastName}`,
        score,
        tasksCompleted: completed
      };
    });
    
    // Generate insights
    const insights = [];
    if (overallScore < 60) {
      insights.push('Team performance needs improvement - consider team training or process review');
    } else if (overallScore < 80) {
      insights.push('Team is performing well with room for improvement');
    } else {
      insights.push('Team is performing excellently - maintain current standards');
    }
    
    if (collaboration < 50) {
      insights.push('Consider cross-training opportunities to improve collaboration');
    }
    
    if (quality < 70) {
      insights.push('Focus on quality metrics and task completion standards');
    }
    
    if (insights.length === 0) {
      insights.push('Team is performing well across all metrics');
      insights.push('Continue current practices and processes');
    }
    
    const teamReport = {
      teamId,
      timeframe: timeframe || 'month',
      reportType: reportType || 'overview',
      teamPerformance: {
        overallScore,
        productivity,
        collaboration,
        quality
      },
      memberPerformance,
      insights
    };
    
    res.json({
      message: 'Team report generated successfully',
      report: teamReport
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate team report', error: err.message });
  }
});

// Get performance reports
router.get('/performance', authenticateJWT, async (req, res) => {
  try {
    const { userId, timeframe, comparison } = req.query;
    
    // Build query based on parameters
    let query = {};
    
    if (userId && userId !== 'all') {
      query.assignedTo = userId;
    } else {
      query.assignedTo = req.user._id;
    }
    
    // Add timeframe filter
    const now = new Date();
    let startDate;
    let previousStartDate;
    
    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get current period tasks
    const currentTasks = await Task.find({
      ...query,
      createdAt: { $gte: startDate }
    }).lean();
    
    // Get previous period tasks
    const previousTasks = await Task.find({
      ...query,
      createdAt: { $gte: previousStartDate, $lt: startDate }
    }).lean();
    
    // Calculate current performance
    const currentCompleted = currentTasks.filter(task => task.status === 'completed').length;
    const currentScore = currentTasks.length > 0 ? Math.round((currentCompleted / currentTasks.length) * 100) : 0;
    
    // Calculate previous performance
    const previousCompleted = previousTasks.filter(task => task.status === 'completed').length;
    const previousScore = previousTasks.length > 0 ? Math.round((previousCompleted / previousTasks.length) * 100) : 0;
    
    // Calculate improvement
    const scoreImprovement = currentScore - previousScore;
    const rankImprovement = 0; // Would need ranking system to calculate
    const percentileImprovement = 0; // Would need percentile calculation
    
    // Calculate performance breakdown
    const currentAvgProgress = currentTasks.length > 0 
      ? currentTasks.reduce((sum, task) => sum + (task.progress || 0), 0) / currentTasks.length
      : 0;
    
    const productivity = Math.round(currentAvgProgress);
    const efficiency = Math.round((currentCompleted / Math.max(currentTasks.length, 1)) * 100);
    const quality = Math.round(currentAvgProgress);
    const collaboration = 85; // Placeholder - would need collaboration metrics
    
    const performanceReport = {
      userId: userId || req.user._id,
      timeframe: timeframe || 'month',
      comparison: comparison || 'previous_period',
      currentPerformance: {
        score: currentScore,
        rank: 0, // Would need ranking system
        percentile: 0 // Would need percentile calculation
      },
      previousPerformance: {
        score: previousScore,
        rank: 0, // Would need ranking system
        percentile: 0 // Would need percentile calculation
      },
      improvement: {
        score: scoreImprovement,
        rank: rankImprovement,
        percentile: percentileImprovement
      },
      breakdown: {
        productivity,
        efficiency,
        quality,
        collaboration
      }
    };
    
    res.json({
      message: 'Performance report generated successfully',
      report: performanceReport
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate performance report', error: err.message });
  }
});

// Export reports
router.post('/export', authenticateJWT, async (req, res) => {
  try {
    const { reportType, format, parameters, timeframe } = req.body;
    
    if (!reportType) {
      return res.status(400).json({ message: 'Report type is required' });
    }
    
    // Create export job
    const exportJob = {
      id: Date.now().toString(),
      reportType,
      format: format || 'pdf',
      parameters: parameters || {},
      timeframe: timeframe || 'month',
      status: 'processing',
      requestedBy: req.user._id,
      requestedAt: new Date().toISOString(),
      downloadUrl: `/api/reports/download/${Date.now()}`
    };
    
    // In a real implementation, this would be queued for background processing
    // For now, we'll simulate immediate completion
    setTimeout(() => {
      exportJob.status = 'completed';
    }, 1000);
    
    res.json({
      message: 'Report export initiated successfully',
      exportJob
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to initiate report export', error: err.message });
  }
});

// Export tasks
router.get('/export/tasks', authenticateJWT, async (req, res) => {
  try {
    const { format, filters, timeframe } = req.query;
    
    // Build query based on filters
    let query = {};
    
    if (filters) {
      if (filters.status) query.status = filters.status;
      if (filters.priority) query.priority = filters.priority;
      if (filters.assignedTo) query.assignedTo = filters.assignedTo;
      if (filters.project) query.project = filters.project;
      if (filters.team) query.team = filters.team;
    }
    
    // Add timeframe filter
    if (timeframe) {
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // month
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      query.createdAt = { $gte: startDate };
    }
    
    // Get tasks
    const tasks = await Task.find(query)
      .populate('assignedTo', 'firstName lastName email')
      .populate('project', 'name')
      .populate('team', 'name')
      .lean();
    
    const taskExport = {
      format: format || 'csv',
      filters: filters || 'all',
      timeframe: timeframe || 'month',
      status: 'ready',
      downloadUrl: `/api/reports/download/tasks/${Date.now()}`,
      recordCount: tasks.length,
      generatedAt: new Date().toISOString()
    };
    
    res.json({
      message: 'Task export ready for download',
      export: taskExport
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to export tasks', error: err.message });
  }
});

// Export users
router.get('/export/users', authenticateJWT, authorizeRoles('employer', 'admin'), async (req, res) => {
  try {
    const { format, department, role } = req.query;
    
    // Build query
    let query = {};
    
    if (department && department !== 'all') query.department = department;
    if (role && role !== 'all') query.role = role;
    
    // Get users
    const users = await User.find(query)
      .select('-password')
      .populate('department', 'name')
      .populate('team', 'name')
      .lean();
    
    const userExport = {
      format: format || 'csv',
      department: department || 'all',
      role: role || 'all',
      status: 'ready',
      downloadUrl: `/api/reports/download/users/${Date.now()}`,
      recordCount: users.length,
      generatedAt: new Date().toISOString()
    };
    
    res.json({
      message: 'User export ready for download',
      export: userExport
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to export users', error: err.message });
  }
});

// Export analytics
router.get('/export/analytics', authenticateJWT, async (req, res) => {
  try {
    const { format, metrics, timeframe } = req.query;
    
    // Build query
    let query = {};
    
    if (timeframe) {
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // month
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      query.createdAt = { $gte: startDate };
    }
    
    // Get analytics data
    const tasks = await Task.find(query).lean();
    
    // Calculate analytics
    const analyticsData = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(task => task.status === 'completed').length,
      avgProgress: tasks.length > 0 
        ? tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / tasks.length
        : 0,
      priorityDistribution: {
        high: tasks.filter(task => task.priority === 'high').length,
        medium: tasks.filter(task => task.priority === 'medium').length,
        low: tasks.filter(task => task.priority === 'low').length
      }
    };
    
    const analyticsExport = {
      format: format || 'excel',
      metrics: metrics || 'all',
      timeframe: timeframe || 'month',
      status: 'ready',
      downloadUrl: `/api/reports/download/analytics/${Date.now()}`,
      recordCount: tasks.length,
      generatedAt: new Date().toISOString()
    };
    
    res.json({
      message: 'Analytics export ready for download',
      export: analyticsExport
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to export analytics', error: err.message });
  }
});

// Custom export
router.post('/export/custom', authenticateJWT, async (req, res) => {
  try {
    const { dataType, filters, format, columns, timeframe } = req.body;
    
    if (!dataType) {
      return res.status(400).json({ message: 'Data type is required' });
    }
    
    // Build query
    let query = {};
    
    if (filters) {
      Object.assign(query, filters);
    }
    
    // Add timeframe filter
    if (timeframe) {
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default: // month
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      query.createdAt = { $gte: startDate };
    }
    
    // Get data based on type
    let data;
    let estimatedRecords = 0;
    
    switch (dataType) {
      case 'tasks':
        data = await Task.find(query).lean();
        estimatedRecords = data.length;
        break;
      case 'users':
        data = await User.find(query).select('-password').lean();
        estimatedRecords = data.length;
        break;
      default:
        return res.status(400).json({ message: 'Invalid data type' });
    }
    
    const customExport = {
      id: Date.now().toString(),
      dataType,
      filters,
      format: format || 'csv',
      columns: columns || 'all',
      timeframe: timeframe || 'month',
      status: 'processing',
      requestedBy: req.user._id,
      requestedAt: new Date().toISOString(),
      estimatedRecords,
      downloadUrl: `/api/reports/download/custom/${Date.now()}`
    };
    
    res.json({
      message: 'Custom export initiated successfully',
      export: customExport
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to initiate custom export', error: err.message });
  }
});

module.exports = router; 