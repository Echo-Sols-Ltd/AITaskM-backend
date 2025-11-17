# Notifications System

A comprehensive notification management system for the AI Task Manager application that handles user notifications, preferences, and delivery methods.

## Features

### Core Notification Features

- **Real-time notifications** for various system events
- **Multiple notification types**: task, message, reminder, achievement, system, team, KPI
- **Priority levels**: low, medium, high, urgent
- **Read/unread status tracking**
- **Expiration dates** for time-sensitive notifications
- **Related entity linking** to tasks, users, teams, KPIs, and goals
- **Action URLs** for clickable notifications

### User Preferences & Settings

- **Email notifications** toggle
- **Push notifications** toggle
- **In-app notifications** toggle
- **Per-type notification preferences** (enable/disable specific notification types)
- **Quiet hours** configuration (time-based notification blocking)
- **Timezone support** for quiet hours

### Bulk Operations

- **Bulk mark as read** for multiple notifications
- **Bulk delete** for multiple notifications
- **Efficient batch processing**

### Delivery Methods

- **In-app notifications** (primary)
- **Email notifications** (planned)
- **Push notifications** (planned)
- **SMS notifications** (planned)

## API Endpoints

### 1. Get Notifications

```
GET /api/notifications
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by notification type
- `priority` (optional): Filter by priority level
- `read` (optional): Filter by read status
- `category` (optional): Filter by category

**Response:**

```json
{
  "notifications": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### 2. Get Specific Notification

```
GET /api/notifications/:id
```

**Response:** Single notification object with populated related entities

### 3. Mark Notification as Read

```
PATCH /api/notifications/:id/read
```

**Response:**

```json
{
  "message": "Notification marked as read",
  "notification": {...}
}
```

### 4. Update Notification

```
PATCH /api/notifications/:id
```

**Request Body:**

```json
{
  "title": "Updated title",
  "message": "Updated message",
  "priority": "high",
  "category": "urgent",
  "actionUrl": "https://example.com/action",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### 5. Delete Notification

```
DELETE /api/notifications/:id
```

**Response:**

```json
{
  "message": "Notification deleted successfully"
}
```

### 6. Bulk Mark as Read

```
POST /api/notifications/bulk-read
```

**Request Body:**

```json
{
  "notificationIds": ["id1", "id2", "id3"]
}
```

**Response:**

```json
{
  "message": "3 notifications marked as read",
  "modifiedCount": 3
}
```

### 7. Bulk Delete

```
DELETE /api/notifications/bulk-delete
```

**Request Body:**

```json
{
  "notificationIds": ["id1", "id2", "id3"]
}
```

**Response:**

```json
{
  "message": "3 notifications deleted successfully",
  "deletedCount": 3
}
```

### 8. Get Unread Count

```
GET /api/notifications/unread-count
```

**Response:**

```json
{
  "unreadCount": 15,
  "message": "Unread count retrieved successfully"
}
```

### 9. Update Notification Settings

```
PATCH /api/notifications/settings
```

**Request Body:**

```json
{
  "emailNotifications": true,
  "pushNotifications": false,
  "inAppNotifications": true,
  "notificationTypes": {
    "task": true,
    "message": true,
    "reminder": false,
    "achievement": true,
    "system": true,
    "team": true,
    "kpi": false
  },
  "quietHours": {
    "enabled": true,
    "startTime": "22:00",
    "endTime": "08:00",
    "timezone": "America/New_York"
  }
}
```

### 10. Send Notification (Admin/System Only)

```
POST /api/notifications/send
```

**Request Body:**

```json
{
  "userId": "user_id_here",
  "type": "task",
  "title": "New Task Assigned",
  "message": "You have been assigned a new task",
  "priority": "medium",
  "category": "assignment",
  "relatedEntity": {
    "type": "task",
    "id": "task_id_here"
  },
  "actionUrl": "/tasks/task_id_here",
  "deliveryMethod": "in_app"
}
```

## Data Models

### Notification Schema

```javascript
{
  user: ObjectId,                    // Reference to User
  type: String,                      // task, message, reminder, achievement, system, team, kpi
  title: String,                     // Notification title
  message: String,                   // Notification message
  read: Boolean,                     // Read status (default: false)
  priority: String,                  // low, medium, high, urgent (default: medium)
  category: String,                  // Custom category
  relatedEntity: {                   // Related entity information
    type: String,                    // task, user, team, kpi, goal
    id: ObjectId                     // Entity ID
  },
  actionUrl: String,                 // Clickable action URL
  expiresAt: Date,                   // Expiration date
  sentAt: Date,                      // When notification was sent
  readAt: Date,                      // When notification was read
  deliveryMethod: String,            // in_app, email, push, sms (default: in_app)
  isDelivered: Boolean               // Delivery status (default: false)
}
```

### User Notification Preferences

```javascript
{
  preferences: {
    emailNotifications: Boolean,     // Enable email notifications
    pushNotifications: Boolean,      // Enable push notifications
    inAppNotifications: Boolean,     // Enable in-app notifications
    notificationTypes: {             // Per-type preferences
      task: Boolean,
      message: Boolean,
      reminder: Boolean,
      achievement: Boolean,
      system: Boolean,
      team: Boolean,
      kpi: Boolean
    },
    quietHours: {                    // Quiet hours configuration
      enabled: Boolean,
      startTime: String,             // HH:MM format
      endTime: String,               // HH:MM format
      timezone: String               // IANA timezone
    }
  }
}
```

## Security Features

### Authentication

- All endpoints require JWT authentication via `authenticateJWT` middleware
- User can only access their own notifications
- Proper user isolation and data privacy

### Authorization

- `POST /notifications/send` restricted to admin/system roles
- Role-based access control via `authorizeRoles` middleware
- Prevents unauthorized notification sending

### Data Validation

- Input validation for all request parameters
- Type checking for notification types and priorities
- Required field validation
- Array validation for bulk operations

## Error Handling

### Standard Error Responses

- **400 Bad Request**: Validation errors, missing required fields
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Insufficient permissions (admin-only endpoints)
- **404 Not Found**: Notification not found
- **500 Internal Server Error**: Server-side errors

### Error Response Format

```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Usage Examples

### Creating a Task Notification

```javascript
// System automatically creates notification when task is assigned
const notification = new Notification({
  user: assignedUserId,
  type: "task",
  title: "New Task Assigned",
  message: `You have been assigned: ${taskTitle}`,
  priority: "medium",
  category: "assignment",
  relatedEntity: {
    type: "task",
    id: taskId,
  },
  actionUrl: `/tasks/${taskId}`,
  deliveryMethod: "in_app",
});

await notification.save();
```

### Checking Unread Notifications

```javascript
// Get unread count for notification badge
const response = await fetch("/api/notifications/unread-count", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const { unreadCount } = await response.json();
// Update UI badge with unreadCount
```

### Bulk Mark as Read

```javascript
// Mark multiple notifications as read
const response = await fetch("/api/notifications/bulk-read", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    notificationIds: ["id1", "id2", "id3"],
  }),
});

const { modifiedCount } = await response.json();
// Update UI to reflect read status
```

## Performance Considerations

### Database Optimization

- Indexed fields: `user`, `type`, `read`, `createdAt`
- Pagination support for large notification lists
- Efficient bulk operations using MongoDB's `updateMany` and `deleteMany`

### Caching Strategy

- Unread count caching for frequently accessed data
- User preference caching to reduce database queries
- Notification list caching with TTL for active users

### Scalability

- Horizontal scaling support for high-traffic applications
- Queue-based notification delivery for external services
- Batch processing for bulk operations

## Future Enhancements

### Planned Features

- **Real-time delivery** using WebSocket connections
- **Email integration** with SMTP services
- **Push notification** support for mobile apps
- **SMS integration** for critical notifications
- **Notification templates** for consistent messaging
- **Advanced filtering** and search capabilities
- **Notification analytics** and reporting
- **Smart notification scheduling** based on user activity

### Integration Points

- **Task Management System**: Automatic notifications for task events
- **Messaging System**: Notifications for new messages and mentions
- **KPI & Goals**: Progress updates and achievement notifications
- **Team Management**: Team-related notifications and updates
- **Calendar System**: Reminder notifications for scheduled events

## Testing

### API Testing

- All endpoints tested with various input scenarios
- Error handling validation for edge cases
- Authentication and authorization testing
- Bulk operation testing with large datasets

### Integration Testing

- End-to-end notification flow testing
- User preference persistence testing
- Cross-system notification triggering
- Performance testing with high notification volumes

## Monitoring & Logging

### Metrics Tracked

- Notification creation rates
- Delivery success rates
- User engagement metrics
- Error rates and types
- Performance response times

### Logging

- All notification operations logged
- Error logging with stack traces
- User action logging for audit trails
- Performance logging for optimization

This notification system provides a robust foundation for user engagement and system communication, with comprehensive features for managing notifications, user preferences, and delivery methods.



