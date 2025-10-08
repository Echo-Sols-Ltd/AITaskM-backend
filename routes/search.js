const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { SearchHistory, SearchIndex, SavedSearch } = require('../models/Search');
const Task = require('../models/Task');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');

// General search across all entities
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { query, type, limit = 20, filters } = req.query;
    const userId = req.user.id;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const searchQuery = { $regex: query, $options: 'i' };
    const results = [];
    let totalResults = 0;

    // Search tasks
    if (!type || type === 'all' || type === 'task') {
      const taskQuery = {
        $or: [
          { title: searchQuery },
          { description: searchQuery },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      };
      
      if (filters?.status) taskQuery.status = filters.status;
      if (filters?.priority) taskQuery.priority = filters.priority;
      if (filters?.assignedTo) taskQuery.assignedTo = filters.assignedTo;

      const tasks = await Task.find(taskQuery)
        .populate('assignedTo', 'name email')
        .populate('team', 'name')
        .limit(parseInt(limit))
        .lean();

      tasks.forEach(task => {
        results.push({
          type: 'task',
          id: task._id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignedTo: task.assignedTo?.name || 'Unassigned',
          team: task.team?.name,
          relevance: calculateRelevance(query, task.title, task.description, task.tags),
          snippet: generateSnippet(task.description, query)
        });
      });
      totalResults += tasks.length;
    }

    // Search users
    if (!type || type === 'all' || type === 'user') {
      const userQuery = {
        $or: [
          { name: searchQuery },
          { email: searchQuery },
          { skills: { $in: [new RegExp(query, 'i')] } }
        ]
      };
      
      if (filters?.department) userQuery.department = filters.department;
      if (filters?.role) userQuery.role = filters.role;
      if (filters?.location) userQuery.location = filters.location;

      const users = await User.find(userQuery)
        .populate('department', 'name')
        .populate('role', 'name')
        .limit(parseInt(limit))
        .lean();

      users.forEach(user => {
        results.push({
          type: 'user',
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role?.name || 'No Role',
          department: user.department?.name || 'No Department',
          skills: user.skills || [],
          location: user.location,
          relevance: calculateRelevance(query, user.name, user.email, user.skills),
          snippet: generateSnippet(user.skills?.join(', ') || '', query)
        });
      });
      totalResults += users.length;
    }

    // Search messages
    if (!type || type === 'all' || type === 'message') {
      const messageQuery = {
        $or: [
          { content: searchQuery },
          { 'attachments.name': searchQuery }
        ]
      };
      
      if (filters?.conversationId) messageQuery.conversationId = filters.conversationId;
      if (filters?.sender) messageQuery.sender = filters.sender;
      if (filters?.dateRange) {
        const dates = filters.dateRange.split('to');
        if (dates.length === 2) {
          messageQuery.createdAt = {
            $gte: new Date(dates[0]),
            $lte: new Date(dates[1])
          };
        }
      }

      const messages = await ChatMessage.find(messageQuery)
        .populate('sender', 'name email')
        .populate('conversationId', 'name')
        .limit(parseInt(limit))
        .lean();

      messages.forEach(message => {
        results.push({
          type: 'message',
          id: message._id,
          content: message.content,
          sender: message.sender?.name || 'Unknown',
          conversationId: message.conversationId?._id,
          conversationName: message.conversationId?.name,
          timestamp: message.createdAt,
          type: message.type || 'text',
          relevance: calculateRelevance(query, message.content),
          snippet: generateSnippet(message.content, query)
        });
      });
      totalResults += messages.length;
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    // Save search history
    await SearchHistory.create({
      user: userId,
      query,
      filters: filters || {},
      results: results.slice(0, 10).map(r => ({
        type: r.type,
        id: r.id,
        relevance: r.relevance,
        snippet: r.snippet
      })),
      resultCount: totalResults,
      searchTime: Date.now()
    });
    
    res.json({
      message: 'Search completed successfully',
      results: {
        query,
        type: type || 'all',
        totalResults,
        results: results.slice(0, parseInt(limit)),
        filters: filters || {},
        searchTime: `${Date.now()}ms`
      }
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

// Search tasks specifically
router.get('/tasks', authenticateJWT, async (req, res) => {
  try {
    const { query, status, priority, assignedTo, deadline, tags, limit = 20, page = 1 } = req.query;
    const userId = req.user.id;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const searchQuery = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    // Add filters
    if (status && status !== 'all') searchQuery.status = status;
    if (priority && priority !== 'all') searchQuery.priority = priority;
    if (assignedTo && assignedTo !== 'all') searchQuery.assignedTo = assignedTo;
    if (deadline && deadline !== 'all') {
      const today = new Date();
      if (deadline === 'overdue') {
        searchQuery.deadline = { $lt: today };
      } else if (deadline === 'today') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        searchQuery.deadline = { $gte: today, $lt: tomorrow };
      } else if (deadline === 'week') {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        searchQuery.deadline = { $gte: today, $lte: nextWeek };
      }
    }
    if (tags && tags.length > 0) {
      searchQuery.tags = { $in: tags.map(tag => new RegExp(tag, 'i')) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [tasks, total] = await Promise.all([
      Task.find(searchQuery)
        .populate('assignedTo', 'name email')
        .populate('team', 'name')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Task.countDocuments(searchQuery)
    ]);

    const results = tasks.map(task => ({
      id: task._id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo?.name || 'Unassigned',
      team: task.team?.name,
      deadline: task.deadline,
      tags: task.tags || [],
      createdBy: task.createdBy?.name,
      createdAt: task.createdAt,
      relevance: calculateRelevance(query, task.title, task.description, task.tags)
    }));

    // Save search history
    await SearchHistory.create({
      user: userId,
      query,
      filters: { status, priority, assignedTo, deadline, tags },
      results: results.slice(0, 10).map(r => ({
        type: 'task',
        id: r.id,
        relevance: r.relevance,
        snippet: generateSnippet(r.description, query)
      })),
      resultCount: total,
      searchTime: Date.now()
    });
    
    res.json({
      message: 'Task search completed successfully',
      results: {
        query,
        filters: { status, priority, assignedTo, deadline, tags },
        totalResults: total,
        results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        searchTime: `${Date.now()}ms`
      }
    });
  } catch (err) {
    console.error('Task search error:', err);
    res.status(500).json({ message: 'Task search failed', error: err.message });
  }
});

// Search users specifically
router.get('/users', authenticateJWT, async (req, res) => {
  try {
    const { query, department, role, skills, location, limit = 20, page = 1 } = req.query;
    const userId = req.user.id;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { skills: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    // Add filters
    if (department && department !== 'all') searchQuery.department = department;
    if (role && role !== 'all') searchQuery.role = role;
    if (location && location !== 'all') searchQuery.location = location;
    if (skills && skills.length > 0) {
      searchQuery.skills = { $in: skills.map(skill => new RegExp(skill, 'i')) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(searchQuery)
        .populate('department', 'name')
        .populate('role', 'name')
        .populate('team', 'name')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(searchQuery)
    ]);

    const results = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role?.name || 'No Role',
      department: user.department?.name || 'No Department',
      team: user.team?.name,
      skills: user.skills || [],
      location: user.location,
      avatar: user.avatar,
      isActive: user.isActive,
      relevance: calculateRelevance(query, user.name, user.email, user.skills)
    }));

    // Save search history
    await SearchHistory.create({
      user: userId,
      query,
      filters: { department, role, skills, location },
      results: results.slice(0, 10).map(r => ({
        type: 'user',
        id: r.id,
        relevance: r.relevance,
        snippet: generateSnippet(r.skills?.join(', ') || '', query)
      })),
      resultCount: total,
      searchTime: Date.now()
    });
    
    res.json({
      message: 'User search completed successfully',
      results: {
        query,
        filters: { department, role, skills, location },
        totalResults: total,
        results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        searchTime: `${Date.now()}ms`
      }
    });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ message: 'User search failed', error: err.message });
  }
});

// Search messages specifically
router.get('/messages', authenticateJWT, async (req, res) => {
  try {
    const { query, conversationId, sender, dateRange, type, limit = 20, page = 1 } = req.query;
    const userId = req.user.id;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Search query must be at least 2 characters long' 
      });
    }

    const searchQuery = {
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { 'attachments.name': { $regex: query, $options: 'i' } }
      ]
    };

    // Add filters
    if (conversationId && conversationId !== 'all') searchQuery.conversationId = conversationId;
    if (sender && sender !== 'all') searchQuery.sender = sender;
    if (type && type !== 'all') searchQuery.type = type;
    if (dateRange && dateRange !== 'all') {
      const dates = dateRange.split('to');
      if (dates.length === 2) {
        searchQuery.createdAt = {
          $gte: new Date(dates[0]),
          $lte: new Date(dates[1])
        };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [messages, total] = await Promise.all([
      ChatMessage.find(searchQuery)
        .populate('sender', 'name email avatar')
        .populate('conversationId', 'name type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ChatMessage.countDocuments(searchQuery)
    ]);

    const results = messages.map(message => ({
      id: message._id,
      content: message.content,
      sender: message.sender?.name || 'Unknown',
      senderId: message.sender?._id,
      conversationId: message.conversationId?._id,
      conversationName: message.conversationId?.name,
      conversationType: message.conversationId?.type,
      timestamp: message.createdAt,
      type: message.type || 'text',
      attachments: message.attachments || [],
      relevance: calculateRelevance(query, message.content),
      snippet: generateSnippet(message.content, query)
    }));

    // Save search history
    await SearchHistory.create({
      user: userId,
      query,
      filters: { conversationId, sender, dateRange, type },
      results: results.slice(0, 10).map(r => ({
        type: 'message',
        id: r.id,
        relevance: r.relevance,
        snippet: r.snippet
      })),
      resultCount: total,
      searchTime: Date.now()
    });
    
    res.json({
      message: 'Message search completed successfully',
      results: {
        query,
        filters: { conversationId, sender, dateRange, type },
        totalResults: total,
        results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        },
        searchTime: `${Date.now()}ms`
      }
    });
  } catch (err) {
    console.error('Message search error:', err);
    res.status(500).json({ message: 'Message search failed', error: err.message });
  }
});

// Helper function to calculate relevance score
function calculateRelevance(query, ...texts) {
  const queryLower = query.toLowerCase();
  let score = 0;
  
  texts.forEach(text => {
    if (!text) return;
    
    const textLower = Array.isArray(text) ? text.join(' ').toLowerCase() : text.toLowerCase();
    
    // Exact match gets highest score
    if (textLower.includes(queryLower)) {
      score += 10;
    }
    
    // Partial word match
    const words = queryLower.split(' ');
    words.forEach(word => {
      if (word.length > 2 && textLower.includes(word)) {
        score += 5;
      }
    });
    
    // Length bonus for longer content
    if (textLower.length > 100) score += 2;
  });
  
  return Math.min(score, 100) / 100; // Normalize to 0-1
}

// Helper function to generate search snippets
function generateSnippet(text, query, maxLength = 150) {
  if (!text) return '';
  
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const index = textLower.indexOf(queryLower);
  
  if (index === -1) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
  
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + query.length + 100);
  
  let snippet = text.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  
  return snippet;
}

module.exports = router; 