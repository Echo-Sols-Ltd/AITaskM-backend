const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

// Route imports
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/task');
const kpiRoutes = require('./routes/kpi');
const dashboardRoutes = require('./routes/dashboard');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notification');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/team');
const aiRoutes = require('./routes/ai');
const gamificationRoutes = require('./routes/gamification');
const timerRoutes = require('./routes/timer');
const goalRoutes = require('./routes/goals');
const fileRoutes = require('./routes/files');
const organizationRoutes = require('./routes/organization');
const analyticsRoutes = require('./routes/analytics');
const reportsRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const searchRoutes = require('./routes/search');
const exportRoutes = require('./routes/export');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: '_' });
  next();
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// WebSocket middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/export', exportRoutes);

// Swagger documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user to their personal room
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
  });
  
  // Join team room
  socket.on('join-team', (teamId) => {
    socket.join(`team-${teamId}`);
  });
  
  // Join department room
  socket.on('join-department', (departmentId) => {
    socket.join(`department-${departmentId}`);
  });

  // ===== REAL-TIME ENDPOINTS =====
  
  // WS /ws/notifications - Real-time notifications
  socket.on('join-notifications', (userId) => {
    socket.join(`notifications-${userId}`);
    console.log(`User ${userId} joined notifications room`);
  });

  // WS /ws/chat - Real-time chat
  socket.on('join-chat', (conversationId) => {
    socket.join(`chat-${conversationId}`);
    console.log(`User joined chat room: ${conversationId}`);
  });

  // WS /ws/tasks - Real-time task updates
  socket.on('join-tasks', (userId) => {
    socket.join(`tasks-${userId}`);
    console.log(`User ${userId} joined tasks room`);
  });

  // WS /ws/analytics - Real-time analytics
  socket.on('join-analytics', (userId) => {
    socket.join(`analytics-${userId}`);
    console.log(`User ${userId} joined analytics room`);
  });

  // Handle real-time events
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = { app, server, io };
