# File Management System

## Overview

The File Management system provides comprehensive file handling capabilities including upload, download, sharing, and management of files with proper access control and security measures.

## Features

### Core Functionality

- **File Upload**: Support for multiple file types with size limits and validation
- **File Download**: Secure file streaming with access control
- **File Sharing**: Granular permission-based sharing with other users
- **File Management**: CRUD operations with soft delete support
- **Access Control**: Role-based and ownership-based permissions
- **File Categorization**: Automatic and manual file type classification

### Advanced Features

- **Pagination & Filtering**: Efficient file browsing with search capabilities
- **File Metadata**: Comprehensive file information tracking
- **Download Analytics**: Track download counts and patterns
- **Soft Delete**: Recoverable file deletion
- **File Associations**: Link files to tasks, projects, teams, and departments
- **Tagging System**: Flexible file organization with tags

## API Endpoints

### 1. Get User's Files

```
GET /api/files
```

**Description**: Retrieve user's files with pagination and filtering
**Authentication**: Required (JWT)
**Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `category` (optional): Filter by file category
- `tags` (optional): Comma-separated tags to filter by
- `isPublic` (optional): Filter by public status
- `sortBy` (optional): Sort field (default: createdAt)
- `sortOrder` (optional): Sort order - asc/desc (default: desc)

**Response**:

```json
{
  "message": "Files retrieved successfully",
  "files": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### 2. Upload File

```
POST /api/files/upload
```

**Description**: Upload a new file
**Authentication**: Required (JWT)
**Content-Type**: `multipart/form-data`
**Body Parameters**:

- `file` (required): File to upload
- `description` (optional): File description
- `tags` (optional): Comma-separated tags
- `category` (optional): File category
- `isPublic` (optional): Whether file is public
- `task` (optional): Associated task ID
- `project` (optional): Associated project ID
- `team` (optional): Associated team ID
- `department` (optional): Associated department ID

**Response**:

```json
{
  "message": "File uploaded successfully",
  "file": {
    "filename": "file-1234567890.pdf",
    "originalName": "document.pdf",
    "url": "/uploads/files/file-1234567890.pdf",
    "fileType": "pdf",
    "fileSize": 1048576,
    "mimeType": "application/pdf",
    "uploadedBy": "user_id",
    "category": "document",
    "tags": ["documentation", "project"],
    "description": "Project documentation",
    "isPublic": false
  }
}
```

### 3. Get File by ID

```
GET /api/files/:id
```

**Description**: Retrieve specific file by ID
**Authentication**: Required (JWT)
**Parameters**:

- `id`: File ID

**Response**:

```json
{
  "message": "File retrieved successfully",
  "file": {
    "filename": "file-1234567890.pdf",
    "originalName": "document.pdf",
    "url": "/uploads/files/file-1234567890.pdf",
    "fileType": "pdf",
    "fileSize": 1048576,
    "mimeType": "application/pdf",
    "uploadedBy": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "employee"
    },
    "category": "document",
    "tags": ["documentation", "project"],
    "description": "Project documentation",
    "isPublic": false,
    "downloadCount": 5,
    "lastDownloaded": "2023-12-20T10:00:00Z",
    "createdAt": "2023-12-20T09:00:00Z"
  }
}
```

### 4. Download File

```
GET /api/files/download/:id
```

**Description**: Download file by ID
**Authentication**: Required (JWT)
**Parameters**:

- `id`: File ID

**Response**: File stream with appropriate headers
**Headers Set**:

- `Content-Type`: File MIME type
- `Content-Disposition`: Attachment filename
- `Content-Length`: File size

### 5. Delete File

```
DELETE /api/files/:id
```

**Description**: Delete file (soft delete)
**Authentication**: Required (JWT)
**Parameters**:

- `id`: File ID

**Permissions**: File owner, admin, or manager only

**Response**:

```json
{
  "message": "File deleted successfully",
  "fileId": "file_id"
}
```

### 6. Share File

```
POST /api/files/share
```

**Description**: Share file with another user
**Authentication**: Required (JWT)
**Body Parameters**:

- `fileId` (required): File ID to share
- `shareWith` (required): User ID to share with
- `permissions` (optional): Array of permissions ["view", "edit", "admin"]
- `expiryDate` (optional): Expiration date for sharing

**Permissions**: File owner, admin, or manager only

**Response**:

```json
{
  "message": "File shared successfully",
  "shareInfo": {
    "fileId": "file_id",
    "shareWith": "user_id",
    "permissions": ["view"],
    "expiryDate": null,
    "sharedBy": "owner_id",
    "sharedAt": "2023-12-20T10:00:00Z",
    "status": "active"
  }
}
```

## Data Models

### File Schema

```javascript
{
  filename: String,           // Unique filename on server
  originalName: String,       // Original filename from user
  url: String,               // File access URL
  fileType: String,          // File extension
  fileSize: Number,          // File size in bytes
  mimeType: String,          // MIME type
  uploadedBy: ObjectId,      // User who uploaded
  task: ObjectId,            // Associated task
  project: ObjectId,         // Associated project
  team: ObjectId,            // Associated team
  department: ObjectId,      // Associated department
  conversation: ObjectId,    // Associated conversation
  category: String,          // File category
  tags: [String],            // File tags
  description: String,       // File description
  isPublic: Boolean,         // Public accessibility
  isShared: Boolean,         // Sharing status
  sharedWith: [{             // Sharing information
    user: ObjectId,
    permission: String,      // view, edit, admin
    sharedAt: Date
  }],
  downloadCount: Number,     // Download counter
  lastDownloaded: Date,      // Last download timestamp
  isDeleted: Boolean,        // Soft delete flag
  deletedAt: Date,           // Deletion timestamp
  deletedBy: ObjectId,       // User who deleted
  createdAt: Date,           // Upload timestamp
  updatedAt: Date            // Last update timestamp
}
```

## File Categories

- **document**: PDFs, Word docs, Excel files, text files
- **image**: JPEG, PNG, GIF, etc.
- **video**: MP4, AVI, MOV, etc.
- **audio**: MP3, WAV, etc.
- **archive**: ZIP, RAR, etc.
- **other**: Unclassified files

## Supported File Types

- **Images**: jpeg, jpg, png, gif
- **Documents**: pdf, doc, docx, xls, xlsx, txt
- **Archives**: zip, rar
- **Media**: mp4, mp3, avi, mov

## File Size Limits

- **Maximum file size**: 50MB
- **Configurable**: Can be adjusted in multer configuration

## Security Features

### Authentication & Authorization

- **JWT Authentication**: All endpoints require valid JWT token
- **Role-based Access**: Admin and manager roles have extended permissions
- **Ownership Control**: Users can only access their own files by default

### Access Control

- **Public Files**: Accessible to all authenticated users
- **Private Files**: Only accessible to owner and explicitly shared users
- **Shared Files**: Accessible based on sharing permissions
- **Associated Files**: Accessible based on task/project/team membership

### File Validation

- **Type Validation**: Only supported file types allowed
- **Size Validation**: File size limits enforced
- **MIME Type Check**: Both extension and MIME type validation

## Error Handling

### Common Error Responses

- **400 Bad Request**: Invalid input, unsupported file type
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: File not found
- **500 Internal Server Error**: Server-side errors

### Error Response Format

```json
{
  "message": "Error description",
  "error": "Detailed error information"
}
```

## Usage Examples

### Upload a Document

```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("description", "Project documentation");
formData.append("tags", "documentation,project");
formData.append("category", "document");
formData.append("isPublic", "false");

