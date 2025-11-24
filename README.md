# AI Task Manager Backend

A comprehensive Node.js backend for the AI-powered task management system with gamification, analytics, and real-time features.

## 🚀 Features

- **User Management**: Authentication, authorization, and user profiles
- **Task Management**: CRUD operations, assignments, and progress tracking
- **AI Integration**: Smart task assignment and suggestions
- **Real-time Updates**: WebSocket support for live notifications
- **Gamification**: Points, badges, and achievement system
- **Analytics**: Comprehensive reporting and KPI tracking
- **File Management**: Document uploads and management
- **Team Collaboration**: Team and department management
- **Pomodoro Timer**: Focus time tracking
- **Search & Export**: Advanced search and data export capabilitie

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.IO
- **Documentation**: Swagger/OpenAPI
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

## 🚀 Quick Start

### Option 1: Docker (Recommended)

The fastest way to get started:

```bash
# Copy environment file
cp .env.docker .env

# Edit .env with your configuration
# Then deploy with Docker
bash deploy.sh
```

✅ **Done!** Backend is running at http://localhost:5000

📚 **Docker Documentation**:
- [Quick Start Guide](./DOCKER_QUICKSTART.md) - Get running in 5 minutes
- [Full Docker Guide](./DOCKER_README.md) - Complete Docker documentation

### Option 2: Local Development

#### 1. Clone and Install Dependencies

```bash
cd backend
npm install
```

#### 2. Environment Configuration

Copy the environment example file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-task-manager
JWT_SECRET=your-super-secret-jwt-key-here
CLIENT_URL=http://localhost:3000
```

### 3. Database Setup

Ensure MongoDB is running and accessible at the URI specified in your `.env` file.

### 4. Start the Server

**Development mode:**

```bash
npm run dev
```

**Production mode:**

```bash
npm start
```

The server will start on port 5000 (or the port specified in your `.env` file).

## 📚 API Documentation

Once the server is running, you can access the interactive API documentation at:

```
http://localhost:5000/api/docs
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/change-password` - Change password (authenticated)
- `GET /api/auth/verify` - Verify JWT token

## 🧪 Testing the API

### Prerequisites for Testing

1. **Install Testing Tools:**

   ```bash
   # Install Postman, Insomnia, or use curl
   # For VS Code users: Install "REST Client" extension
   ```

2. **Database Setup:**

   ```bash
   # Seed the database with sample data
   npm run db:seed
   ```

3. **Default Test Users:**
   ```
   Admin: admin@moveit.com / admin123
   Manager: sarah@moveit.com / password123
   Employee: mike@moveit.com / password123
   Designer: emily@moveit.com / password123
   ```

### 🔑 Getting Authentication Tokens

#### 1. Login to Get JWT Token

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@moveit.com",
    "password": "admin123"
  }'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id_here",
    "name": "Admin User",
    "email": "admin@moveit.com",
    "role": "admin"
  }
}
```

#### 2. Use Token in Headers

```bash
# Set your token for subsequent requests
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use in requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/dashboard
```

### 👥 Role-Based Endpoint Testing

#### 🎯 **Admin Role** (`admin@moveit.com`)

**Full System Access - Can test ALL endpoints**

```bash
# 1. User Management
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer $TOKEN"

# 2. Create New User
curl -X POST http://localhost:5000/api/auth/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@moveit.com",
    "password": "password123",
    "role": "employee"
  }'

# 3. System Settings
curl -X GET http://localhost:5000/api/settings \
  -H "Authorization: Bearer $TOKEN"

# 4. Analytics & Reports
curl -X GET http://localhost:5000/api/analytics \
  -H "Authorization: Bearer $TOKEN"

# 5. All Task Operations
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Admin Created Task",
    "description": "Task created by admin",
    "assignedTo": "user_id_here",
    "priority": "high",
    "deadline": "2024-12-31"
  }'
```

#### 👨‍💼 **Manager Role** (`sarah@moveit.com`)

**Team Management & Task Assignment Access**

```bash
# 1. Team Dashboard
curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer $TOKEN"

# 2. Create Tasks for Team
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team Task",
    "description": "Task for the team",
    "assignedTo": "team_member_id",
    "priority": "medium",
    "deadline": "2024-12-31"
  }'

# 3. Team Analytics
curl -X GET http://localhost:5000/api/team/analytics \
  -H "Authorization: Bearer $TOKEN"

# 4. Assign KPIs
curl -X POST http://localhost:5000/api/kpis \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Team Productivity",
    "targetValue": 85,
    "assignedTo": "team_member_id"
  }'

# 5. Update Task Progress
curl -X PATCH http://localhost:5000/api/tasks/task_id_here/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 75,
    "notes": "Making good progress"
  }'
```

