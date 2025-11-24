// MongoDB initialization script for production
// This script runs when the container is first created

db = db.getSiblingDB('ai-task-manager');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'name', 'password'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        name: {
          bsonType: 'string',
          minLength: 1
        },
        password: {
          bsonType: 'string'
        }
      }
    }
  }
});

db.createCollection('tasks');
db.createCollection('notifications');
db.createCollection('teams');
db.createCollection('projects');
db.createCollection('organizations');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ createdAt: -1 });

db.tasks.createIndex({ assignedTo: 1 });
db.tasks.createIndex({ assignedBy: 1 });
db.tasks.createIndex({ status: 1 });
db.tasks.createIndex({ priority: 1 });
db.tasks.createIndex({ deadline: 1 });
db.tasks.createIndex({ createdAt: -1 });
db.tasks.createIndex({ 
  title: 'text', 
  description: 'text' 
}, {
  weights: {
    title: 10,
    description: 5
  }
});

db.notifications.createIndex({ userId: 1, read: 1 });
db.notifications.createIndex({ createdAt: -1 });
db.notifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.teams.createIndex({ name: 1 });
db.teams.createIndex({ 'members.userId': 1 });

db.projects.createIndex({ name: 1 });
db.projects.createIndex({ status: 1 });
db.projects.createIndex({ teamId: 1 });

db.organizations.createIndex({ name: 1 }, { unique: true });

print('MongoDB initialization completed successfully');
print('Collections created with indexes');
