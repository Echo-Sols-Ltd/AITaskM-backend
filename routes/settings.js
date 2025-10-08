const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const { SystemSettings, FeatureFlag, UserPreferences, OrganizationSettings } = require('../models/Settings');

// Get system settings
router.get('/', authenticateJWT, authorizeRoles('employer', 'admin'), async (req, res) => {
  try {
    // Get system settings from database
    const systemSettings = await SystemSettings.findOne({ key: 'system' });
    
    if (!systemSettings) {
      // Create default system settings if none exist
      const defaultSettings = new SystemSettings({
        key: 'system',
        value: {
          appName: 'AI Task Manager',
          version: '1.0.0',
          maintenanceMode: false,
          features: {
            ai: true,
            gamification: true,
            pomodoro: true,
            realTime: true
          },
          limits: {
            maxUsers: 1000,
            maxTasks: 10000,
            maxFileSize: 10485760, // 10MB
            maxProjects: 100
          },
          integrations: {
            slack: true,
            email: true,
            webhooks: false
          }
        },
        description: 'System configuration settings',
        category: 'general',
        isEditable: true,
        isPublic: false
      });
      
      await defaultSettings.save();
      
      res.json({
        message: 'System settings retrieved successfully',
        settings: defaultSettings.value
      });
    } else {
      res.json({
        message: 'System settings retrieved successfully',
        settings: systemSettings.value
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch system settings', error: err.message });
  }
});

// Update system settings
router.put('/', authenticateJWT, authorizeRoles('employer', 'admin'), async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate required fields
    if (!updates.appName || !updates.version) {
      return res.status(400).json({ message: 'App name and version are required' });
    }
    
    // Update or create system settings
    const systemSettings = await SystemSettings.findOneAndUpdate(
      { key: 'system' },
      {
        key: 'system',
        value: {
          ...updates,
          updatedBy: req.user._id,
          updatedAt: new Date()
        },
        description: 'System configuration settings',
        category: 'general',
        isEditable: true,
        isPublic: false
      },
      { upsert: true, new: true }
    );
    
    res.json({
      message: 'System settings updated successfully',
      settings: systemSettings.value
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update system settings', error: err.message });
  }
});

// Get feature settings
router.get('/features', authenticateJWT, async (req, res) => {
  try {
    // Get feature settings from database
    const featureSettings = await SystemSettings.findOne({ key: 'features' });
    
    if (!featureSettings) {
      // Create default feature settings if none exist
      const defaultFeatures = new SystemSettings({
        key: 'features',
        value: {
          ai: {
            enabled: true,
            models: ['gpt-4', 'gpt-3.5-turbo'],
            maxTokens: 4000,
            costPerRequest: 0.002
          },
          gamification: {
            enabled: true,
            points: true,
            badges: true,
            leaderboards: true,
            streaks: true
          },
          pomodoro: {
            enabled: true,
            defaultDuration: 25,
            shortBreak: 5,
            longBreak: 15,
            autoStartBreaks: false
          },
          realTime: {
            enabled: true,
            websockets: true,
            notifications: true,
            liveUpdates: true
          }
        },
        description: 'Feature configuration settings',
        category: 'features',
        isEditable: true,
        isPublic: true
      });
      
      await defaultFeatures.save();
      
      res.json({
        message: 'Feature settings retrieved successfully',
        features: defaultFeatures.value
      });
    } else {
      res.json({
        message: 'Feature settings retrieved successfully',
        features: featureSettings.value
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch feature settings', error: err.message });
  }
});

// Update feature settings
router.put('/features', authenticateJWT, authorizeRoles('employer', 'admin'), async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate feature settings
    if (updates.ai && typeof updates.ai.enabled !== 'boolean') {
      return res.status(400).json({ message: 'AI feature enabled status is required' });
    }
    
    // Update or create feature settings
    const featureSettings = await SystemSettings.findOneAndUpdate(
      { key: 'features' },
      {
        key: 'features',
        value: {
          ...updates,
          updatedBy: req.user._id,
          updatedAt: new Date()
        },
        description: 'Feature configuration settings',
        category: 'features',
        isEditable: true,
        isPublic: true
      },
      { upsert: true, new: true }
    );
    
    res.json({
      message: 'Feature settings updated successfully',
      features: featureSettings.value
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update feature settings', error: err.message });
  }
});

// Get user preferences
router.get('/preferences', authenticateJWT, async (req, res) => {
  try {
    // Get user preferences from database
    let userPreferences = await UserPreferences.findOne({ user: req.user._id });
    
    if (!userPreferences) {
      // Create default user preferences if none exist
      userPreferences = new UserPreferences({
        user: req.user._id,
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        notifications: {
          email: true,
          push: true,
          sms: false,
          inApp: true
        },
        dashboard: {
          layout: 'default',
          widgets: ['tasks', 'calendar', 'progress'],
          refreshInterval: 300
        },
        privacy: {
          profileVisibility: 'team',
          activityVisibility: 'team',
          allowMentions: true
        },
        productivity: {
          focusMode: false,
          autoStartTimer: false,
          weeklyReports: true,
          goalReminders: true
        }
      });
      
      await userPreferences.save();
    }
    
    res.json({
      message: 'User preferences retrieved successfully',
      preferences: userPreferences
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user preferences', error: err.message });
  }
});

// Update user preferences
router.put('/preferences', authenticateJWT, async (req, res) => {
  try {
    const updates = req.body;
    
    // Validate theme preference
    if (updates.theme && !['light', 'dark', 'auto'].includes(updates.theme)) {
      return res.status(400).json({ message: 'Invalid theme preference' });
    }
    
    // Validate time format
    if (updates.timeFormat && !['12h', '24h'].includes(updates.timeFormat)) {
      return res.status(400).json({ message: 'Invalid time format preference' });
    }
    
    // Update user preferences
    const userPreferences = await UserPreferences.findOneAndUpdate(
      { user: req.user._id },
      {
        ...updates,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );
    
    res.json({
      message: 'User preferences updated successfully',
      preferences: userPreferences
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user preferences', error: err.message });
  }
});

// Reset user preferences
router.post('/preferences/reset', authenticateJWT, async (req, res) => {
  try {
    // Reset user preferences to defaults
    const defaultPreferences = {
      user: req.user._id,
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      notifications: {
        email: true,
        push: true,
        sms: false,
        inApp: true
      },
      dashboard: {
        layout: 'default',
        widgets: ['tasks', 'calendar', 'progress'],
        refreshInterval: 300
      },
      privacy: {
        profileVisibility: 'team',
        activityVisibility: 'team',
        allowMentions: true
      },
      productivity: {
        focusMode: false,
        autoStartTimer: false,
        weeklyReports: true,
        goalReminders: true
      }
    };
    
    const userPreferences = await UserPreferences.findOneAndUpdate(
      { user: req.user._id },
      defaultPreferences,
      { new: true, upsert: true }
    );
    
    res.json({
      message: 'User preferences reset successfully',
      preferences: userPreferences
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reset user preferences', error: err.message });
  }
});

module.exports = router; 