#### 👷 **Employee Role** (`mike@moveit.com`)

**Personal Task Management & Progress Updates**

```bash
# 1. Personal Dashboard
curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer $TOKEN"

# 2. View Assigned Tasks
curl -X GET http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $TOKEN"

# 3. Update Task Progress
curl -X PATCH http://localhost:5000/api/tasks/task_id_here/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 50,
    "notes": "Halfway done"
  }'

# 4. Complete Task
curl -X PATCH http://localhost:5000/api/tasks/task_id_here/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 100,
    "status": "completed",
    "notes": "Task completed successfully"
  }'

# 5. Report Blockers
curl -X PATCH http://localhost:5000/api/tasks/task_id_here/blockers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add",
    "description": "Waiting for design approval"
  }'

# 6. Use Pomodoro Timer
curl -X POST http://localhost:5000/api/timer/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 25,
    "type": "pomodoro",
    "taskId": "task_id_here"
  }'

# 7. Check Timer Stats
curl -X GET http://localhost:5000/api/timer/stats \
  -H "Authorization: Bearer $TOKEN"
```

#### 🎨 **Designer Role** (`emily@moveit.com`)

**Creative Task Management & File Uploads**

```bash
# 1. View Design Tasks
curl -X GET http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -G -d "category=design"

# 2. Upload Design Files
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@design_file.png" \
  -F "taskId=task_id_here"

# 3. Update Design Progress
curl -X PATCH http://localhost:5000/api/tasks/task_id_here/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "progress": 90,
    "notes": "Final design review needed",
    "files": [{
      "url": "file_url_here",
      "filename": "final_design.png",
      "fileType": "image/png",
      "fileSize": 2048000
    }]
  }'
```

### 📊 **Feature-Specific Testing**

#### 🎯 **Dashboard Testing**

```bash
# Test different dashboard views based on role
curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer $MANAGER_TOKEN"

curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"
```

#### ⏱️ **Timer System Testing**

```bash
# 1. Start Timer
curl -X POST http://localhost:5000/api/timer/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 25,
    "type": "pomodoro",
    "taskId": "task_id_here"
  }'

# 2. Pause Timer
curl -X POST http://localhost:5000/api/timer/pause \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_id_here",
    "remainingTime": 15
  }'

# 3. Resume Timer
curl -X POST http://localhost:5000/api/timer/resume \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_id_here"
  }'

# 4. Stop Timer
curl -X POST http://localhost:5000/api/timer/stop \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_id_here",
    "totalTime": 20
  }'

# 5. Get Timer Statistics
curl -X GET http://localhost:5000/api/timer/stats \
  -H "Authorization: Bearer $TOKEN"
```

#### 📋 **Task Management Testing**

```bash
# 1. Create Task (Admin/Manager only)
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "description": "Task for testing",
    "priority": "medium",
    "deadline": "2024-12-31",
    "estimatedHours": 8
  }'

# 2. Get Tasks with Filtering
curl -X GET "http://localhost:5000/api/tasks?status=pending&priority=high" \
  -H "Authorization: Bearer $TOKEN"

# 3. Update Task
curl -X PUT http://localhost:5000/api/tasks/task_id_here \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "high",
    "deadline": "2024-12-25"
  }'

# 4. Delete Task (Admin/Manager only)
curl -X DELETE http://localhost:5000/api/tasks/task_id_here \
  -H "Authorization: Bearer $TOKEN"
```

#### 🔔 **Real-time Features Testing**

```bash
# 1. Connect to WebSocket
# Use a WebSocket client or browser console

# 2. Join User Room
socket.emit('join-user', 'user_id_here');

# 3. Join Team Room
socket.emit('join-team', 'team_id_here');

# 4. Listen for Real-time Updates
socket.on('task-updated', (data) => {
  console.log('Task updated:', data);
});

socket.on('notification', (data) => {
  console.log('New notification:', data);
});
```

### 🧪 **Testing with Postman/Insomnia**

#### 1. **Environment Setup**

```json
{
  "base_url": "http://localhost:5000/api",
  "admin_token": "",
  "manager_token": "",
  "employee_token": "",
  "designer_token": ""
}
```

#### 2. **Collection Structure**

```
📁 AI Task Manager API
├── 🔐 Authentication
│   ├── Login
│   ├── Register
│   └── Verify Token
├── 👑 Admin Endpoints
│   ├── User Management
│   ├── System Settings
│   └── Analytics
├── 👨‍💼 Manager Endpoints
│   ├── Team Dashboard
│   ├── Task Creation
│   └── KPI Management
├── 👷 Employee Endpoints
│   ├── Personal Dashboard
│   ├── Task Updates
│   └── Timer Management
└── 📊 Feature Testing
    ├── Dashboard
    ├── Tasks
    ├── Timer
    └── Real-time
```

