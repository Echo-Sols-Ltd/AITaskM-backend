# Organization Management System

## Overview

The Organization Management System provides comprehensive management of departments, roles, and user assignments within the AI Task Manager platform. It enables hierarchical organizational structures with role-based access control and flexible permission management.

## Features

### Department Management

- **Hierarchical Structure**: Support for parent-child department relationships
- **Department Settings**: Configurable permissions for team creation, user management, and KPI management
- **Department Head Assignment**: Designate department leaders
- **Visual Customization**: Color and icon support for departments
- **Member Management**: View and manage department members with filtering and pagination

### Role Management

- **Flexible Role Creation**: Create custom roles with specific permissions
- **Permission System**: Granular permission control with resource and action-based access
- **Hierarchy Levels**: Role-based hierarchy for organizational structure
- **Department/Team Association**: Roles can be associated with specific departments or teams
- **System Role Protection**: Prevent modification of critical system roles

### User Role Assignment

- **Multi-Role Support**: Assign multiple roles to users
- **Department Assignment**: Automatically assign users to departments
- **Role Validation**: Ensure assigned roles exist and are valid
- **Permission Inheritance**: Users inherit permissions from their assigned roles

## API Endpoints

### Departments

#### Get All Departments

```
GET /api/organization/departments
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name or description
- `isActive` (optional): Filter by active status

**Response:**

```json
{
  "message": "Departments retrieved successfully",
  "departments": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

#### Get Department by ID

```
GET /api/organization/departments/:id
```

**Response:**

```json
{
  "message": "Department retrieved successfully",
  "department": {...}
}
```

#### Create Department

```
POST /api/organization/departments
```

**Required Permissions:** `employer`, `admin`

**Request Body:**

```json
{
  "name": "Engineering",
  "description": "Software development team",
  "code": "ENG",
  "head": "user_id_here",
  "parentDepartment": "parent_dept_id",
  "settings": {
    "allowTeamCreation": true,
    "allowUserManagement": true,
    "allowKPIManagement": true
  },
  "color": "#3B82F6",
  "icon": "code"
}
```

#### Update Department

```
PUT /api/organization/departments/:id
```

**Required Permissions:** `employer`, `admin`

#### Delete Department

```
DELETE /api/organization/departments/:id
```

**Required Permissions:** `employer`

**Note:** Cannot delete departments with active users or teams.

#### Get Department Members

```
GET /api/organization/departments/:id/members
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `role` (optional): Filter by user role
- `search` (optional): Search by name or email

### Roles

#### Get All Roles

```
GET /api/organization/roles
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name or description
- `department` (optional): Filter by department
- `isActive` (optional): Filter by active status

#### Get Role by ID

```
GET /api/organization/roles/:id
```

#### Create Role

```
POST /api/organization/roles
```

**Required Permissions:** `employer`, `admin`

**Request Body:**

```json
{
  "name": "Senior Developer",
  "description": "Experienced software developer",
  "permissions": ["permission_id_1", "permission_id_2"],
  "department": "dept_id_here",
  "team": "team_id_here",
  "level": 2,
  "color": "#10B981",
  "icon": "developer"
}
```

#### Update Role

```
PUT /api/organization/roles/:id
```

**Required Permissions:** `employer`, `admin`

**Note:** Cannot modify system roles.

#### Delete Role

```
DELETE /api/organization/roles/:id
```

**Required Permissions:** `employer`

**Note:** Cannot delete system roles or roles assigned to users.

### User Role Assignment

#### Assign Roles to User

```
POST /api/organization/users/:id/roles
```

**Required Permissions:** `employer`, `admin`

**Request Body:**

```json
{
  "roleIds": ["role_id_1", "role_id_2"],
  "department": "dept_id_here"
}
```

## Data Models

### Department Schema

```javascript
{
  name: { type: String, required: true, unique: true },
  description: String,
  code: { type: String, unique: true },
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parentDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  settings: {
    allowTeamCreation: { type: Boolean, default: true },
    allowUserManagement: { type: Boolean, default: true },
    allowKPIManagement: { type: Boolean, default: true }
  },
  color: String,
  icon: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### Role Schema

```javascript
{
  name: { type: String, required: true, unique: true },
  description: String,
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  level: { type: Number, default: 1 },
  color: String,
  icon: String,
  isActive: { type: Boolean, default: true },
  isSystem: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### Permission Schema

```javascript
{
  name: { type: String, required: true },
  description: String,
  resource: { type: String, required: true },
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'manage'],
    required: true
  },
  scope: {
    type: String,
    enum: ['own', 'department', 'team', 'global'],
    default: 'own'
  }
}
```

## Security Features

### Authentication

- All endpoints require valid JWT authentication
- User context is available via `req.user`

### Authorization

- **Role-based Access Control (RBAC)**: Access controlled by user roles
- **Permission-based Access**: Granular permissions for specific resources
- **Hierarchical Permissions**: Department and team-based access control

### Permission Levels

- **employer**: Full access to create, update, and delete departments/roles
- **admin**: Full access to create, update, and delete departments/roles
- **manager**: Read access to departments and roles
- **employee**: Limited read access based on department membership

### Data Protection

- **Input Validation**: All inputs are validated and sanitized
- **SQL Injection Prevention**: Uses Mongoose ODM with parameterized queries
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: JWT-based authentication prevents CSRF attacks

## Usage Examples

### Creating a Department Structure

```javascript
// 1. Create parent department
const parentDept = await fetch("/api/organization/departments", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    name: "Technology",
    description: "Technology division",
    code: "TECH",
  }),
});

// 2. Create child department
const childDept = await fetch("/api/organization/departments", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    name: "Engineering",
    description: "Software engineering team",
    code: "ENG",
    parentDepartment: parentDept.id,
  }),
});
```

### Creating and Assigning Roles

```javascript
// 1. Create role
const role = await fetch("/api/organization/roles", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    name: "Senior Developer",
    description: "Experienced developer role",
    department: childDept.id,
    level: 2,
  }),
});

// 2. Assign role to user
await fetch(`/api/organization/users/${userId}/roles`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    roleIds: [role.id],
    department: childDept.id,
  }),
});
```

### Managing Department Members

```javascript
// Get department members with pagination
const members = await fetch(
  "/api/organization/departments/ENG/members?page=1&limit=10",
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);

// Search members
const searchResults = await fetch(
  "/api/organization/departments/ENG/members?search=john",
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);
```

## Error Handling

### Common Error Responses

- **400 Bad Request**: Validation errors, duplicate names/codes
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Department or role not found
- **500 Internal Server Error**: Server-side errors

### Error Response Format

```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Validation Errors

```json
{
  "message": "Validation error",
  "errors": [
    {
      "field": "name",
      "message": "Department name is required"
    }
  ]
}
```

## Performance Considerations

### Database Optimization

- **Indexing**: Proper indexes on frequently queried fields
- **Pagination**: All list endpoints support pagination
- **Population**: Efficient population of related entities
- **Query Optimization**: Optimized MongoDB queries

### Caching Strategy

- **Department Cache**: Cache frequently accessed department data
- **Role Cache**: Cache role permissions for quick access
- **User Cache**: Cache user role assignments

### Response Optimization

- **Selective Fields**: Return only necessary user fields for member lists
- **Efficient Population**: Limit populated fields to essential data
- **Pagination**: Prevent large dataset transfers

## Future Enhancements

### Planned Features

- **Role Templates**: Predefined role templates for common positions
- **Permission Groups**: Group permissions for easier management
- **Audit Logging**: Track all organizational changes
- **Bulk Operations**: Bulk role assignments and department updates
- **Advanced Hierarchy**: Support for matrix organizations

### Integration Features

- **SSO Integration**: Single sign-on with external identity providers
- **LDAP/Active Directory**: Integration with enterprise directories
- **API Rate Limiting**: Prevent abuse and ensure fair usage
- **Webhook Support**: Notify external systems of changes

### Analytics and Reporting

- **Organization Charts**: Visual representation of hierarchy
- **Role Distribution**: Analytics on role assignments
- **Permission Analysis**: Audit of permission usage
- **Change Tracking**: History of organizational changes

## Testing

### Unit Tests

- **Model Validation**: Test schema validation rules
- **Route Logic**: Test endpoint business logic
- **Permission Checks**: Test authorization middleware
- **Error Handling**: Test error scenarios

### Integration Tests

- **API Endpoints**: Test complete request/response cycles
- **Database Operations**: Test CRUD operations
- **Authentication Flow**: Test JWT validation
- **Permission Flow**: Test role-based access control

### Test Data

```javascript
// Sample test department
const testDepartment = {
  name: "Test Department",
  description: "Department for testing",
  code: "TEST",
  settings: {
    allowTeamCreation: true,
    allowUserManagement: true,
    allowKPIManagement: false,
  },
};

// Sample test role
const testRole = {
  name: "Test Role",
  description: "Role for testing",
  level: 1,
  permissions: [],
};
```

## Monitoring and Logging

### Logging

- **Request Logging**: Log all API requests with user context
- **Error Logging**: Detailed error logging with stack traces
- **Audit Logging**: Log all organizational changes
- **Performance Logging**: Log response times and database queries

### Metrics

- **API Usage**: Track endpoint usage patterns
- **Error Rates**: Monitor error frequencies
- **Response Times**: Track performance metrics
- **Database Performance**: Monitor query performance

### Health Checks

- **Database Connectivity**: Verify database connections
- **Model Validation**: Test schema validation
- **Permission System**: Verify permission checks
- **Role Assignment**: Test role assignment logic

## Troubleshooting

### Common Issues

#### Department Creation Fails

- **Check permissions**: Ensure user has `employer` or `admin` role
- **Validate input**: Check required fields and data types
- **Check duplicates**: Ensure department name/code is unique

#### Role Assignment Issues

- **Verify role exists**: Check if role ID is valid
- **Check permissions**: Ensure user can assign roles
- **Validate user**: Check if user ID is valid

#### Permission Denied Errors

- **Check user role**: Verify user has required permissions
- **Check department**: Ensure user has access to department
- **Verify JWT**: Check if token is valid and not expired

### Debug Mode

Enable debug logging for detailed troubleshooting:

```javascript
// In development environment
process.env.DEBUG = "organization:*";
```

### Support

For technical support and questions:

- Check API documentation
- Review error logs
- Verify user permissions
- Test with minimal data
- Check database connectivity

## Conclusion

The Organization Management System provides a robust foundation for managing organizational structures, roles, and permissions within the AI Task Manager platform. With comprehensive API endpoints, flexible data models, and strong security features, it enables efficient management of complex organizational hierarchies while maintaining data integrity and access control.

The system is designed to scale with organizational growth and can be extended with additional features as needed. Regular monitoring, testing, and updates ensure optimal performance and security.


