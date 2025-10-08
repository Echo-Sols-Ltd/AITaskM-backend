# AI Task Manager - Data Models

This document provides a comprehensive overview of all the data models used in the AI Task Manager application.

## Model Overview

The application uses MongoDB with Mongoose ODM and consists of the following model categories:

### Core Models

- **User** - User accounts and profiles
- **Task** - Task management and tracking
- **KPI** - Key Performance Indicators
- **Notification** - System notifications

### Chat & Communication

- **ChatMessage** - Individual chat messages
- **Conversation** - Chat conversations and threads

### Organization & Team

- **Team** - Team management
- **Department** - Organizational structure
- **Role** - Role-based access control
- **Project** - Project management

### Goals & Performance

- **Goal** - Goal setting and tracking

### Timer & Productivity

- **Timer** - Pomodoro timer and focus sessions

### Gamification

- **Badge** - Achievement badges
- **Achievement** - Unlockable achievements
- **UserBadge** - User-badge relationships
- **UserAchievement** - User-achievement relationships
- **PointsTransaction** - Points system
- **Leaderboard** - Rankings and competitions

### File Management

- **File** - File uploads and sharing

### AI & Analytics

- **AISuggestion** - AI-powered suggestions
- **AITaskAssignment** - AI task assignment recommendations
- **AIPerformanceAnalysis** - AI performance insights
- **AIScheduleOptimization** - AI schedule optimization

### Analytics & Reporting

- **ProductivityMetric** - Productivity measurements
- **EfficiencyMetric** - Efficiency metrics
- **QualityMetric** - Quality measurements
- **TrendAnalysis** - Trend analysis data
- **Report** - Report configurations

### Settings & Configuration

- **SystemSettings** - System-wide settings
- **FeatureFlag** - Feature toggles
- **UserPreferences** - User-specific preferences
- **OrganizationSettings** - Organization configuration

### Search & Export

- **SearchHistory** - Search query history
- **SearchIndex** - Searchable content index
- **SavedSearch** - Saved search queries
- **ExportJob** - Data export jobs
- **ExportTemplate** - Export templates

## Database Relationships

### User Relationships

```
User
├── department → Department
├── team → Team
├── manager → User (self-reference)
├── kpis → [KPI]
├── goals → [Goal]
├── notifications → [Notification]
└── stats (embedded)
```

### Task Relationships

```
Task
├── assignedTo → User
├── assignedBy → User
├── project → Project
├── team → Team
├── department → Department
├── dependencies → [Task] (self-reference)
├── subtasks → [Task] (self-reference)
├── parentTask → Task (self-reference)
├── comments → [Comment] (embedded)
├── attachments → [Attachment] (embedded)
├── blockers → [Blocker] (embedded)
└── timeLogs → [TimeLog] (embedded)
```

### Team Relationships

```
Team
├── manager → User
├── members → [User]
├── lead → User
├── department → Department
└── stats (embedded)
```

### Project Relationships

```
Project
├── manager → User
├── team → Team
├── department → Department
├── tasks → [Task]
├── stakeholders → [User]
└── milestones (embedded)
```

## Key Features

### 1. Hierarchical Organization

- Departments contain Teams
- Teams contain Users
- Projects can span multiple Teams and Departments

### 2. Flexible Task Management

- Tasks can have dependencies and subtasks
- Support for time tracking and progress monitoring
- AI-powered task assignment and optimization

### 3. Comprehensive Analytics

- Real-time productivity metrics
- Trend analysis and forecasting
- Custom report generation

### 4. Gamification System

- Badge and achievement system
- Points-based rewards
- Leaderboards and competitions

### 5. AI Integration

- Smart task assignment
- Performance analysis
- Schedule optimization
- Productivity suggestions

### 6. Advanced Search

- Full-text search across all entities
- Saved searches and filters
- Search history tracking

### 7. Export Capabilities

- Multiple format support (CSV, Excel, PDF, JSON, XML)
- Scheduled exports
- Custom export templates

## Usage Examples

### Creating a User

```javascript
const { User } = require("./models");

const user = new User({
  name: "John Doe",
  email: "john@example.com",
  password: "securepassword",
  role: "employee",
  department: departmentId,
  team: teamId,
});

await user.save();
```

### Creating a Task

```javascript
const { Task } = require("./models");

const task = new Task({
  title: "Complete Project Documentation",
  description: "Write comprehensive documentation for the new feature",
  assignedTo: userId,
  assignedBy: managerId,
  priority: "high",
  deadline: new Date("2024-02-01"),
  estimatedHours: 8,
  project: projectId,
  team: teamId,
});

await task.save();
```

### Querying with Relationships

```javascript
const tasks = await Task.find({ assignedTo: userId })
  .populate("assignedBy", "name email")
  .populate("project", "name")
  .populate("team", "name")
  .sort({ deadline: 1 });
```

## Indexes and Performance

### Recommended Indexes

```javascript
// User indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ department: 1 });
db.users.createIndex({ team: 1 });

// Task indexes
db.tasks.createIndex({ assignedTo: 1 });
db.tasks.createIndex({ status: 1 });
db.tasks.createIndex({ deadline: 1 });
db.tasks.createIndex({ project: 1 });
db.tasks.createIndex({ team: 1 });

// Search indexes
db.searchindexes.createIndex({ searchVector: "text" });
db.searchindexes.createIndex({ entityType: 1, entityId: 1 });
```

## Data Validation

All models include comprehensive validation:

- Required field validation
- Enum value validation
- Reference integrity
- Data type validation
- Custom validation rules

## Security Features

- Password hashing with bcrypt
- Role-based access control
- Data privacy controls
- Audit trails with timestamps
- Soft delete support

## Migration and Versioning

Models include timestamps for tracking changes:

- `createdAt` - When the record was created
- `updatedAt` - When the record was last modified

## Best Practices

1. **Always use populate() for referenced fields when displaying data**
2. **Use indexes for frequently queried fields**
3. **Implement proper error handling for database operations**
4. **Use transactions for operations that modify multiple documents**
5. **Regularly backup and maintain database indexes**
6. **Monitor query performance and optimize slow queries**

## Support

For questions about the data models or database schema, please refer to:

- Mongoose documentation: https://mongoosejs.com/
- MongoDB documentation: https://docs.mongodb.com/
- Application API documentation