#### 3. **Pre-request Scripts**

```javascript
// Set token based on role
if (pm.environment.get("role") === "admin") {
  pm.request.headers.add({
    key: "Authorization",
    value: "Bearer " + pm.environment.get("admin_token"),
  });
}
```

### 🐛 **Common Testing Scenarios**

#### 1. **Permission Testing**

```bash
# Test access denied scenarios
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"
# Should return 403 Forbidden
```

#### 2. **Validation Testing**

```bash
# Test invalid data
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "",
    "priority": "invalid_priority"
  }'
# Should return 400 Bad Request
```

#### 3. **Authentication Testing**

```bash
# Test without token
curl -X GET http://localhost:5000/api/dashboard
# Should return 401 Unauthorized

# Test with invalid token
curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer invalid_token"
# Should return 401 Unauthorized
```

### 📈 **Performance Testing**

#### 1. **Load Testing with Artillery**

```bash
# Install Artillery
npm install -g artillery

# Create test scenario
artillery quick --count 100 --num 10 http://localhost:5000/api/dashboard
```

#### 2. **Database Query Testing**

```bash
# Test with large datasets
curl -X GET "http://localhost:5000/api/tasks?limit=1000" \
  -H "Authorization: Bearer $TOKEN"
```

### 🔍 **Debugging Tips**

#### 1. **Enable Debug Logging**

```bash
# Set environment variable
export DEBUG=app:*

# Start server
npm run dev
```

#### 2. **Check Database State**

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/ai-task-manager

# Check collections
show collections
db.users.find().pretty()
db.tasks.find().pretty()
```

#### 3. **Monitor API Requests**

```bash
# Watch server logs
tail -f logs/app.log

# Check real-time connections
# Monitor WebSocket connections in server logs
```

### 📝 **Test Data Management**

#### 1. **Reset Database**

```bash
# Clear all data
npm run db:reset

# Re-seed with sample data
npm run db:seed
```

#### 2. **Create Test Scenarios**

```bash
# Create test users
# Create test tasks
# Set up test teams
# Configure test KPIs
```

This comprehensive testing guide ensures you can thoroughly test all API endpoints with different user roles and scenarios.

## 📊 Core API Endpoints

### Tasks

- `GET /api/tasks` - Get all tasks with filtering
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get specific task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get specific user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Dashboard

- `GET /api/dashboard` - Get dashboard data
- `GET /api/dashboard/stats` - Get statistics

### Analytics

- `GET /api/analytics` - Get analytics data
- `GET /api/analytics/productivity` - Productivity metrics
- `GET /api/analytics/efficiency` - Efficiency metrics

## 🔌 WebSocket Events

The backend supports real-time updates via Socket.IO:

### Connection Events

- `join-user` - Join user's personal room
- `join-team` - Join team room
- `join-department` - Join department room

### Feature-specific Rooms

- `join-notifications` - Real-time notifications
- `join-chat` - Real-time chat
- `join-tasks` - Real-time task updates
- `join-analytics` - Real-time analytics

## 🗄️ Database Models

### Core Models

- **User**: User accounts and profiles
- **Task**: Task definitions and progress
- **Project**: Project organization
- **Team**: Team management
- **Department**: Organizational structure

### Feature Models

- **KPI**: Key Performance Indicators
- **Goal**: User and team goals
- **Notification**: System notifications
- **ChatMessage**: Messaging system
- **File**: File management
- **Analytics**: Performance metrics

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 📝 Development

### Code Style

- Use ESLint for code linting
- Follow Express.js best practices
- Use async/await for asynchronous operations
- Implement proper error handling

### Adding New Features

1. Create the model in `models/` directory
2. Create the route in `routes/` directory
3. Add the route to `app.js`
4. Update Swagger documentation
5. Add tests

### Database Migrations

For schema changes, create migration scripts in the `scripts/` directory.

## 🚀 Deployment

### Environment Variables

Ensure all required environment variables are set in production:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
CLIENT_URL=your-frontend-url
```

### Process Management

Use PM2 or similar process manager for production:

```bash
npm install -g pm2
pm2 start server.js --name "ai-task-manager"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Check the API documentation at `/api/docs`
- Review the codebase and existing implementations
- Create an issue for bugs or feature requests

## 🔄 Frontend Integration

This backend is designed to work with the Next.js frontend. The frontend should:

1. Make API calls to `http://localhost:5000/api/*`
2. Handle JWT authentication
3. Implement WebSocket connections for real-time features
4. Use the provided API endpoints for all data operations

## 📈 Performance Considerations

- Database indexing on frequently queried fields
- Rate limiting on API endpoints
- Connection pooling for database connections
- Caching for frequently accessed data
- Compression for response payloads
