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
const Logger = require('./utils/logger');

// Route imports
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/task');
const kpiRoutes = require('./routes/kpi');
const dashboardRoutes = require('./routes/dashboard');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notification');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/team');
const projectRoutes = require('./routes/project');
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

// Initialize logger
const logger = new Logger('APP');
logger.info('Starting MoveIt Task Manager Backend');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

logger.info('Express server initialized');

// Middleware
logger.info('Configuring middleware');

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Request logging
app.use(Logger.requestLogger());

// MongoDB sanitization
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: '_' });
  next();
});

// MongoDB connection
logger.info('Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('✅ MongoDB connected successfully', {
      database: mongoose.connection.name,
      host: mongoose.connection.host
    });
  })
  .catch(err => {
    logger.error('❌ MongoDB connection error', {
      error: err.message,
      stack: err.stack
    });
    process.exit(1);
  });

// WebSocket middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
logger.info('Registering API routes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/kpis', kpiRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/projects', projectRoutes);
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

logger.info('All routes registered successfully');

// Swagger documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// WebSocket connection handling
const wsLogger = new Logger('WEBSOCKET');

io.on('connection', (socket) => {
  wsLogger.info('User connected', { socketId: socket.id });
  
  // Join user to their personal room
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    wsLogger.info('User joined personal room', { userId, socketId: socket.id });
  });
  
  // Join team room
  socket.on('join-team', (teamId) => {
    socket.join(`team-${teamId}`);
    wsLogger.info('User joined team room', { teamId, socketId: socket.id });
  });
  
  // Join department room
  socket.on('join-department', (departmentId) => {
    socket.join(`department-${departmentId}`);
    wsLogger.info('User joined department room', { departmentId, socketId: socket.id });
  });

  // ===== REAL-TIME ENDPOINTS =====
  
  // WS /ws/notifications - Real-time notifications
  socket.on('join-notifications', (userId) => {
    socket.join(`notifications-${userId}`);
    wsLogger.info('User joined notifications room', { userId, socketId: socket.id });
  });

  // WS /ws/chat - Real-time chat
  socket.on('join-chat', (conversationId) => {
    socket.join(`chat-${conversationId}`);
    wsLogger.info('User joined chat room', { conversationId, socketId: socket.id });
  });

  // WS /ws/tasks - Real-time task updates
  socket.on('join-tasks', (userId) => {
    socket.join(`tasks-${userId}`);
    wsLogger.info('User joined tasks room', { userId, socketId: socket.id });
  });

  // WS /ws/analytics - Real-time analytics
  socket.on('join-analytics', (userId) => {
    socket.join(`analytics-${userId}`);
    wsLogger.info('User joined analytics room', { userId, socketId: socket.id });
  });

  // Handle real-time events
  socket.on('disconnect', () => {
    wsLogger.info('User disconnected', { socketId: socket.id });
  });
});

// Error logging middleware
app.use(Logger.errorLogger());

// Error handler
app.use((err, req, res, next) => {
  const errorLogger = new Logger('ERROR');
  errorLogger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({ 
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  const notFoundLogger = new Logger('HTTP');
  notFoundLogger.warn('Route not found', { path: req.originalUrl, method: req.method });
  res.status(404).json({ message: 'Route not found' });
});

module.exports = { app, server, io };
