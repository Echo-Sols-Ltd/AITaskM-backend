# System & Settings Management

A comprehensive system configuration and user preferences management system for the AI Task Manager application that handles system-wide settings, feature flags, and user-specific preferences.

## Features

### Core System Features

- **System Configuration Management** for application-wide settings
- **Feature Flag Management** for enabling/disabling system features
- **User Preferences Management** for personalized user experience
- **Role-Based Access Control** for settings management
- **Default Settings Provisioning** for new installations
- **Settings Validation** and error handling
- **Audit Trail** for settings changes

### System Settings

- **Application Configuration**: app name, version, maintenance mode
- **Feature Management**: AI, gamification, pomodoro, real-time features
- **System Limits**: maximum users, tasks, file sizes, projects
- **Integration Settings**: Slack, email, webhooks configuration
- **Security Settings**: authentication, authorization, session management

### User Preferences

- **UI Customization**: theme, language, timezone, date/time formats
- **Notification Preferences**: email, push, SMS, in-app notifications
- **Dashboard Configuration**: layout, widgets, refresh intervals
- **Privacy Settings**: profile visibility, activity sharing, analytics
- **Productivity Tools**: focus mode, timer settings, report preferences

## API Endpoints

### 1. System Settings

#### GET /api/settings

**Description**: Retrieve system-wide configuration settings

**Authentication**: Required (JWT)
**Authorization**: Admin/Employer roles only

**Response**:

```json
{
  "message": "System settings retrieved successfully",
  "settings": {
    "appName": "AI Task Manager",
    "version": "1.0.0",
    "maintenanceMode": false,
    "features": {
      "ai": true,
      "gamification": true,
      "pomodoro": true,
      "realTime": true
    },
    "limits": {
      "maxUsers": 1000,
      "maxTasks": 10000,
      "maxFileSize": 10485760,
      "maxProjects": 100
    },
    "integrations": {
      "slack": true,
      "email": true,
      "webhooks": false
    }
  }
}
```

#### PUT /api/settings

**Description**: Update system-wide configuration settings

**Authentication**: Required (JWT)
**Authorization**: Admin/Employer roles only

**Request Body**:

```json
{
  "appName": "AI Task Manager Pro",
  "version": "1.1.0",
  "maintenanceMode": false,
  "features": {
    "ai": true,
    "gamification": false
  }
}
```

**Response**:

```json
{
  "message": "System settings updated successfully",
  "settings": {
    "appName": "AI Task Manager Pro",
    "version": "1.1.0",
    "maintenanceMode": false,
    "features": {
      "ai": true,
      "gamification": false
    }
  }
}
```

### 2. Feature Settings

#### GET /api/settings/features

**Description**: Retrieve feature configuration settings

**Authentication**: Required (JWT)
**Authorization**: All authenticated users

**Response**:

```json
{
  "message": "Feature settings retrieved successfully",
  "features": {
    "ai": {
      "enabled": true,
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "maxTokens": 4000,
      "costPerRequest": 0.002
    },
    "gamification": {
      "enabled": true,
      "points": true,
      "badges": true,
      "leaderboards": true,
      "streaks": true
    },
    "pomodoro": {
      "enabled": true,
      "defaultDuration": 25,
      "shortBreak": 5,
      "longBreak": 15,
      "autoStartBreaks": false
    },
    "realTime": {
      "enabled": true,
      "websockets": true,
      "notifications": true,
      "liveUpdates": true
    }
  }
}
```

#### PUT /api/settings/features

**Description**: Update feature configuration settings

**Authentication**: Required (JWT)
**Authorization**: Admin/Employer roles only

**Request Body**:

```json
{
  "ai": {
    "enabled": false
  },
  "gamification": {
    "enabled": true,
    "points": true,
    "badges": false
  }
}
```

### 3. User Preferences

#### GET /api/preferences

**Description**: Retrieve current user preferences

**Authentication**: Required (JWT)
**Authorization**: All authenticated users

**Response**:

```json
{
  "message": "User preferences retrieved successfully",
  "preferences": {
    "user": "507f1f77bcf86cd799439011",
    "theme": "dark",
    "language": "en",
    "timezone": "America/New_York",
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "24h",
    "notifications": {
      "email": true,
      "push": true,
      "sms": false,
      "inApp": true
    },
    "dashboard": {
      "layout": "compact",
      "widgets": ["tasks", "calendar", "progress"],
      "refreshInterval": 300
    },
    "privacy": {
      "profileVisibility": "team",
      "activityVisibility": "team",
      "allowMentions": true
    },
    "productivity": {
      "focusMode": true,
      "autoStartTimer": false,
      "weeklyReports": true,
      "goalReminders": true
    }
  }
}
```

#### PUT /api/preferences

**Description**: Update current user preferences

**Authentication**: Required (JWT)
**Authorization**: All authenticated users

**Request Body**:

```json
{
  "theme": "dark",
  "timezone": "America/New_York",
  "notifications": {
    "email": false,
    "push": true
  }
}
```