fetch("/api/files/upload", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

### Download a File

```javascript
fetch(`/api/files/download/${fileId}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
  .then((response) => response.blob())
  .then((blob) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  });
```

### Share a File

```javascript
fetch("/api/files/share", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    fileId: "file_id",
    shareWith: "user_id",
    permissions: ["view"],
    expiryDate: null,
  }),
});
```

## File Storage

### Directory Structure

```
uploads/
├── files/           # General file uploads
│   ├── file-1234567890.pdf
│   ├── image-1234567890.jpg
│   └── ...
└── chat/            # Chat file uploads
    ├── chat-file-1234567890.pdf
    └── ...
```

### File Naming Convention

- **Format**: `{fieldname}-{timestamp}-{random}.{extension}`
- **Example**: `file-1703123456789-123456789.pdf`
- **Benefits**: Unique names, timestamp tracking, collision prevention

## Performance Considerations

### File Handling

- **Streaming**: Large files are streamed for efficient memory usage
- **Async Operations**: Non-blocking file operations
- **Error Recovery**: Automatic cleanup on failed uploads

### Database Optimization

- **Indexing**: Proper indexes on frequently queried fields
- **Pagination**: Efficient data retrieval with skip/limit
- **Population**: Selective field population to reduce data transfer

## Future Enhancements

### Planned Features

- **File Versioning**: Track file versions and changes
- **Bulk Operations**: Upload/download multiple files
- **File Compression**: Automatic compression for large files
- **Cloud Storage**: Integration with AWS S3, Google Cloud Storage
- **File Encryption**: End-to-end encryption for sensitive files
- **Advanced Search**: Full-text search within documents
- **File Preview**: Generate thumbnails and previews
- **Audit Trail**: Comprehensive file access logging

### Integration Possibilities

- **Document Management**: Integration with document management systems
- **Collaboration Tools**: Real-time collaborative editing
- **Workflow Integration**: File approval workflows
- **Backup Systems**: Automated backup and recovery

## Testing

### Test Scenarios

- **File Upload**: Various file types and sizes
- **Access Control**: Permission validation
- **File Sharing**: Sharing permissions and expiration
- **Error Handling**: Invalid inputs and edge cases
- **Performance**: Large file handling and concurrent uploads

### Test Files

- **Small Files**: < 1MB (text, small images)
- **Medium Files**: 1-10MB (documents, images)
- **Large Files**: 10-50MB (videos, archives)
- **Invalid Files**: Unsupported types, corrupted files

## Monitoring & Logging

### Key Metrics

- **Upload Success Rate**: Percentage of successful uploads
- **Download Patterns**: Most accessed files
- **Storage Usage**: Disk space utilization
- **Error Rates**: Upload/download failure rates

### Logging

- **Access Logs**: File access and download tracking
- **Error Logs**: Failed operations and validation errors
- **Security Logs**: Permission violations and access attempts

## Troubleshooting

### Common Issues

- **File Upload Failures**: Check file size, type, and permissions
- **Download Errors**: Verify file exists and user has access
- **Permission Denied**: Check user role and file ownership
- **Storage Issues**: Monitor disk space and file system permissions

### Debug Information

- **Request Headers**: Authentication and content type
- **File Metadata**: Size, type, and validation results
- **User Context**: Role, permissions, and ownership
- **System Status**: Storage availability and service health



