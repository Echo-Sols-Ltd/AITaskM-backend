# Search System Documentation

## Overview

The Search System provides comprehensive search functionality across all major entities in the AI Task Manager application. It enables users to find tasks, users, and messages quickly with advanced filtering, relevance scoring, and search history tracking.

## Features

### 🔍 **Multi-Entity Search**

- **General Search**: Search across tasks, users, and messages simultaneously
- **Entity-Specific Search**: Dedicated search endpoints for each entity type
- **Relevance Scoring**: Intelligent ranking based on query relevance
- **Search Snippets**: Context-aware text snippets highlighting matches

### 🎯 **Advanced Filtering**

- **Task Search**: Filter by status, priority, assignee, deadline, and tags
- **User Search**: Filter by department, role, skills, and location
- **Message Search**: Filter by conversation, sender, date range, and type

### 📊 **Search Analytics**

- **Search History**: Track all user searches for analytics
- **Performance Metrics**: Measure search response times
- **Usage Patterns**: Understand user search behavior

### 🔐 **Security & Access Control**

- **JWT Authentication**: All search endpoints require valid authentication
- **User Isolation**: Users can only search within their accessible data
- **Audit Trail**: Complete search history for compliance

## API Endpoints

### 1. General Search

```
GET /api/search
```

**Description**: Search across all entities (tasks, users, messages) with unified results.

**Parameters**:

- `query` (required): Search term (minimum 2 characters)
- `type`: Entity type filter (`all`, `task`, `user`, `message`)
- `limit`: Maximum results (default: 20, max: 100)
- `filters`: JSON string of additional filters

**Response**:

```json
{
  "message": "Search completed successfully",
  "results": {
    "query": "project alpha",
    "type": "all",
    "totalResults": 25,
    "results": [
      {
        "type": "task",
        "id": "task_id",
        "title": "Complete Project Alpha",
        "description": "Finish the main features...",
        "relevance": 0.95,
        "snippet": "...Project Alpha requirements and timeline..."
      }
    ],
    "filters": {},
    "searchTime": "45ms"
  }
}
```

### 2. Task Search

```
GET /api/search/tasks
```

**Description**: Dedicated search for tasks with advanced filtering and pagination.

**Parameters**:

- `query` (required): Search term (minimum 2 characters)
- `status`: Task status filter
- `priority`: Priority level filter
- `assignedTo`: Assigned user filter
- `deadline`: Deadline status filter (`overdue`, `today`, `week`)
- `tags`: Array of tag filters
- `limit`: Results per page (default: 20)
- `page`: Page number (default: 1)

**Response**:

```json
{
  "message": "Task search completed successfully",
  "results": {
    "query": "documentation",
    "filters": { "status": "pending", "priority": "medium" },
    "totalResults": 15,
    "results": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalPages": 1
    },
    "searchTime": "32ms"
  }
}
```

### 3. User Search

```
GET /api/search/users
```

**Description**: Search users by name, email, skills, and other attributes.

**Parameters**:

- `query` (required): Search term (minimum 2 characters)
- `department`: Department ID filter
- `role`: Role ID filter
- `skills`: Array of skill filters
- `location`: Location filter
- `limit`: Results per page (default: 20)
- `page`: Page number (default: 1)

### 4. Message Search

```
GET /api/search/messages
```

**Description**: Search chat messages across conversations.

**Parameters**:

- `query` (required): Search term (minimum 2 characters)
- `conversationId`: Specific conversation filter
- `sender`: Sender user filter
- `dateRange`: Date range filter (`startDate to endDate`)
- `type`: Message type filter
- `limit`: Results per page (default: 20)
- `page`: Page number (default: 1)

## Data Models

### SearchHistory

```javascript
{
  user: ObjectId,           // User who performed the search
  query: String,            // Search query
  filters: Mixed,           // Applied filters
  results: [{               // Top results for analytics
    type: String,           // Entity type
    id: ObjectId,           // Entity ID
    relevance: Number,      // Relevance score
    snippet: String         // Text snippet
  }],
  resultCount: Number,      // Total results found
  searchTime: Number,       // Search execution time
  timestamp: Date           // When search was performed
}
```

### SearchIndex

```javascript
{
  entityType: String,       // Type of indexed entity
  entityId: ObjectId,       // Entity reference
  content: String,          // Indexed content
  metadata: {               // Entity metadata
    title: String,
    description: String,
    tags: [String],
    category: String,
    priority: String,
    status: String
  },
  searchVector: [String],   // Full-text search terms
  lastIndexed: Date         // Last indexing timestamp
}
```

### SavedSearch