#### POST /api/preferences/reset

**Description**: Reset user preferences to default values

**Authentication**: Required (JWT)
**Authorization**: All authenticated users

**Response**:

```json
{
  "message": "User preferences reset successfully",
  "preferences": {
    "user": "507f1f77bcf86cd799439011",
    "theme": "light",
    "language": "en",
    "timezone": "UTC",
    "dateFormat": "MM/DD/YYYY",
    "timeFormat": "12h",
    "notifications": {
      "email": true,
      "push": true,
      "sms": false,
      "inApp": true
    }
  }
}
```

## Data Models

### SystemSettings Schema

```javascript
{
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  description: String,
  category: {
    type: String,
    enum: ['general', 'security', 'notifications', 'features', 'integrations'],
    default: 'general'
  },
  isEditable: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  validation: {
    type: String,
    required: Boolean,
    min: Number,
    max: Number,
    enum: [String]
  }
}
```

### UserPreferences Schema

```javascript
{
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  dateFormat: { type: String, default: 'MM/DD/YYYY' },
  timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true }
  },
  dashboard: {
    layout: { type: String, default: 'default' },
    widgets: [String],
    refreshInterval: { type: Number, default: 300 }
  },
  privacy: {
    profileVisibility: { type: String, enum: ['public', 'team', 'private'], default: 'team' },
    activityVisibility: { type: String, enum: ['public', 'team', 'private'], default: 'team' },
    allowMentions: { type: Boolean, default: true }
  },
  productivity: {
    focusMode: { type: Boolean, default: false },
    autoStartTimer: { type: Boolean, default: false },
    weeklyReports: { type: Boolean, default: true },
    goalReminders: { type: Boolean, default: true }
  }
}
```

### FeatureFlag Schema

```javascript
{
  name: { type: String, required: true, unique: true },
  description: String,
  isEnabled: { type: Boolean, default: false },
  enabledFor: {
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    roles: [String]
  },
  rolloutPercentage: { type: Number, min: 0, max: 100, default: 0 },
  startDate: Date,
  endDate: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}
```

## Security Features

### Authentication & Authorization

- **JWT Authentication**: All endpoints require valid JWT tokens
- **Role-Based Access Control**: Different permission levels for different user roles
- **Admin/Employer Only**: System settings modification restricted to admin and employer roles
- **User Isolation**: Users can only access and modify their own preferences

### Data Protection

- **Input Validation**: Comprehensive validation for all settings and preferences
- **Type Safety**: Strong typing for all preference values
- **Enum Validation**: Restricted values for theme, time format, and other preferences
- **Required Field Validation**: Essential fields must be provided for system settings

### Audit & Compliance

- **Change Tracking**: All settings changes are logged with user and timestamp
- **Version Control**: Settings maintain history of changes
- **Rollback Capability**: Previous settings can be restored if needed

## Usage Examples

### Frontend Integration

#### React Hook for User Preferences

```javascript
import { useState, useEffect } from "react";

const useUserPreferences = () => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/preferences", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates) => {
    try {
      const response = await fetch("/api/preferences", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      setPreferences(data.preferences);
      return data;
    } catch (error) {
      console.error("Failed to update preferences:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  return { preferences, loading, updatePreferences, fetchPreferences };
};
```

#### Theme Switcher Component

```javascript
const ThemeSwitcher = () => {
  const { preferences, updatePreferences } = useUserPreferences();

  const handleThemeChange = async (newTheme) => {
    try {
      await updatePreferences({ theme: newTheme });
      // Apply theme to document
      document.documentElement.setAttribute("data-theme", newTheme);
    } catch (error) {
      console.error("Failed to update theme:", error);
    }
  };

  return (
    <select
      value={preferences?.theme || "light"}
      onChange={(e) => handleThemeChange(e.target.value)}
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="auto">Auto</option>
    </select>
  );
};
```

### Backend Integration

#### Feature Flag Check

```javascript
const checkFeatureFlag = async (featureName, userId) => {
  try {
    const featureFlag = await FeatureFlag.findOne({ name: featureName });

    if (!featureFlag || !featureFlag.isEnabled) {
      return false;
    }

    // Check if user is in enabled list
    if (featureFlag.enabledFor.users.includes(userId)) {
      return true;
    }

    // Check if user's team is enabled
    const user = await User.findById(userId).populate("team");
    if (user.team && featureFlag.enabledFor.teams.includes(user.team._id)) {
      return true;
    }

    // Check if user's role is enabled
    if (featureFlag.enabledFor.roles.includes(user.role)) {
      return true;
    }

    // Check rollout percentage
    if (featureFlag.rolloutPercentage > 0) {
      const userHash = crypto
        .createHash("md5")
        .update(userId.toString())
        .digest("hex");
      const hashValue = parseInt(userHash.substring(0, 8), 16);
      return hashValue % 100 < featureFlag.rolloutPercentage;
    }

    return false;
  } catch (error) {
    console.error("Feature flag check failed:", error);
    return false;
  }
};
```

