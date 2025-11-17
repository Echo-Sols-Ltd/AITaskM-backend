const express = require('express');
const router = express.Router();
const { authenticateJWT: auth } = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const KPI = require('../models/KPI');
const Goal = require('../models/Goal');
const ExportUtils = require('../utils/exportUtils');

/**
 * @route   POST /api/export/tasks
 * @desc    Export tasks data
 * @access  Private
 */
router.post('/tasks', auth, async (req, res) => {
  try {
    const { format = 'json', filters = {}, dateRange } = req.body;
    
    // Build query based on filters
    let query = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    if (filters.project) query.project = filters.project;
    if (filters.team) query.team = filters.team;
    
    if (dateRange) {
      query.createdAt = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }
    
    const tasks = await Task.find(query)
      .populate('assignedTo', 'firstName lastName email')
      .populate('project', 'name')
      .populate('team', 'name')
      .lean();
    
    let exportData;
    
    switch (format.toLowerCase()) {
      case 'csv':
        // Convert to CSV format
        const csvHeaders = 'Title,Description,Status,Priority,Assigned To,Project,Team,Deadline,Progress,Created At\n';
        const csvRows = tasks.map(task => 
          `"${task.title}","${task.description || ''}","${task.status}","${task.priority}","${task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : ''}","${task.project ? task.project.name : ''}","${task.team ? task.team.name : ''}","${task.deadline || ''}","${task.progress || 0}","${task.createdAt}"`
        ).join('\n');
        exportData = csvHeaders + csvRows;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=tasks-export.csv');
        break;
        
      case 'excel':
        // For Excel, we'll return JSON and let the frontend handle Excel generation
        exportData = { tasks, format: 'excel' };
        res.setHeader('Content-Type', 'application/json');
        break;
        
      default: // json
        exportData = { tasks, format: 'json' };
        res.setHeader('Content-Type', 'application/json');
    }
    
    res.send(exportData);
  } catch (error) {
    console.error('Export tasks error:', error);
    res.status(500).json({ message: 'Error exporting tasks', error: error.message });
  }
});

/**
 * @route   POST /api/export/users
 * @desc    Export users data
 * @access  Private (Admin only)
 */
router.post('/users', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    
    const { format = 'json', filters = {}, dateRange } = req.body;
    
    let query = {};
    
    if (filters.role) query.role = filters.role;
    if (filters.department) query.department = filters.department;
    if (filters.status) query.status = filters.status;
    
    if (dateRange) {
      query.createdAt = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }
    
    const users = await User.find(query)
      .select('-password')
      .populate('department', 'name')
      .populate('team', 'name')
      .lean();
    
    let exportData;
    
    switch (format.toLowerCase()) {
      case 'csv':
        const csvHeaders = 'First Name,Last Name,Email,Role,Department,Team,Status,Created At\n';
        const csvRows = users.map(user => 
          `"${user.firstName}","${user.lastName}","${user.email}","${user.role}","${user.department ? user.department.name : ''}","${user.team ? user.team.name : ''}","${user.status}","${user.createdAt}"`
        ).join('\n');
        exportData = csvHeaders + csvRows;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
        break;
        
      case 'excel':
        exportData = { users, format: 'excel' };
        res.setHeader('Content-Type', 'application/json');
        break;
        
      default:
        exportData = { users, format: 'json' };
        res.setHeader('Content-Type', 'application/json');
    }
    
    res.send(exportData);
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({ message: 'Error exporting users', error: error.message });
  }
});

/**
 * @route   POST /api/export/analytics
 * @desc    Export analytics data
 * @access  Private
 */
router.post('/analytics', auth, async (req, res) => {
  try {
    const { format = 'json', type, dateRange, userId, teamId } = req.body;
    
    let analyticsData = {};
    
    // Get different types of analytics data
    if (type === 'productivity' || !type) {
      const productivityQuery = {};
      if (userId) productivityQuery.userId = userId;
      if (teamId) productivityQuery.teamId = teamId;
      if (dateRange) {
        productivityQuery.date = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end)
        };
      }
      
      // Aggregate productivity data
      const productivityData = await Task.aggregate([
        { $match: productivityQuery },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              status: "$status"
            },
            count: { $sum: 1 },
            totalProgress: { $sum: "$progress" },
            avgProgress: { $avg: "$progress" }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]);
      
      analyticsData.productivity = productivityData;
    }
    
    if (type === 'performance' || !type) {
      // Performance metrics
      const performanceQuery = {};
      if (userId) performanceQuery.userId = userId;
      if (teamId) performanceQuery.teamId = teamId;
      
      const performanceData = await Task.aggregate([
        { $match: performanceQuery },
        {
          $group: {
            _id: "$assignedTo",
            totalTasks: { $sum: 1 },
            completedTasks: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            avgQuality: { $avg: "$quality" },
            totalHours: { $sum: "$actualHours" }
          }
        }
      ]);
      
      analyticsData.performance = performanceData;
    }
    
    let exportData;
    
    switch (format.toLowerCase()) {
      case 'csv':
        // Create CSV for analytics data
        let csvContent = '';
        if (analyticsData.productivity) {
          csvContent += 'Date,Status,Count,Total Progress,Average Progress\n';
          analyticsData.productivity.forEach(item => {
            csvContent += `${item._id.date},${item._id.status},${item.count},${item.totalProgress},${item.avgProgress.toFixed(2)}\n`;
          });
        }
        exportData = csvContent;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=analytics-export.csv');
        break;
        
      case 'excel':
        exportData = { analytics: analyticsData, format: 'excel' };
        res.setHeader('Content-Type', 'application/json');
        break;
        
      default:
        exportData = { analytics: analyticsData, format: 'json' };
        res.setHeader('Content-Type', 'application/json');
    }
    
    res.send(exportData);
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ message: 'Error exporting analytics', error: error.message });
  }
});