```javascript
{
  user: ObjectId,           // Owner of saved search
  name: String,             // Search name
  description: String,      // Search description
  query: String,            // Search query
  filters: Mixed,           // Search filters
  isPublic: Boolean,        // Public sharing flag
  sharedWith: [{            // Sharing permissions
    user: ObjectId,
    permission: String      // 'view' or 'edit'
  }],
  lastUsed: Date,           // Last usage timestamp
  useCount: Number          // Usage frequency
}
```

## Implementation Details

### Relevance Scoring Algorithm

The system uses a sophisticated relevance scoring algorithm:

1. **Exact Match**: 10 points for exact query matches
2. **Partial Match**: 5 points for partial word matches
3. **Content Length**: 2 points bonus for longer content
4. **Normalization**: Scores are normalized to 0-1 range

### Search Query Processing

```javascript
const searchQuery = {
  $or: [
    { title: { $regex: query, $options: "i" } },
    { description: { $regex: query, $options: "i" } },
    { tags: { $in: [new RegExp(query, "i")] } },
  ],
};
```

### Performance Optimizations

- **Indexed Fields**: Database indexes on searchable fields
- **Pagination**: Efficient result limiting and pagination
- **Lean Queries**: Mongoose lean() for faster queries
- **Population Limits**: Controlled population of related data

## Security Features

### Authentication

- All search endpoints require valid JWT authentication
- User context is extracted from JWT token

### Data Access Control

- Users can only search within their accessible data
- Role-based filtering for sensitive information
- Department and team isolation

### Input Validation

- Query length validation (minimum 2 characters)
- Parameter type and range validation
- SQL injection prevention through Mongoose

## Usage Examples

### Frontend Integration

```javascript
// Search tasks
const searchTasks = async (query, filters) => {
  const response = await fetch(
    `/api/search/tasks?query=${query}&status=${filters.status}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.json();
};

// General search
const generalSearch = async (query, type = "all") => {
  const response = await fetch(`/api/search?query=${query}&type=${type}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};
```

### Advanced Filtering

```javascript
// Search for high-priority overdue tasks
const overdueTasks = await searchTasks("documentation", {
  status: "pending",
  priority: "high",
  deadline: "overdue",
});

// Search for developers with specific skills
const developers = await searchUsers("JavaScript", {
  role: "developer",
  skills: ["React", "Node.js"],
});
```

## Error Handling

### Common Error Responses

```json
{
  "message": "Search failed",
  "error": "Query must be at least 2 characters long"
}
```

### HTTP Status Codes

- `200`: Search completed successfully
- `400`: Invalid search parameters
- `401`: Unauthorized (missing/invalid token)
- `500`: Internal server error

## Performance Considerations

### Search Optimization

- **Database Indexes**: Ensure proper indexing on searchable fields
- **Query Optimization**: Use efficient MongoDB queries
- **Result Limiting**: Implement pagination for large result sets
- **Caching**: Consider Redis caching for frequent searches

### Scalability

- **Search Indexing**: Implement background indexing for large datasets
- **Elasticsearch**: Consider full-text search engine for complex queries
- **Load Balancing**: Distribute search load across multiple instances

## Monitoring & Analytics

### Search Metrics

- **Response Times**: Track search performance
- **Query Patterns**: Analyze popular search terms
- **Result Quality**: Measure user satisfaction with results
- **Usage Statistics**: Monitor search feature adoption

### Search History Analysis

- **Popular Queries**: Identify frequently searched terms
- **User Behavior**: Understand search patterns
- **Performance Trends**: Track search system improvements

## Future Enhancements

### Planned Features

- **Fuzzy Search**: Handle typos and partial matches
- **Search Suggestions**: Auto-complete and query suggestions
- **Advanced Filters**: Date ranges, numeric ranges, boolean logic
- **Search Analytics Dashboard**: Visual search insights
- **Search Export**: Export search results to various formats

### Technical Improvements

- **Full-Text Search**: Implement MongoDB text search or Elasticsearch
- **Search Ranking**: Machine learning-based relevance scoring
- **Real-time Indexing**: Live updates to search indices
- **Multi-language Support**: Internationalization for search queries

## Troubleshooting

### Common Issues

1. **Slow Search Performance**: Check database indexes and query optimization
2. **No Results**: Verify search query length and filter parameters
3. **Authentication Errors**: Ensure valid JWT token in Authorization header
4. **Large Result Sets**: Implement proper pagination and result limiting

### Debug Information

- Check server logs for search query details
- Verify database connection and model references
- Test individual search endpoints for specific issues
- Monitor search performance metrics

## Conclusion

The Search System provides a robust, scalable foundation for finding information across the AI Task Manager application. With advanced filtering, relevance scoring, and comprehensive search history, users can efficiently locate tasks, users, and messages while maintaining security and performance standards.

For additional support or feature requests, please refer to the API documentation or contact the development team.