## Performance Considerations

### Caching Strategy

- **Redis Caching**: System settings cached in Redis for fast access
- **User Preferences Caching**: Frequently accessed preferences cached per user
- **Cache Invalidation**: Automatic cache invalidation on settings changes

### Database Optimization

- **Indexed Queries**: Proper indexing on key fields for fast lookups
- **Lean Queries**: Using lean() for read-only operations
- **Connection Pooling**: Efficient database connection management

### Memory Management

- **Lazy Loading**: Settings loaded only when needed
- **Batch Operations**: Multiple preference updates batched together
- **Memory Limits**: Configurable memory limits for large settings objects

## Error Handling

### Validation Errors

```json
{
  "message": "Validation error",
  "errors": [
    {
      "field": "theme",
      "message": "Invalid theme preference. Must be one of: light, dark, auto"
    }
  ]
}
```

### Authorization Errors

```json
{
  "message": "Forbidden - Admin/Employer only",
  "error": "Insufficient permissions to modify system settings"
}
```

### Database Errors

```json
{
  "message": "Failed to update system settings",
  "error": "Database connection timeout"
}
```

## Future Enhancements

### Planned Features

- **Settings Templates**: Pre-configured settings for different organization types
- **Bulk Operations**: Mass update of user preferences
- **Settings Import/Export**: Backup and restore functionality
- **Advanced Validation**: Custom validation rules for complex settings
- **Settings Migration**: Automatic migration between versions

### Integration Improvements

- **Webhook Notifications**: Notify external systems of settings changes
- **API Rate Limiting**: Configurable rate limits for settings endpoints
- **Settings Analytics**: Track usage patterns and popular configurations
- **Multi-tenant Support**: Organization-specific settings management

## Testing

### Unit Tests

```javascript
describe("User Preferences", () => {
  test("should create default preferences for new user", async () => {
    const user = new User({ name: "Test User", email: "test@example.com" });
    const preferences = await createDefaultPreferences(user._id);

    expect(preferences.theme).toBe("light");
    expect(preferences.language).toBe("en");
    expect(preferences.timezone).toBe("UTC");
  });

  test("should validate theme preference", async () => {
    const invalidTheme = "invalid";
    expect(() => validateTheme(invalidTheme)).toThrow();
  });
});
```

### Integration Tests

```javascript
describe("Settings API", () => {
  test("should retrieve system settings", async () => {
    const response = await request(app)
      .get("/api/settings")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.settings).toHaveProperty("appName");
  });

  test("should reject unauthorized settings update", async () => {
    const response = await request(app)
      .put("/api/settings")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ appName: "Unauthorized Change" });

    expect(response.status).toBe(403);
  });
});
```

## Monitoring & Logging

### Metrics to Track

- **Settings Access Frequency**: How often different settings are accessed
- **Update Success Rate**: Percentage of successful settings updates
- **Validation Error Rate**: Frequency of validation failures
- **Cache Hit Rate**: Effectiveness of caching strategy
- **Response Times**: API endpoint performance metrics

### Logging Strategy

```javascript
const logger = require("../utils/logger");

const logSettingsChange = (userId, settingKey, oldValue, newValue) => {
  logger.info("Settings changed", {
    userId,
    settingKey,
    oldValue,
    newValue,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
};
```

## Troubleshooting

### Common Issues

#### Settings Not Persisting

- **Check Database Connection**: Verify MongoDB connection is active
- **Validate User Permissions**: Ensure user has required role for settings modification
- **Check Validation Rules**: Verify all required fields are provided
- **Review Error Logs**: Check server logs for specific error messages

#### Preferences Not Loading

- **Verify Authentication**: Ensure JWT token is valid and not expired
- **Check User ID**: Confirm preferences are associated with correct user
- **Database Indexes**: Verify proper indexing on user field
- **Cache Issues**: Clear Redis cache if using caching

#### Feature Flags Not Working

- **Check Flag Status**: Verify feature flag is enabled
- **User Eligibility**: Confirm user meets enabled criteria
- **Rollout Percentage**: Check if user falls within rollout percentage
- **Date Restrictions**: Verify current date is within enabled date range

### Debug Commands

```bash
# Check system settings in database
mongo ai-task-manager --eval "db.systemsettings.find().pretty()"

# Verify user preferences
mongo ai-task-manager --eval "db.userpreferences.find({user: ObjectId('USER_ID')}).pretty()"

# Check feature flags
mongo ai-task-manager --eval "db.featureflags.find().pretty()"
```

## Conclusion

The System & Settings Management system provides a robust foundation for managing application configuration and user preferences. With comprehensive API endpoints, strong security measures, and flexible data models, it enables administrators to configure the system while giving users control over their personal experience.

The system is designed to be scalable, maintainable, and user-friendly, with proper error handling, validation, and monitoring capabilities. Future enhancements will continue to improve the flexibility and power of the settings management system.
