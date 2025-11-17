# Messaging System Documentation

## Overview

The AI Task Manager now includes a comprehensive messaging system with conversation management, real-time chat, file sharing, and message reactions.

## Features

### 1. Conversation Management

- **Create conversations**: Direct, group, team, and project-based chats
- **Manage participants**: Add/remove users, assign admins
- **Conversation settings**: Control file uploads, reactions, editing, and deletion permissions

### 2. Message Handling

- **Send messages**: Text messages with support for replies and mentions
- **Edit messages**: Users can edit their own messages (if allowed)
- **Delete messages**: Soft delete with admin/sender permissions
- **Message reactions**: Emoji reactions with toggle functionality

### 3. File Sharing

- **Upload files**: Support for various file types (images, documents, archives)
- **File management**: View, download, and delete shared files
- **File size limits**: 10MB maximum file size
- **Supported formats**: jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, zip, rar

### 4. Task-Based Chat (Legacy Support)

- **Backward compatibility**: Existing task-based chat functionality preserved
- **Automatic conversation creation**: Task chats are automatically created when needed

## API Endpoints

### Conversation Management

- `GET /api/chat/conversations` - Get user's conversations
- `GET /api/chat/conversations/:id` - Get conversation details
- `POST /api/chat/conversations` - Create new conversation
- `DELETE /api/chat/conversations/:id` - Delete conversation

### Message Management

- `GET /api/chat/messages/:convId` - Get conversation messages
- `POST /api/chat/messages` - Send message
- `PUT /api/chat/messages/:id` - Edit message
- `DELETE /api/chat/messages/:id` - Delete message
- `POST /api/chat/messages/:id/react` - React to message

### File Handling

- `POST /api/chat/upload` - Upload file to chat
- `GET /api/chat/files/:convId` - Get chat files
- `DELETE /api/chat/files/:id` - Delete chat file

### Legacy Task Chat

- `GET /api/chat/:taskId` - Get task messages
- `POST /api/chat/:taskId` - Send task message

## Models

### Conversation Schema

```javascript
{
  name: String,
  type: { enum: ['direct', 'group', 'team', 'project'] },
  participants: [User IDs],
  admins: [User IDs],
  lastMessage: Message ID,
  lastActivity: Date,
  isActive: Boolean,
  settings: {
    allowFileUploads: Boolean,
    allowReactions: Boolean,
    allowEditing: Boolean,
    allowDeletion: Boolean
  },
  metadata: {
    project: Project ID,
    team: Team ID,
    task: Task ID
  }
}
```

### ChatMessage Schema

```javascript
{
  conversation: Conversation ID,
  sender: User ID,
  message: String,
  messageType: { enum: ['text', 'file', 'image', 'system'] },
  attachments: [{
    url: String,
    filename: String,
    fileType: String,
    fileSize: Number
  }],
  reactions: [{
    user: User ID,
    emoji: String,
    createdAt: Date
  }],
  isEdited: Boolean,
  editedAt: Date,
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: User ID,
  replyTo: Message ID,
  mentions: [User IDs],
  readBy: [{
    user: User ID,
    readAt: Date
  }]
}
```

## Security Features

### Authentication & Authorization

- JWT token required for all endpoints
- User must be participant to access conversation
- Only admins/senders can delete conversations/messages
- File upload permissions controlled by conversation settings

### File Upload Security

- File type validation
- File size limits (10MB)
- Secure file naming with unique suffixes
- File storage in dedicated uploads directory

## Usage Examples

### Creating a Team Conversation

```javascript
POST /api/chat/conversations
{
  "name": "Development Team Chat",
  "type": "team",
  "participants": ["user1", "user2", "user3"],
  "teamId": "team123"
}
```

### Sending a Message with Reply

```javascript
POST /api/chat/messages
{
  "conversationId": "conv123",
  "message": "Great idea! Let's implement this.",
  "replyTo": "msg456",
  "mentions": ["user789"]
}
```

### Reacting to a Message

```javascript
POST /api/chat/messages/msg123/react
{
  "emoji": "👍"
}
```

### Uploading a File

```javascript
POST / api / chat / upload;
// Form data with file, conversationId, and optional description
```

## File Storage

Files are stored in the `uploads/chat/` directory with the following structure:

- Unique filenames to prevent conflicts
- Original file extensions preserved
- File metadata stored in database
- Soft delete support for file cleanup

## Error Handling

The system includes comprehensive error handling for:

- Invalid file types/sizes
- Permission violations
- Missing conversations/messages
- Database connection issues
- File upload failures

## Performance Considerations

- Pagination for message retrieval
- Efficient database queries with proper indexing
- File size limits to prevent storage abuse
- Soft deletes to maintain data integrity
- Optimized conversation listing with last activity sorting




