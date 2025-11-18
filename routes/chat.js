const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const Conversation = require('../models/Conversation');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/chat/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only supported file types are allowed'));
    }
  }
});

// ===== CONVERSATION MANAGEMENT =====

// Get all conversations for the authenticated user
router.get('/conversations', authenticateJWT, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      isActive: true
    })
    .populate('participants', 'name email role avatar')
    .populate('lastMessage')
    .populate('admins', 'name email role')
    .sort({ lastActivity: -1 });

    res.json({
      message: 'Conversations retrieved successfully',
      conversations
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch conversations', error: err.message });
  }
});

// Get conversation by ID
router.get('/conversations/:id', authenticateJWT, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'name email role avatar')
      .populate('lastMessage')
      .populate('admins', 'name email role')
      .populate('metadata.project', 'name')
      .populate('metadata.team', 'name')
      .populate('metadata.task', 'title');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is a participant
    if (!conversation.participants.some(p => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    res.json({
      message: 'Conversation retrieved successfully',
      conversation
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch conversation', error: err.message });
  }
});

// Create new conversation
router.post('/conversations', authenticateJWT, async (req, res) => {
  try {
    const { name, type, participants, projectId, teamId, taskId } = req.body;

    if (!type || !participants || participants.length === 0) {
      return res.status(400).json({ message: 'Type and participants are required' });
    }

    // Add creator to participants if not already included
    if (!participants.includes(req.user._id.toString())) {
      participants.push(req.user._id.toString());
    }

    const conversation = new Conversation({
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Chat`,
      type,
      participants,
      admins: [req.user._id],
      metadata: {
        project: projectId || null,
        team: teamId || null,
        task: taskId || null
      }
    });

    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name email role avatar')
      .populate('admins', 'name email role');

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation: populatedConversation
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create conversation', error: err.message });
  }
});

// Delete conversation
router.delete('/conversations/:id', authenticateJWT, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is admin
    if (!conversation.admins.some(admin => admin.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can delete conversations' });
    }

    // Soft delete - mark as inactive
    conversation.isActive = false;
    await conversation.save();

    res.json({
      message: 'Conversation deleted successfully',
      conversationId: req.params.id
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete conversation', error: err.message });
  }
});

// ===== MESSAGE MANAGEMENT =====

// Get messages by conversation ID
router.get('/messages/:convId', authenticateJWT, async (req, res) => {
  try {
    const { convId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if user has access to this conversation
    const conversation = await Conversation.findById(convId);
    if (!conversation || !conversation.isActive) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    const messages = await ChatMessage.find({
      conversation: convId,
      isDeleted: false
    })
    .populate('sender', 'name email role avatar')
    .populate('replyTo', 'message sender')
    .populate('mentions', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await ChatMessage.countDocuments({
      conversation: convId,
      isDeleted: false
    });

    res.json({
      message: 'Messages retrieved successfully',
      messages: messages.reverse(), // Show oldest first
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalMessages: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
});

// Send message to conversation
router.post('/conversations/:id/messages', authenticateJWT, async (req, res) => {
  try {
    const { content, type = 'text', replyTo, attachments } = req.body;
    const conversationId = req.params.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is a participant
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    const chatMessage = new ChatMessage({
      conversation: conversationId,
      sender: req.user._id,
      message: content, // Model uses 'message' field
      messageType: type,
      replyTo,
      attachments
    });

    await chatMessage.save();

    // Update conversation last activity
    conversation.lastMessage = chatMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Populate sender info for real-time emission
    await chatMessage.populate('sender', 'name email role avatar');

    // Emit real-time message to all conversation participants
    if (req.io) {
      req.io.to(`chat:${conversationId}`).emit('new-message', chatMessage);
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: chatMessage
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

// Update message
router.put('/messages/:id', authenticateJWT, async (req, res) => {
  try {
    const { content, attachments } = req.body;
    const chatMessage = await ChatMessage.findById(req.params.id);
    
    if (!chatMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check permissions
    if (chatMessage.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only edit your own messages' });
    }

    // Check if conversation allows editing
    const conversation = await Conversation.findById(chatMessage.conversation);
    if (!conversation || !conversation.settings.allowEditing) {
      return res.status(403).json({ message: 'Editing not allowed in this conversation' });
    }

    chatMessage.message = content; // Model uses 'message' field
    if (attachments) chatMessage.attachments = attachments;
    chatMessage.editedAt = new Date();
    chatMessage.isEdited = true;

    await chatMessage.save();

    // Emit real-time update
    if (req.io) {
      req.io.to(`chat:${chatMessage.conversation}`).emit('message-updated', {
        messageId: chatMessage._id,
        content: chatMessage.message,
        attachments: chatMessage.attachments,
        editedAt: chatMessage.editedAt,
        isEdited: true
      });
    }

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: chatMessage
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update message', error: err.message });
  }
});

// Delete message
router.delete('/messages/:id', authenticateJWT, async (req, res) => {
  try {
    const chatMessage = await ChatMessage.findById(req.params.id);
    
    if (!chatMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check permissions
    if (chatMessage.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only delete your own messages' });
    }

    // Check if conversation allows deletion
    const conversation = await Conversation.findById(chatMessage.conversation);
    if (!conversation || !conversation.settings.allowDeletion) {
      return res.status(403).json({ message: 'Deletion not allowed in this conversation' });
    }

    const conversationId = chatMessage.conversation;
    
    // Soft delete
    chatMessage.isDeleted = true;
    chatMessage.deletedAt = new Date();
    chatMessage.deletedBy = req.user._id;
    await chatMessage.save();

    // Emit real-time deletion
    if (req.io) {
      req.io.to(`chat:${conversationId}`).emit('message-deleted', {
        messageId: req.params.id
      });
    }

    res.json({ 
      success: true,
      message: 'Message deleted successfully' 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete message', error: err.message });
  }
});

// Mark message as read
router.post('/messages/:id/read', authenticateJWT, async (req, res) => {
  try {
    const chatMessage = await ChatMessage.findById(req.params.id);
    
    if (!chatMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if already marked as read by this user
    const alreadyRead = chatMessage.readBy.some(
      r => r.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      chatMessage.readBy.push({
        user: req.user._id,
        readAt: new Date()
      });
      await chatMessage.save();

      // Emit real-time read receipt
      if (req.io) {
        req.io.to(`chat:${chatMessage.conversation}`).emit('message-read', {
          messageId: chatMessage._id,
          userId: req.user._id.toString(),
          readAt: new Date()
        });
      }
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark message as read', error: err.message });
  }
});

// Mark all messages in conversation as read
router.post('/conversations/:id/read', authenticateJWT, async (req, res) => {
  try {
    const conversationId = req.params.id;
    
    // Find all unread messages in this conversation
    const unreadMessages = await ChatMessage.find({
      conversation: conversationId,
      'readBy.user': { $ne: req.user._id },
      sender: { $ne: req.user._id }, // Don't mark own messages
      isDeleted: false
    });

    // Mark all as read
    for (const message of unreadMessages) {
      message.readBy.push({
        user: req.user._id,
        readAt: new Date()
      });
      await message.save();
    }

    // Emit real-time read receipts
    if (req.io && unreadMessages.length > 0) {
      req.io.to(`chat:${conversationId}`).emit('messages-read', {
        messageIds: unreadMessages.map(m => m._id.toString()),
        userId: req.user._id.toString(),
        readAt: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Messages marked as read',
      count: unreadMessages.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark messages as read', error: err.message });
  }
});

// Add reaction to message
router.post('/messages/:id/reactions', authenticateJWT, async (req, res) => {
  try {
    const { emoji, type } = req.body;
    const chatMessage = await ChatMessage.findById(req.params.id);
    
    if (!chatMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if conversation allows reactions
    const conversation = await Conversation.findById(chatMessage.conversation);
    if (!conversation || !conversation.settings?.allowReactions === false) {
      return res.status(403).json({ message: 'Reactions not allowed in this conversation' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = chatMessage.reactions.find(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction if already exists (toggle)
      chatMessage.reactions = chatMessage.reactions.filter(
        r => !(r.user.toString() === req.user._id.toString() && r.emoji === emoji)
      );
    } else {
      // Add new reaction
      chatMessage.reactions.push({
        user: req.user._id,
        emoji
      });
    }

    await chatMessage.save();

    // Emit real-time reaction update
    if (req.io) {
      req.io.to(`chat:${chatMessage.conversation}`).emit('reaction-added', {
        messageId: chatMessage._id,
        reaction: {
          emoji,
          userId: req.user._id.toString(),
          userName: req.user.name
        }
      });
    }

    res.json({
      success: true,
      message: 'Reaction updated successfully',
      reactions: chatMessage.reactions
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add reaction', error: err.message });
  }
});

// ===== FILE HANDLING =====

// Upload file to chat
router.post('/upload', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { conversationId, description } = req.body;

    if (!conversationId) {
      return res.status(400).json({ message: 'Conversation ID is required' });
    }

    // Check if user has access to this conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isActive) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    // Check if conversation allows file uploads
    if (!conversation.settings.allowFileUploads) {
      return res.status(403).json({ message: 'File uploads are not allowed in this conversation' });
    }

    // Create file message
    const chatMessage = new ChatMessage({
      conversation: conversationId,
      sender: req.user._id,
      message: description || 'File uploaded',
      messageType: 'file',
      attachments: [{
        url: `/uploads/chat/${req.file.filename}`,
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size
      }]
    });

    await chatMessage.save();

    // Update conversation last activity and last message
    conversation.lastMessage = chatMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate('sender', 'name email role avatar');

    res.status(201).json({
      message: 'File uploaded successfully',
      chatMessage: populatedMessage
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload file', error: err.message });
  }
});

// Get chat files for a conversation
router.get('/files/:convId', authenticateJWT, async (req, res) => {
  try {
    const { convId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check if user has access to this conversation
    const conversation = await Conversation.findById(convId);
    if (!conversation || !conversation.isActive) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    const fileMessages = await ChatMessage.find({
      conversation: convId,
      messageType: 'file',
      isDeleted: false,
      'attachments.0': { $exists: true }
    })
    .populate('sender', 'name email role avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await ChatMessage.countDocuments({
      conversation: convId,
      messageType: 'file',
      isDeleted: false,
      'attachments.0': { $exists: true }
    });

    // Extract files from messages
    const files = fileMessages.reduce((acc, message) => {
      message.attachments.forEach(attachment => {
        acc.push({
          id: message._id,
          filename: attachment.filename,
          fileType: attachment.fileType,
          fileSize: attachment.fileSize,
          url: attachment.url,
          uploadedBy: message.sender,
          uploadedAt: message.createdAt,
          messageId: message._id
        });
      });
      return acc;
    }, []);

    res.json({
      message: 'Chat files retrieved successfully',
      files,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalFiles: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch chat files', error: err.message });
  }
});

// Delete chat file
router.delete('/files/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const chatMessage = await ChatMessage.findById(id);

    if (!chatMessage) {
      return res.status(404).json({ message: 'File message not found' });
    }

    if (chatMessage.messageType !== 'file') {
      return res.status(400).json({ message: 'This message is not a file message' });
    }

    // Check if user is the sender or admin
    const conversation = await Conversation.findById(chatMessage.conversation);
    const isAdmin = conversation.admins.some(admin => admin.toString() === req.user._id.toString());
    const isSender = chatMessage.sender.toString() === req.user._id.toString();

    if (!isAdmin && !isSender) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if conversation allows deletion
    if (!conversation.settings.allowDeletion) {
      return res.status(403).json({ message: 'Deletion is not allowed in this conversation' });
    }

    // Soft delete
    chatMessage.isDeleted = true;
    chatMessage.deletedAt = new Date();
    chatMessage.deletedBy = req.user._id;
    await chatMessage.save();

    res.json({
      message: 'Chat file deleted successfully',
      fileId: id
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete chat file', error: err.message });
  }
});

// ===== LEGACY TASK-BASED CHAT (for backward compatibility) =====

// Send a chat message within a task
router.post('/:taskId', authenticateJWT, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required.' });
    
    // Find or create conversation for this task
    let conversation = await Conversation.findOne({
      'metadata.task': req.params.taskId,
      type: 'task'
    });

    if (!conversation) {
      // Create new task conversation
      conversation = new Conversation({
        name: `Task Chat`,
        type: 'task',
        participants: [req.user._id],
        admins: [req.user._id],
        metadata: {
          task: req.params.taskId
        }
      });
      await conversation.save();
    }

    const chatMsg = new ChatMessage({
      conversation: conversation._id,
      sender: req.user._id,
      message,
    });
    await chatMsg.save();

    // Update conversation last activity
    conversation.lastMessage = chatMsg._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    res.status(201).json(chatMsg);
  } catch (err) {
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

// Get all chat messages for a task
router.get('/:taskId', authenticateJWT, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      'metadata.task': req.params.taskId,
      type: 'task'
    });

    if (!conversation) {
      return res.json([]);
    }

    const messages = await ChatMessage.find({ 
      conversation: conversation._id,
      isDeleted: false 
    }).populate('sender', 'name email role');
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch messages', error: err.message });
  }
});

module.exports = router;