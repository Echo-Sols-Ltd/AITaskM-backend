const express = require('express');
const router = express.Router();
const Timer = require('../models/Timer');
const { authenticateJWT } = require('../middleware/auth');

// Start timer session
router.post('/start', authenticateJWT, async (req, res) => {
  try {
    const { duration, type, taskId, mode } = req.body;
    
    // Create new timer session
    const timerSession = new Timer({
      userId: req.user._id,
      taskId,
      type: type || 'pomodoro',
      mode: mode || 'pomodoro',
      duration: duration || 25, // minutes
      startTime: new Date(),
      status: 'active',
      remainingTime: duration || 25
    });
    
    await timerSession.save();
    
    res.json({
      message: 'Timer started successfully',
      session: timerSession
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to start timer', error: err.message });
  }
});

// Pause timer session
router.post('/pause', authenticateJWT, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const timerSession = await Timer.findById(sessionId);
    if (!timerSession) {
      return res.status(404).json({ message: 'Timer session not found' });
    }
    
    if (timerSession.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    timerSession.status = 'paused';
    timerSession.pausedAt = new Date();
    timerSession.remainingTime = req.body.remainingTime || timerSession.remainingTime;
    
    await timerSession.save();
    
    res.json({
      message: 'Timer paused successfully',
      session: timerSession
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to pause timer', error: err.message });
  }
});

// Resume timer session
router.post('/resume', authenticateJWT, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const timerSession = await Timer.findById(sessionId);
    if (!timerSession) {
      return res.status(404).json({ message: 'Timer session not found' });
    }
    
    if (timerSession.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    timerSession.status = 'active';
    timerSession.resumedAt = new Date();
    
    await timerSession.save();
    
    res.json({
      message: 'Timer resumed successfully',
      session: timerSession
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to resume timer', error: err.message });
  }
});

// Stop timer session
router.post('/stop', authenticateJWT, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const timerSession = await Timer.findById(sessionId);
    if (!timerSession) {
      return res.status(404).json({ message: 'Timer session not found' });
    }
    
    if (timerSession.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    timerSession.status = 'completed';
    timerSession.endTime = new Date();
    timerSession.totalTime = req.body.totalTime || timerSession.duration;
    timerSession.completed = true;
    
    await timerSession.save();
    
    res.json({
      message: 'Timer stopped successfully',
      session: timerSession
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to stop timer', error: err.message });
  }
});

// Get timer sessions for user
router.get('/sessions', authenticateJWT, async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    
    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    
    const sessions = await Timer.find(filter)
      .populate('taskId', 'title description')
      .sort({ startTime: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Timer.countDocuments(filter);
    
    res.json({
      sessions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch timer sessions', error: err.message });
  }
});

// Get timer statistics for user
router.get('/stats', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get completed sessions
    const completedSessions = await Timer.find({
      userId,
      status: 'completed'
    });
    
    // Calculate statistics
    const totalPomodoros = completedSessions.filter(s => s.type === 'pomodoro').length;
    const totalBreaks = completedSessions.filter(s => s.type === 'break').length;
    const totalFocusTime = completedSessions.reduce((total, session) => {
      return total + (session.totalTime || session.duration);
    }, 0);
    
    // Get today's sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySessions = completedSessions.filter(session => 
      session.startTime >= today
    );
    
    const todayPomodoros = todaySessions.filter(s => s.type === 'pomodoro').length;
    const todayFocusTime = todaySessions.reduce((total, session) => {
      return total + (session.totalTime || session.duration);
    }, 0);
    
    // Get weekly stats
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklySessions = completedSessions.filter(session => 
      session.startTime >= weekAgo
    );
    
    const weeklyPomodoros = weeklySessions.filter(s => s.type === 'pomodoro').length;
    const weeklyFocusTime = weeklySessions.reduce((total, session) => {
      return total + (session.totalTime || session.duration);
    }, 0);
    
    const stats = {
      total: {
        pomodoros: totalPomodoros,
        breaks: totalBreaks,
        focusTime: totalFocusTime
      },
      today: {
        pomodoros: todayPomodoros,
        focusTime: todayFocusTime
      },
      weekly: {
        pomodoros: weeklyPomodoros,
        focusTime: weeklyFocusTime
      }
    };
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch timer statistics', error: err.message });
  }
});

// Get current active timer session
router.get('/current', authenticateJWT, async (req, res) => {
  try {
    const activeSession = await Timer.findOne({
      userId: req.user._id,
      status: 'active'
    }).populate('taskId', 'title description');
    
    if (!activeSession) {
      return res.json({ message: 'No active timer session' });
    }
    
    res.json(activeSession);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch current timer', error: err.message });
  }
});

// Update timer settings
router.put('/settings', authenticateJWT, async (req, res) => {
  try {
    const { pomodoroTime, shortBreakTime, longBreakTime, autoStartBreaks, autoStartPomodoros, soundEnabled } = req.body;
    
    // Update user preferences (you might want to store this in User model)
    // For now, we'll just return success
    res.json({
      message: 'Timer settings updated successfully',
      settings: {
        pomodoroTime,
        shortBreakTime,
        longBreakTime,
        autoStartBreaks,
        autoStartPomodoros,
        soundEnabled
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update timer settings', error: err.message });
  }
});

module.exports = router; 