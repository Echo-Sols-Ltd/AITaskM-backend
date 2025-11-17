const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { validateTask, handleValidation } = require('../middleware/validate');
const { emitTaskUpdate, emitNotification, emitToUser, emitToTeam } = require('../socket');

// GET /api/tasks - Get all tasks with filtering and pagination
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      priority, 
      assignedTo, 
      project,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    // Apply filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (project) filter.project = project;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Role-based filtering
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      filter.$or = [
        { assignedTo: req.user._id },
        { createdBy: req.user._id },
        { isPublic: true }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email')
      .populate('project', 'name code')
      .populate('team', 'name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Task.countDocuments(filter);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
  }
});

// GET /api/tasks/:id - Get specific task by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email')
      .populate('project', 'name code description')
      .populate('team', 'name')
      .populate('dependencies')
      .populate('subtasks')
      .populate('comments.user', 'name avatar');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has access to this task
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (task.assignedTo.toString() !== req.user._id.toString() && 
          task.createdBy.toString() !== req.user._id.toString() && 
          !task.isPublic) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch task', error: err.message });
  }
});

// POST /api/tasks - Create new task
router.post('/', authenticateJWT, authorizeRoles('admin', 'manager', 'team_lead'), validateTask, handleValidation, async (req, res) => {
  try {
    const {
      title,
      description,
      assignedTo,
      project,
      team,
      priority = 'medium',
      deadline,
      estimatedHours,
      tags,
      dependencies,
      subtasks
    } = req.body;

    const task = new Task({
      title,
      description,
      assignedTo,
      assignedBy: req.user._id,
      project,
      team,
      priority,
      deadline,
      estimatedHours,
      tags,
      dependencies,
      subtasks,
      status: 'pending'
    });

    await task.save();

    // Populate references for response
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('project', 'name code');
    await task.populate('team', 'name');

    // Emit real-time updates
    if (assignedTo) {
      emitToUser(assignedTo, 'task-created', task);
      emitNotification(assignedTo, {
        title: 'New Task Assigned',
        message: `You have been assigned: ${title}`,
        type: 'info',
        actionUrl: `/tasks/${task._id}`
      });
    }
    if (team) {
      emitToTeam(team, 'task-created', task);
    }

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Task creation failed', error: err.message });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (task.assignedTo.toString() !== req.user._id.toString() && 
          task.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email avatar')
     .populate('project', 'name code')
     .populate('team', 'name');

    // Emit real-time updates
    emitTaskUpdate(updatedTask);
    if (updatedTask.assignedTo) {
      emitNotification(updatedTask.assignedTo._id, {
        title: 'Task Updated',
        message: `Task "${updatedTask.title}" has been updated`,
        type: 'info',
        actionUrl: `/tasks/${updatedTask._id}`
      });
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: 'Task update failed', error: err.message });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await Task.findByIdAndDelete(req.params.id);

    // Emit real-time update
    if (req.io) {
      req.io.to(`user-${task.assignedTo}`).emit('task-deleted', { taskId: req.params.id });
      if (task.team) req.io.to(`team-${task.team}`).emit('task-deleted', { taskId: req.params.id });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Task deletion failed', error: err.message });
  }
});

// PATCH /api/tasks/:id/status - Update task status
router.patch('/:id/status', authenticateJWT, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (task.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const oldStatus = task.status;
    task.status = status;
    
    if (notes) {
      task.comments.push({
        user: req.user._id,
        text: `Status changed from ${oldStatus} to ${status}: ${notes}`,
        type: 'status_change'
      });
    }

    // Update completion time if completed
    if (status === 'completed') {
      task.completedAt = new Date();
      task.completedBy = req.user._id;
    }

    await task.save();

    // Emit real-time update
    if (req.io) {
      req.io.to(`user-${task.assignedTo}`).emit('task-status-updated', { taskId: task._id, status });
      if (task.team) req.io.to(`team-${task.team}`).emit('task-status-updated', { taskId: task._id, status });
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Status update failed', error: err.message });
  }
});

// PATCH /api/tasks/:id/complete - Update task completion
router.patch('/:id/complete', authenticateJWT, async (req, res) => {
  try {
    const { progress, notes, blockers, files, status } = req.body;
    
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (task.assignedTo.toString() !== req.user._id.toString() && 
          task.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Update task fields
    const updateData = {};
    if (progress !== undefined) updateData.progress = progress;
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    
    // Handle blockers
    if (blockers && blockers.length > 0) {
      const newBlockers = blockers.map(blocker => ({
        description: blocker,
        reportedBy: req.user._id,
        reportedAt: new Date(),
        resolved: false
      }));
      updateData.blockers = [...(task.blockers || []), ...newBlockers];
    }
    
    // Handle file attachments
    if (files && files.length > 0) {
      const newAttachments = files.map(file => ({
        url: file.url,
        filename: file.filename,
        fileType: file.fileType,
        fileSize: file.fileSize,
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      }));
      updateData.attachments = [...(task.attachments || []), ...newAttachments];
    }
    
    // Update completion date if status is completed
    if (status === 'completed') {
      updateData.completedAt = new Date();
      updateData.completedBy = req.user._id;
      updateData.progress = 100;
    }
    
    updateData.updatedAt = new Date();

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email avatar')
     .populate('assignedBy', 'name email')
     .populate('project', 'name code')
     .populate('team', 'name');

    // Emit real-time update
    if (req.io) {
      req.io.to(`user-${updatedTask.assignedTo._id}`).emit('task-updated', updatedTask);
      if (updatedTask.team) req.io.to(`team-${updatedTask.team._id}`).emit('task-updated', updatedTask);
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: 'Task completion update failed', error: err.message });
  }
});

