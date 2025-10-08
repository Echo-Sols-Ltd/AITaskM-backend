const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const File = require('../models/File');

// Ensure uploads directory exists
const uploadsDir = 'uploads/files';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar|mp4|mp3|avi|mov/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only supported file types are allowed'));
    }
  }
});

// Upload file
router.post('/upload', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { description, tags, category, isPublic, task, project, team, department } = req.body;
    
    // Determine file category based on mime type
    let fileCategory = category || 'other';
    if (!category) {
      if (req.file.mimetype.startsWith('image/')) fileCategory = 'image';
      else if (req.file.mimetype.startsWith('video/')) fileCategory = 'video';
      else if (req.file.mimetype.startsWith('audio/')) fileCategory = 'audio';
      else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document')) fileCategory = 'document';
      else if (req.file.mimetype.includes('zip') || req.file.mimetype.includes('rar')) fileCategory = 'archive';
    }

    // Create file record in database
    const file = new File({
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/files/${req.file.filename}`,
      fileType: path.extname(req.file.originalname).substring(1),
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user._id,
      task: task || null,
      project: project || null,
      team: team || null,
      department: department || null,
      category: fileCategory,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      description: description || '',
      isPublic: isPublic === 'true' || false
    });

    await file.save();

    // Populate user info
    await file.populate('uploadedBy', 'name email role avatar');
    
    res.status(201).json({
      message: 'File uploaded successfully',
      file: file
    });
  } catch (err) {
    // Clean up uploaded file if database save fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Failed to upload file', error: err.message });
  }
});

// Get file by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    const file = await File.findById(id)
      .populate('uploadedBy', 'name email role avatar')
      .populate('task', 'title')
      .populate('project', 'name')
      .populate('team', 'name')
      .populate('department', 'name');

    if (!file || file.isDeleted) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check access permissions
    if (!file.isPublic && file.uploadedBy._id.toString() !== req.user._id.toString()) {
      // Check if user has access through shared permissions
      const hasSharedAccess = file.sharedWith.some(share => 
        share.user.toString() === req.user._id.toString()
      );
      
      if (!hasSharedAccess) {
        // Check if user has access through task/project/team
        if (file.task && req.user.role !== 'admin' && req.user.role !== 'manager') {
          // Additional task access check would go here
          return res.status(403).json({ message: 'Access denied' });
        }
        if (file.project && req.user.role !== 'admin' && req.user.role !== 'manager') {
          // Additional project access check would go here
          return res.status(403).json({ message: 'Access denied' });
        }
        if (file.team && req.user.role !== 'admin' && req.user.role !== 'manager') {
          // Additional team access check would go here
          return res.status(403).json({ message: 'Access denied' });
        }
      }
    }
    
    res.json({
      message: 'File retrieved successfully',
      file: file
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch file', error: err.message });
  }
});

// Delete file
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    const file = await File.findById(id);
    if (!file || file.isDeleted) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check permissions - only owner, admin, or manager can delete
    if (file.uploadedBy.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete
    file.isDeleted = true;
    file.deletedAt = new Date();
    file.deletedBy = req.user._id;
    await file.save();

    // Optionally remove physical file (uncomment if you want to delete files immediately)
    // if (fs.existsSync(path.join(__dirname, '..', file.url))) {
    //   fs.unlinkSync(path.join(__dirname, '..', file.url));
    // }
    
    res.json({
      message: 'File deleted successfully',
      fileId: id
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete file', error: err.message });
  }
});

// Download file
router.get('/download/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    const file = await File.findById(id);
    if (!file || file.isDeleted) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check access permissions (same logic as GET /:id)
    if (!file.isPublic && file.uploadedBy.toString() !== req.user._id.toString()) {
      const hasSharedAccess = file.sharedWith.some(share => 
        share.user.toString() === req.user._id.toString()
      );
      
      if (!hasSharedAccess) {
        if (file.task && req.user.role !== 'admin' && req.user.role !== 'manager') {
          return res.status(403).json({ message: 'Access denied' });
        }
        if (file.project && req.user.role !== 'admin' && req.user.role !== 'manager') {
          return res.status(403).json({ message: 'Access denied' });
        }
        if (file.team && req.user.role !== 'admin' && req.user.role !== 'manager') {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
    }

    const filePath = path.join(__dirname, '..', file.url);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    // Update download count and last downloaded
    file.downloadCount += 1;
    file.lastDownloaded = new Date();
    await file.save();

    // Set headers for file download
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Length', file.fileSize);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (err) {
    res.status(500).json({ message: 'Failed to download file', error: err.message });
  }
});

// Share file
router.post('/share', authenticateJWT, async (req, res) => {
  try {
    const { fileId, shareWith, permissions, expiryDate } = req.body;
    
    if (!fileId || !shareWith) {
      return res.status(400).json({ message: 'File ID and shareWith are required' });
    }

    const file = await File.findById(fileId);
    if (!file || file.isDeleted) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user owns the file or is admin/manager
    if (file.uploadedBy.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate permissions
    const validPermissions = ['view', 'edit', 'admin'];
    const userPermissions = permissions || ['view'];
    if (!userPermissions.every(p => validPermissions.includes(p))) {
      return res.status(400).json({ message: 'Invalid permissions specified' });
    }

    // Add sharing information
    const shareInfo = {
      user: shareWith,
      permission: userPermissions[0], // For simplicity, using first permission
      sharedAt: new Date()
    };

    // Check if already shared with this user
    const existingShareIndex = file.sharedWith.findIndex(share => 
      share.user.toString() === shareWith
    );

    if (existingShareIndex !== -1) {
      // Update existing share
      file.sharedWith[existingShareIndex] = shareInfo;
    } else {
      // Add new share
      file.sharedWith.push(shareInfo);
    }

    file.isShared = true;
    await file.save();

    res.json({
      message: 'File shared successfully',
      shareInfo: {
      fileId,
      shareWith,
        permissions: userPermissions,
      expiryDate: expiryDate || null,
      sharedBy: req.user._id,
        sharedAt: shareInfo.sharedAt,
      status: 'active'
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to share file', error: err.message });
  }
});

// Get user's files with pagination and filtering
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, tags, isPublic, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isDeleted: false };
    
    // Show user's own files and public files
    filter.$or = [
      { uploadedBy: req.user._id },
      { isPublic: true }
    ];

    // Add additional filters
    if (category) filter.category = category;
    if (isPublic !== undefined) filter.isPublic = isPublic === 'true';
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const files = await File.find(filter)
      .populate('uploadedBy', 'name email role avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await File.countDocuments(filter);

    res.json({
      message: 'Files retrieved successfully',
      files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch files', error: err.message });
  }
});

module.exports = router; 