const express = require('express');
const router = express.Router();
const KPI = require('../models/KPI');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { validateKPI, handleValidation } = require('../middleware/validate');

// Create KPI (Employer only)
router.post('/', authenticateJWT, authorizeRoles('employer'), validateKPI, handleValidation, async (req, res) => {
  try {
    const { name, description, targetValue, assignedTo, period } = req.body;
    const kpi = new KPI({ name, description, targetValue, assignedTo, period });
    await kpi.save();
    res.status(201).json(kpi);
  } catch (err) {
    res.status(500).json({ message: 'KPI creation failed', error: err.message });
  }
});

// Get all KPIs (Employer: all, Employee: own)
router.get('/', authenticateJWT, async (req, res) => {
  try {
    let kpis;
    if (req.user.role === 'employer') {
      kpis = await KPI.find().populate('assignedTo');
    } else {
      kpis = await KPI.find({ assignedTo: req.user._id });
    }
    res.json(kpis);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch KPIs', error: err.message });
  }
});

// Get KPI by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const kpi = await KPI.findById(req.params.id).populate('assignedTo');
    if (!kpi) {
      return res.status(404).json({ message: 'KPI not found' });
    }
    
    // Check if user has access to this KPI
    if (req.user.role !== 'employer' && kpi.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(kpi);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch KPI', error: err.message });
  }
});

// Get KPIs for specific user
router.get('/user/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Only employers can view other users' KPIs
    if (req.user.role !== 'employer' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const kpis = await KPI.find({ assignedTo: id }).populate('assignedTo');
    res.json({
      message: 'User KPIs retrieved successfully',
      userId: id,
      kpis
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user KPIs', error: err.message });
  }
});

// Update KPI (Employer only)
router.put('/:id', authenticateJWT, authorizeRoles('employer'), async (req, res) => {
  try {
    const { name, description, targetValue, assignedTo, period } = req.body;
    const kpi = await KPI.findById(req.params.id);
    
    if (!kpi) {
      return res.status(404).json({ message: 'KPI not found' });
    }
    
    kpi.name = name || kpi.name;
    kpi.description = description || kpi.description;
    kpi.targetValue = targetValue || kpi.targetValue;
    kpi.assignedTo = assignedTo || kpi.assignedTo;
    kpi.period = period || kpi.period;
    
    await kpi.save();
    res.json({
      message: 'KPI updated successfully',
      kpi
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update KPI', error: err.message });
  }
});

// Delete KPI (Employer only)
router.delete('/:id', authenticateJWT, authorizeRoles('employer'), async (req, res) => {
  try {
    const kpi = await KPI.findById(req.params.id);
    
    if (!kpi) {
      return res.status(404).json({ message: 'KPI not found' });
    }
    
    await KPI.findByIdAndDelete(req.params.id);
    res.json({
      message: 'KPI deleted successfully',
      kpiId: req.params.id
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete KPI', error: err.message });
  }
});

// Calculate KPI metrics
router.post('/calculate', authenticateJWT, async (req, res) => {
  try {
    const { kpiId, userId, timeframe } = req.body;
    
    // Only employers can calculate KPIs for any user, employees can only calculate their own
    if (req.user.role !== 'employer' && req.user._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const kpi = await KPI.findById(kpiId);
    if (!kpi) {
      return res.status(404).json({ message: 'KPI not found' });
    }
    
    // Calculate KPI metrics based on timeframe
    const calculation = {
      kpiId,
      userId,
      timeframe: timeframe || 'current',
      targetValue: kpi.targetValue,
      currentValue: kpi.currentValue || 0,
      progress: ((kpi.currentValue || 0) / kpi.targetValue) * 100,
      status: (kpi.currentValue || 0) >= kpi.targetValue ? 'achieved' : 'in_progress',
      calculatedAt: new Date()
    };
    
    res.json({
      message: 'KPI calculation completed successfully',
      calculation
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to calculate KPI', error: err.message });
  }
});

// Update KPI progress (Employee only)
router.patch('/:id/progress', authenticateJWT, authorizeRoles('employee'), async (req, res) => {
  try {
    const { currentValue } = req.body;
    const kpi = await KPI.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!kpi) return res.status(404).json({ message: 'KPI not found' });
    kpi.currentValue = currentValue;
    await kpi.save();
    res.json({ message: 'KPI progress updated', kpi });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update KPI', error: err.message });
  }
});

module.exports = router;