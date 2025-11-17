const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Get all projects
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { status, priority, manager, search } = req.query;
    
    let query = { isActive: true };
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by priority
    if (priority) {
      query.priority = priority;
    }
    
    // Filter by manager
    if (manager) {
      query.manager = manager;
    }
    
    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const projects = await Project.find(query)
      .populate('manager', 'name email')
      .populate('team', 'name')
      .populate('department', 'name')
      .populate('stakeholders', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
  }
});

// Get project by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'name email role')
      .populate('team', 'name members')
      .populate('department', 'name')
      .populate('stakeholders', 'name email role')
      .populate('tasks');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Failed to fetch project', error: error.message });
  }
});

// Create new project
router.post('/', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      manager: req.body.manager || req.user.userId
    };
    
    const project = new Project(projectData);
    await project.save();
    
    const populatedProject = await Project.findById(project._id)
      .populate('manager', 'name email')
      .populate('team', 'name')
      .populate('department', 'name');
    
    res.status(201).json(populatedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
});

// Update project
router.put('/:id', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
      .populate('manager', 'name email')
      .populate('team', 'name')
      .populate('department', 'name')
      .populate('stakeholders', 'name email');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Failed to update project', error: error.message });
  }
});

// Delete project (soft delete)
router.delete('/:id', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project', error: error.message });
  }
});

// Add milestone to project
router.post('/:id/milestones', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    project.milestones.push(req.body);
    await project.save();
    
    res.json(project);
  } catch (error) {
    console.error('Error adding milestone:', error);
    res.status(500).json({ message: 'Failed to add milestone', error: error.message });
  }
});

// Update milestone
router.put('/:id/milestones/:milestoneId', authenticateJWT, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }
    
    Object.assign(milestone, req.body);
    await project.save();
    
    res.json(project);
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ message: 'Failed to update milestone', error: error.message });
  }
});

// Get project statistics
router.get('/:id/stats', authenticateJWT, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('tasks');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const stats = {
      totalTasks: project.tasks.length,
      completedTasks: project.tasks.filter(t => t.status === 'completed').length,
      progress: project.progress,
      estimatedHours: project.estimatedHours || 0,
      actualHours: project.actualHours || 0,
      budget: project.budget || 0,
      actualCost: project.actualCost || 0,
      milestonesTotal: project.milestones.length,
      milestonesCompleted: project.milestones.filter(m => m.completed).length
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching project stats:', error);
    res.status(500).json({ message: 'Failed to fetch project stats', error: error.message });
  }
});

module.exports = router;