// PATCH /api/tasks/:id/progress - Update task progress
router.patch('/:id/progress', authenticateJWT, async (req, res) => {
  try {
    const { progress, notes } = req.body;
    
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (task.assignedTo.toString() !== req.user._id.toString() && 
          task.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const updateData = { progress, updatedAt: new Date() };
    if (notes) updateData.notes = notes;

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email avatar')
     .populate('assignedBy', 'name email')
     .populate('project', 'name code')
     .populate('team', 'name');

    // Emit real-time update
    if (req.io) {
      req.io.to(`user-${updatedTask.assignedTo._id}`).emit('task-progress-updated', updatedTask);
      if (updatedTask.team) req.io.to(`team-${updatedTask.team._id}`).emit('task-progress-updated', updatedTask);
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: 'Task progress update failed', error: err.message });
  }
});

// PATCH /api/tasks/:id/blockers - Add or resolve blockers
router.patch('/:id/blockers', authenticateJWT, async (req, res) => {
  try {
    const { action, blockerId, description, resolved } = req.body;
    
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (task.assignedTo.toString() !== req.user._id.toString() && 
          task.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    let updateData = { updatedAt: new Date() };

    if (action === 'add') {
      const newBlocker = {
        description,
        reportedBy: req.user._id,
        reportedAt: new Date(),
        resolved: false
      };
      updateData.blockers = [...(task.blockers || []), newBlocker];
    } else if (action === 'resolve' && blockerId) {
      const blockers = task.blockers || [];
      const blockerIndex = blockers.findIndex(b => b._id.toString() === blockerId);
      if (blockerIndex !== -1) {
        blockers[blockerIndex].resolved = resolved;
        blockers[blockerIndex].resolvedAt = resolved ? new Date() : null;
        blockers[blockerIndex].resolvedBy = resolved ? req.user._id : null;
        updateData.blockers = blockers;
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email avatar')
     .populate('assignedBy', 'name email')
     .populate('project', 'name code')
     .populate('team', 'name');

    // Emit real-time update
    if (req.io) {
      req.io.to(`user-${updatedTask.assignedTo._id}`).emit('task-blocker-updated', updatedTask);
      if (updatedTask.team) req.io.to(`team-${updatedTask.team._id}`).emit('task-blocker-updated', updatedTask);
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ message: 'Task blocker update failed', error: err.message });
  }
});

// POST /api/tasks/:id/notes - Add notes/comments to task
router.post('/:id/notes', authenticateJWT, async (req, res) => {
  try {
    const { text, type = 'comment' } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (task.assignedTo.toString() !== req.user._id.toString() && 
          task.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    task.comments.push({
      user: req.user._id,
      text,
      type
    });

    await task.save();

    // Emit real-time update
    if (req.io) {
      req.io.to(`user-${task.assignedTo}`).emit('task-note-added', { taskId: task._id, comment: task.comments[task.comments.length - 1] });
      if (task.team) req.io.to(`team-${task.team}`).emit('task-note-added', { taskId: task._id, comment: task.comments[task.comments.length - 1] });
    }

    res.json({ message: 'Note added successfully', comments: task.comments });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add note', error: err.message });
  }
});

// POST /api/tasks/:id/files - Add files to task
router.post('/:id/files', authenticateJWT, async (req, res) => {
  try {
    const { fileId, description } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (task.assignedTo.toString() !== req.user._id.toString() && 
          task.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    task.attachments.push({
      file: fileId,
      description,
      uploadedBy: req.user._id
    });

    await task.save();

    res.json({ message: 'File added successfully', attachments: task.attachments });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add file', error: err.message });
  }
});

// POST /api/tasks/:id/blockers - Add blockers to task
router.post('/:id/blockers', authenticateJWT, async (req, res) => {
  try {
    const { description, type, estimatedResolution } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (task.assignedTo.toString() !== req.user._id.toString() && 
          task.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    task.blockers.push({
      description,
      type,
      estimatedResolution,
      reportedBy: req.user._id,
      status: 'active'
    });

    await task.save();

    // Emit real-time update
    if (req.io) {
      req.io.to(`user-${task.assignedTo}`).emit('task-blocker-added', { taskId: task._id, blocker: task.blockers[task.blockers.length - 1] });
      if (task.team) req.io.to(`team-${task.team}`).emit('task-blocker-added', { taskId: task._id, blocker: task.blockers[task.blockers.length - 1] });
    }

    res.json({ message: 'Blocker added successfully', blockers: task.blockers });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add blocker', error: err.message });
  }
});

// GET /api/tasks/:id/history - Get task history
router.get('/:id/history', authenticateJWT, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      if (task.assignedTo.toString() !== req.user._id.toString() && 
          task.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const history = [
      {
        action: 'created',
        timestamp: task.createdAt,
        user: task.createdBy,
        details: 'Task created'
      },
      ...task.comments.map(comment => ({
        action: 'comment',
        timestamp: comment.timestamp,
        user: comment.user,
        details: comment.text
      })),
      ...task.attachments.map(attachment => ({
        action: 'file_added',
        timestamp: attachment.uploadedAt,
        user: attachment.uploadedBy,
        details: `File added: ${attachment.description}`
      }))
    ];

    if (task.completedAt) {
      history.push({
        action: 'completed',
        timestamp: task.completedAt,
        user: task.completedBy,
        details: 'Task completed'
      });
    }

    // Sort by timestamp
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({ history });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch task history', error: err.message });
  }
});

module.exports = router;