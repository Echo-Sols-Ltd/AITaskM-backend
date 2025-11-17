# REAL-TIME WebSocket System

## Overview

The REAL-TIME system provides WebSocket endpoints for real-time communication across the AI Task Manager application. It enables instant updates for notifications, chat messages, task updates, and analytics data without requiring page refreshes.

## Features

### 🔌 **WebSocket Infrastructure**

- **Socket.IO Integration**: Built on Socket.IO for reliable real-time communication
- **Room-based Architecture**: Users join specific rooms for targeted updates
- **Authentication**: JWT-based authentication for secure connections
- **CORS Support**: Configurable CORS for cross-origin connections

### 📡 **Real-time Endpoints**

#### 1. **WS /ws/notifications** - Real-time Notifications

- **Purpose**: Receive instant notification updates
- **Events Emitted**:
  - `new-notification`: When a new notification is created
  - `notification-read`: When a notification is marked as read
  - `notification-deleted`: When a notification is deleted
  - `notifications-bulk-read`: When multiple notifications are marked as read

#### 2. **WS /ws/chat** - Real-time Chat

- **Purpose**: Receive instant chat message updates
- **Events Emitted**:
  - `new-message`: When a new message is sent
  - `message-updated`: When a message is edited
  - `message-deleted`: When a message is deleted
  - `message-reaction`: When reactions are added/updated

#### 3. **WS /ws/tasks** - Real-time Task Updates

- **Purpose**: Receive instant task status and progress updates
- **Events Emitted**:
  - `task-assigned`: When a task is assigned
  - `task-updated`: When task details are modified
  - `task-status-updated`: When task status changes
  - `task-progress-updated`: When task progress is updated
  - `task-completed`: When a task is completed
  - `task-note-added`: When notes/comments are added

#### 4. **WS /ws/analytics** - Real-time Analytics

- **Purpose**: Receive instant analytics data updates
- **Events Emitted**:
  - `productivity-updated`: When productivity metrics change
  - `efficiency-updated`: When efficiency metrics change
  - `quality-updated`: When quality metrics change

## Technical Implementation

### **Server-Side (Node.js + Socket.IO)**

#### **Connection Handling** (`app.js`)

```javascript
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // Join user to their personal room
  socket.on("join-user", (userId) => {
    socket.join(`user-${userId}`);
  });

  // Join team room
  socket.on("join-team", (teamId) => {
    socket.join(`team-${teamId}`);
  });

  // Join department room
  socket.on("join-department", (departmentId) => {
    socket.join(`department-${departmentId}`);
  });

  // REAL-TIME ENDPOINTS
  socket.on("join-notifications", (userId) => {
    socket.join(`notifications-${userId}`);
  });

  socket.on("join-chat", (conversationId) => {
    socket.join(`chat-${conversationId}`);
  });

  socket.on("join-tasks", (userId) => {
    socket.join(`tasks-${userId}`);
  });

  socket.on("join-analytics", (userId) => {
    socket.join(`analytics-${userId}`);
  });
});
```

#### **Real-time Event Emission**

Each route file now includes real-time event emissions:

**Notifications** (`routes/notification.js`):

```javascript
// Emit real-time notification to user
if (req.io) {
  req.io.to(`notifications-${userId}`).emit("new-notification", notification);
}
```

**Chat** (`routes/chat.js`):

```javascript
// Emit real-time message to all conversation participants
if (req.io) {
  req.io.to(`chat-${conversationId}`).emit("new-message", message);
}
```

**Analytics** (`routes/analytics.js`):

```javascript
// Emit real-time analytics update
if (req.io) {
  req.io
    .to(`analytics-${req.user._id}`)
    .emit("productivity-updated", productivityData);
}
```

### **Client-Side Integration**

#### **Socket.IO Client Setup**

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: localStorage.getItem("token"),
  },
});
```

#### **Joining Real-time Rooms**

```javascript
// Join notifications room
socket.emit("join-notifications", userId);

// Join chat room
socket.emit("join-chat", conversationId);

// Join tasks room
socket.emit("join-tasks", userId);

// Join analytics room
socket.emit("join-analytics", userId);
```

#### **Listening to Real-time Events**

```javascript
// Listen for new notifications
socket.on("new-notification", (notification) => {
  console.log("New notification:", notification);
  // Update UI
});

// Listen for new chat messages
socket.on("new-message", (message) => {
  console.log("New message:", message);
  // Update chat UI
});