/**
 * @route   POST /api/export/custom
 * @desc    Custom export with user-defined parameters
 * @access  Private
 */
router.post('/custom', auth, async (req, res) => {
  try {
    const { 
      collections, 
      format = 'json', 
      filters = {}, 
      dateRange, 
      fields = [], 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      limit = 1000
    } = req.body;
    
    if (!collections || !Array.isArray(collections)) {
      return res.status(400).json({ message: 'Collections array is required' });
    }
    
    const exportData = {};
    
    for (const collectionName of collections) {
      let Model;
      let defaultFields = [];
      
      switch (collectionName) {
        case 'tasks':
          Model = Task;
          defaultFields = ['title', 'description', 'status', 'priority', 'assignedTo', 'deadline', 'progress', 'createdAt'];
          break;
        case 'users':
          Model = User;
          defaultFields = ['firstName', 'lastName', 'email', 'role', 'department', 'status', 'createdAt'];
          break;
        case 'kpis':
          Model = KPI;
          defaultFields = ['name', 'value', 'target', 'unit', 'period', 'createdAt'];
          break;
        case 'goals':
          Model = Goal;
          defaultFields = ['title', 'description', 'target', 'current', 'deadline', 'status', 'createdAt'];
          break;
        default:
          continue; // Skip unknown collections
      }
      
      // Build query
      let query = {};
      if (filters[collectionName]) {
        Object.assign(query, filters[collectionName]);
      }
      
      if (dateRange) {
        query.createdAt = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end)
        };
      }
      
      // Select fields
      const selectFields = fields.length > 0 ? fields.join(' ') : defaultFields.join(' ');
      
      // Get data
      const data = await Model.find(query)
        .select(selectFields)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(limit)
        .lean();
      
      exportData[collectionName] = data;
    }
    
    let result;
    
    switch (format.toLowerCase()) {
      case 'csv':
        // For CSV, we'll return a structured format that can be processed
        result = { data: exportData, format: 'csv', instructions: 'Process collections separately for CSV export' };
        res.setHeader('Content-Type', 'application/json');
        break;
        
      case 'excel':
        result = { data: exportData, format: 'excel' };
        res.setHeader('Content-Type', 'application/json');
        break;
        
      default:
        result = { data: exportData, format: 'json' };
        res.setHeader('Content-Type', 'application/json');
    }
    
    res.json(result);
  } catch (error) {
    console.error('Custom export error:', error);
    res.status(500).json({ message: 'Error in custom export', error: error.message });
  }
});

module.exports = router; 

// Ex
port analytics report
router.post('/analytics', auth, async (req, res) => {
  try {
    const { format = 'pdf', startDate, endDate } = req.body;
    
    // Fetch analytics data
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const totalTasks = await Task.countDocuments(filter);
    const completedTasks = await Task.countDocuments({ ...filter, status: 'completed' });
    const inProgressTasks = await Task.countDocuments({ ...filter, status: 'in-progress' });
    const pendingTasks = await Task.countDocuments({ ...filter, status: 'pending' });
    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

    const overview = {
      'Total Tasks': totalTasks,
      'Completed Tasks': completedTasks,
      'In Progress': inProgressTasks,
      'Pending Tasks': pendingTasks,
      'Completion Rate': `${completionRate}%`
    };

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .lean();

    const formattedTasks = ExportUtils.formatTasksForExport(tasks);

    let buffer;
    let contentType;
    let filename;

    switch (format.toLowerCase()) {
      case 'pdf':
        buffer = await ExportUtils.exportToPDF(formattedTasks, {
          title: 'Analytics Report',
          overview
        });
        contentType = 'application/pdf';
        filename = `analytics_report_${Date.now()}.pdf`;
        break;

      case 'excel':
        buffer = await ExportUtils.exportToExcel(formattedTasks, {
          title: 'Analytics Report',
          sheetName: 'Analytics'
        });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `analytics_report_${Date.now()}.xlsx`;
        break;

      case 'csv':
        buffer = await ExportUtils.exportToCSV(formattedTasks);
        contentType = 'text/csv';
        filename = `analytics_report_${Date.now()}.csv`;
        break;

      default:
        return res.status(400).json({ message: 'Invalid format' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
});

// Export tasks report
router.post('/tasks-report', auth, async (req, res) => {
  try {
    const { format = 'pdf', filters = {} } = req.body;
    
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('project', 'name')
      .lean();

    const formattedTasks = ExportUtils.formatTasksForExport(tasks);

    let buffer;
    let contentType;
    let filename;

    switch (format.toLowerCase()) {
      case 'pdf':
        buffer = await ExportUtils.exportToPDF(formattedTasks, {
          title: 'Tasks Report'
        });
        contentType = 'application/pdf';
        filename = `tasks_report_${Date.now()}.pdf`;
        break;

      case 'excel':
        buffer = await ExportUtils.exportToExcel(formattedTasks, {
          title: 'Tasks Report',
          sheetName: 'Tasks'
        });
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `tasks_report_${Date.now()}.xlsx`;
        break;

      case 'csv':
        buffer = await ExportUtils.exportToCSV(formattedTasks);
        contentType = 'text/csv';
        filename = `tasks_report_${Date.now()}.csv`;
        break;

      default:
        return res.status(400).json({ message: 'Invalid format' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Export failed', error: error.message });
  }
});
