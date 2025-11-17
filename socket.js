const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

// Store online users
const onlineUsers = new Map();

function initializeSocket(server) {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);
    
    // Add user to online users
    onlineUsers.set(socket.userId, {
      socketId: socket.id,
      userId: socket.userId,
      role: socket.userRole,
      connectedAt: new Date()
    });

    // Broadcast user online status
    socket.broadcast.emit('user-online', socket.userId);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Handle joining notification room
    socket.on('join-notifications', (userId) => {
      socket.join(`notifications:${userId}`);
      console.log(`🔔 User ${userId} joined notifications room`);
    });

    // Handle joining task room
    socket.on('join-tasks', (userId) => {
      socket.join(`tasks:${userId}`);
      console.log(`📋 User ${userId} joined tasks room`);
    });

    // Handle joining team room
    socket.on('join-team', (teamId) => {
      socket.join(`team:${teamId}`);
      console.log(`👥 User ${socket.userId} joined team room: ${teamId}`);
    });

    // Handle joining chat room
    socket.on('join-chat', (conversationId) => {
      socket.join(`chat:${conversationId}`);
      console.log(`💬 User ${socket.userId} joined chat room: ${conversationId}`);
    });

    // Handle task updates
    socket.on('task-update', (task) => {
      // Broadcast to all users in the task's team
      if (task.teamId) {
        io.to(`team:${task.teamId}`).emit('task-updated', task);
      }
      // Also send to assigned user
      if (task.assignedTo) {
        io.to(`user:${task.assignedTo}`).emit('task-updated', task);
      }
    });

    // Handle task creation
    socket.on('task-create', (task) => {
      // Broadcast to team
      if (task.teamId) {
        io.to(`team:${task.teamId}`).emit('task-created', task);
      }
      // Notify assigned user
      if (task.assignedTo) {
        io.to(`user:${task.assignedTo}`).emit('task-created', task);
        io.to(`notifications:${task.assignedTo}`).emit('notification', {
          title: 'New Task Assigned',
          message: `You have been assigned: ${task.title}`,
          type: 'info',
          actionUrl: `/tasks/${task.id}`
        });
      }
    });

    // Handle task deletion
    socket.on('task-delete', (taskId) => {
      // Broadcast to all connected users
      socket.broadcast.emit('task-deleted', taskId);
    });

    // Handle chat messages
    socket.on('send-message', ({ conversationId, message, attachments }) => {
      const messageData = {
        id: Date.now().toString(),
        senderId: socket.userId,
        conversationId,
        message,
        attachments,
        timestamp: new Date()
      };
      
      // Broadcast to all users in the conversation
      io.to(`chat:${conversationId}`).emit('message', messageData);
    });

    // Handle typing indicators
    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`chat:${conversationId}`).emit('typing', {
        userId: socket.userId,
        isTyping
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
      
      // Remove from online users
      onlineUsers.delete(socket.userId);
      
      // Broadcast user offline status
      socket.broadcast.emit('user-offline', socket.userId);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
}

// Helper functions to emit events from other parts of the app
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

function emitToTeam(teamId, event, data) {
  if (io) {
    io.to(`team:${teamId}`).emit(event, data);
  }
}

function emitNotification(userId, notification) {
  if (io) {
    io.to(`notifications:${userId}`).emit('notification', notification);
  }
}

function emitTaskUpdate(task) {
  if (io) {
    // Emit to team
    if (task.teamId) {
      io.to(`team:${task.teamId}`).emit('task-updated', task);
    }
    // Emit to assigned user
    if (task.assignedTo) {
      io.to(`user:${task.assignedTo}`).emit('task-updated', task);
    }
  }
}

function getOnlineUsers() {
  return Array.from(onlineUsers.values());
}

function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

module.exports = {
  initializeSocket,
  emitToUser,
  emitToTeam,
  emitNotification,
  emitTaskUpdate,
  getOnlineUsers,
  isUserOnline
};