// Listen for task updates
socket.on("task-updated", (taskData) => {
  console.log("Task updated:", taskData);
  // Update task UI
});

// Listen for analytics updates
socket.on("productivity-updated", (analyticsData) => {
  console.log("Productivity updated:", analyticsData);
  // Update analytics UI
});
```

## API Documentation

### **Swagger Integration**

All WebSocket endpoints are documented in `swagger.json` under the "REAL-TIME" tag:

- `GET /ws/notifications` - Real-time notifications endpoint
- `GET /ws/chat` - Real-time chat endpoint
- `GET /ws/tasks` - Real-time task updates endpoint
- `GET /ws/analytics` - Real-time analytics endpoint

### **Event Schemas**

Comprehensive schemas for all WebSocket events:

- `NotificationEvent` - Notification-related events
- `ChatEvent` - Chat message events
- `TaskEvent` - Task update events
- `AnalyticsEvent` - Analytics update events

## Security Features

### **Authentication**

- JWT token validation for WebSocket connections
- User-specific room access control
- Secure event emission to authorized users only

### **Authorization**

- Role-based access control for sensitive operations
- User isolation in personal rooms
- Team/department room access validation

### **Data Protection**

- No sensitive data exposure in WebSocket events
- User ID validation before room joining
- Secure event routing to appropriate users

## Performance Considerations

### **Room Management**

- Efficient room joining/leaving
- Automatic cleanup on disconnection
- Memory-efficient event broadcasting

### **Event Optimization**

- Minimal data payload in events
- Selective event emission based on user context
- Rate limiting for high-frequency events

### **Scalability**

- Horizontal scaling support via Redis adapter
- Load balancing across multiple Socket.IO instances
- Efficient event distribution in clustered environments

## Error Handling

### **Connection Errors**

```javascript
socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  // Implement reconnection logic
});
```

### **Reconnection Strategy**

```javascript
socket.on("disconnect", (reason) => {
  if (reason === "io server disconnect") {
    // Server disconnected, reconnect manually
    socket.connect();
  }
});
```

### **Event Error Handling**

```javascript
socket.on("error", (error) => {
  console.error("Socket error:", error);
  // Handle specific error types
});
```

## Monitoring & Logging

### **Connection Monitoring**

- Real-time connection count tracking
- User activity monitoring
- Performance metrics collection

### **Event Logging**

- Event emission logging for debugging
- User action tracking
- Error event logging

### **Health Checks**

- WebSocket endpoint health monitoring
- Connection stability metrics
- Performance degradation alerts

## Testing

### **Unit Tests**

```javascript
describe("WebSocket Events", () => {
  test("should emit new-notification event", async () => {
    // Test notification event emission
  });

  test("should emit new-message event", async () => {
    // Test chat message event emission
  });
});
```

### **Integration Tests**

```javascript
describe("Real-time Integration", () => {
  test("should receive real-time updates", async () => {
    // Test end-to-end real-time functionality
  });
});
```

### **Load Testing**

- Multiple concurrent connections
- High-frequency event emission
- Memory usage under load

## Future Enhancements

### **Advanced Features**

- **Presence Indicators**: Show online/offline status
- **Typing Indicators**: Real-time typing notifications
- **Read Receipts**: Message read status tracking
- **Push Notifications**: Mobile push integration

### **Performance Improvements**

- **Event Batching**: Batch multiple events for efficiency
- **Compression**: Event payload compression
- **Caching**: Event caching for offline users

### **Scalability Features**

- **Redis Adapter**: Multi-server support
- **Message Queues**: Reliable event delivery
- **CDN Integration**: Global real-time delivery

## Troubleshooting

### **Common Issues**

#### **Connection Failures**

- Check server status and port configuration
- Verify CORS settings
- Check authentication token validity

#### **Event Not Received**

- Verify room joining with correct IDs
- Check event emission in server logs
- Validate client-side event listeners

#### **Performance Issues**

- Monitor memory usage and connection count
- Check for memory leaks in event handlers
- Optimize event payload size

### **Debug Mode**

Enable debug logging for detailed WebSocket activity:

```javascript
const socket = io("http://localhost:3000", {
  debug: true,
});
```

## Conclusion

The REAL-TIME WebSocket system provides a robust foundation for real-time communication in the AI Task Manager. With proper implementation, monitoring, and optimization, it delivers a seamless real-time experience for users while maintaining security and performance standards.

For additional support or questions, refer to the Socket.IO documentation or contact the development team.


